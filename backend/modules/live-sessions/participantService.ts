import { db } from '../../infrastructure/firebase';
import { AppError } from '../../core/errors/AppError';
import { logger } from '../../core/logger';
import { ILiveParticipant, ILiveBlock, ILiveSessionEvent, ModerationStatus, PresenceStatus } from './types';

const LIVE_SESSIONS_COL = 'live_sessions';
const LIVE_BLOCKS_COL = 'live_blocks';
const LIVE_EVENTS_COL = 'live_session_events';
const PARTICIPANTS_SUBCOL = 'participants';
const ACTIVITY_FEED_SUBCOL = 'activity_feed';

export class ParticipantService {
  /**
   * Log an audit event for moderation/participant tracking
   */
  static async logEvent(
    sessionId: string,
    actorId: string,
    eventType: ILiveSessionEvent['eventType'],
    studentId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const now = new Date().toISOString();
      const docRef = db.collection(LIVE_EVENTS_COL).doc();
      const event: ILiveSessionEvent = {
        id: docRef.id,
        sessionId,
        actorId,
        studentId,
        eventType,
        metadata,
        timestamp: now,
      };
      await docRef.set(event);

      // Also write to activity_feed subcollection for easy UI subscription
      if (sessionId !== 'GLOBAL') {
        const feedRef = db.collection(LIVE_SESSIONS_COL).doc(sessionId).collection(ACTIVITY_FEED_SUBCOL).doc();
        await feedRef.set({
          ...event,
          id: feedRef.id
        });
      }
    } catch (err) {
      logger.error(`[ParticipantService] Failed to log event ${eventType}:`, err);
    }
  }

  /**
   * Increment session version to trigger real-time client config update
   */
  static async incrementSessionVersion(sessionId: string): Promise<void> {
    try {
      const sessionRef = db.collection(LIVE_SESSIONS_COL).doc(sessionId);
      await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(sessionRef);
        if (snap.exists) {
          const currentVersion = snap.data()?.sessionVersion || 1;
          transaction.update(sessionRef, { sessionVersion: currentVersion + 1, updatedAt: new Date().toISOString() });
        }
      });
    } catch (err) {
      logger.error(`[ParticipantService] Failed to increment session version:`, err);
    }
  }

  /**
   * Check if student is globally blocked
   */
  static async isStudentBlocked(studentId: string): Promise<boolean> {
    const snap = await db.collection(LIVE_BLOCKS_COL).doc(studentId).get();
    if (!snap.exists) return false;
    const block = snap.data() as ILiveBlock;
    return block.active === true;
  }

  /**
   * Get single participant in a session
   */
  static async getParticipant(sessionId: string, studentId: string): Promise<ILiveParticipant | null> {
    const snap = await db
      .collection(LIVE_SESSIONS_COL)
      .doc(sessionId)
      .collection(PARTICIPANTS_SUBCOL)
      .doc(studentId)
      .get();

    if (!snap.exists) return null;
    return snap.data() as ILiveParticipant;
  }

  /**
   * List all participants in a live session
   */
  static async listParticipants(sessionId: string): Promise<ILiveParticipant[]> {
    const snap = await db
      .collection(LIVE_SESSIONS_COL)
      .doc(sessionId)
      .collection(PARTICIPANTS_SUBCOL)
      .get();

    const now = Date.now();
    return snap.docs.map((doc) => {
      const p = doc.data() as ILiveParticipant;
      if (p.presenceStatus !== 'LEFT' && p.presenceStatus !== 'OFFLINE' && (p as any).presenceStatus !== 'DISCONNECTED') {
        const hbTime = new Date(p.lastHeartbeat || 0).getTime();
        const diffSec = (now - hbTime) / 1000;
        if (diffSec > 45) {
          p.presenceStatus = 'OFFLINE';
        } else if (diffSec > 15) {
          p.presenceStatus = 'RECONNECTING';
        }
      }
      return p;
    });
  }

  /**
   * Student requests to join a live session
   */
  static async requestJoin(
    sessionId: string,
    studentId: string,
    displayName: string,
    platform: 'web' | 'android' | 'ios' = 'web',
    device?: string
  ): Promise<{ status: 'WAITING_ROOM' | 'APPROVED' | 'JOINED' | 'KICKED' | 'BLOCKED' | 'REJECTED' }> {
    // 1. Check Global Block
    const blocked = await this.isStudentBlocked(studentId);
    if (blocked) {
      return { status: 'BLOCKED' };
    }

    // 2. Check Session Doc for Waiting Room setting
    const sessionSnap = await db.collection(LIVE_SESSIONS_COL).doc(sessionId).get();
    if (!sessionSnap.exists) {
      throw new AppError('Live session not found', 404);
    }
    const sessionData = sessionSnap.data();
    const waitingRoomEnabled = sessionData?.waitingRoomEnabled ?? false;

    // 3. Check existing participant state
    const partRef = db
      .collection(LIVE_SESSIONS_COL)
      .doc(sessionId)
      .collection(PARTICIPANTS_SUBCOL)
      .doc(studentId);

    const partSnap = await partRef.get();
    const now = new Date().toISOString();

    if (partSnap.exists) {
      const participant = partSnap.data() as ILiveParticipant;

      if (participant.moderationStatus === 'KICKED') {
        return { status: 'KICKED' };
      }
      if (participant.moderationStatus === 'REJECTED') {
        return { status: 'REJECTED' };
      }

      if (waitingRoomEnabled && participant.moderationStatus === 'WAITING') {
        await partRef.update({ lastHeartbeat: now, presenceStatus: 'CONNECTING' });
        return { status: 'WAITING_ROOM' };
      }

      // If approved or waiting room disabled, mark as JOINED
      const newModeration: ModerationStatus =
        participant.moderationStatus === 'NONE'
          ? waitingRoomEnabled
            ? 'WAITING'
            : 'APPROVED'
          : participant.moderationStatus;

      if (newModeration === 'WAITING') {
        await partRef.update({
          moderationStatus: 'WAITING',
          presenceStatus: 'CONNECTING',
          lastHeartbeat: now,
        });
        await this.logEvent(sessionId, studentId, 'JOIN_REQUEST', studentId);
        await this.incrementSessionVersion(sessionId);
        return { status: 'WAITING_ROOM' };
      }

      // Approved/Joined
      await partRef.update({
        moderationStatus: 'APPROVED',
        presenceStatus: 'JOINED',
        joinedAt: participant.joinedAt || now,
        lastHeartbeat: now,
      });

      await this.logEvent(sessionId, studentId, 'JOINED', studentId);
      return { status: 'JOINED' };
    }

    // 4. First time requesting join
    const initialModeration: ModerationStatus = waitingRoomEnabled ? 'WAITING' : 'APPROVED';
    const initialPresence: PresenceStatus = waitingRoomEnabled ? 'CONNECTING' : 'JOINED';

    const newParticipant: ILiveParticipant = {
      studentId,
      displayName: displayName || 'Unknown User',
      moderationStatus: initialModeration,
      presenceStatus: initialPresence,
      requestedAt: now,
      joinedAt: initialModeration === 'APPROVED' ? now : undefined,
      lastHeartbeat: now,
      platform,
      device,
      isHandRaised: false,
      capabilities: {
        canJoin: true,
        canRaiseHand: true,
        canChat: true,
        canSpeak: false,
      },
    };

    await partRef.set(newParticipant);
    await this.logEvent(sessionId, studentId, initialModeration === 'WAITING' ? 'JOIN_REQUEST' : 'JOINED', studentId);
    await this.incrementSessionVersion(sessionId);

    return { status: initialModeration === 'WAITING' ? 'WAITING_ROOM' : 'JOINED' };
  }

  /**
   * Heartbeat to keep connection status active
   */
  static async updateHeartbeat(sessionId: string, studentId: string): Promise<void> {
    const now = new Date().toISOString();
    const partRef = db
      .collection(LIVE_SESSIONS_COL)
      .doc(sessionId)
      .collection(PARTICIPANTS_SUBCOL)
      .doc(studentId);

    await partRef.update({
      lastHeartbeat: now,
      presenceStatus: 'JOINED',
    });
  }

  /**
   * Moderate a participant (approve, reject, kick, allow-rejoin, raise-hand, lower-hand)
   */
  static async patchParticipantAction(
    sessionId: string,
    targetStudentId: string,
    action: 'approve' | 'reject' | 'kick' | 'allow-rejoin' | 'raise-hand' | 'lower-hand',
    actorId: string,
    payload?: { kickReasonCode?: ILiveParticipant['kickReasonCode']; kickCustomMessage?: string }
  ): Promise<ILiveParticipant> {
    const partRef = db
      .collection(LIVE_SESSIONS_COL)
      .doc(sessionId)
      .collection(PARTICIPANTS_SUBCOL)
      .doc(targetStudentId);

    const snap = await partRef.get();
    if (!snap.exists) {
      throw new AppError('Participant not found in session', 404);
    }

    const now = new Date().toISOString();
    const current = snap.data() as ILiveParticipant;
    let updates: Partial<ILiveParticipant> = {};
    let eventType: ILiveSessionEvent['eventType'] | null = null;

    switch (action) {
      case 'approve':
        updates = {
          moderationStatus: 'APPROVED',
          presenceStatus: 'JOINED',
          approvedAt: now,
          approvedBy: actorId,
        };
        eventType = 'APPROVED';
        break;

      case 'reject':
        updates = {
          moderationStatus: 'REJECTED',
          presenceStatus: 'LEFT',
        };
        eventType = 'REJECTED';
        break;

      case 'kick':
        updates = {
          moderationStatus: 'KICKED',
          presenceStatus: 'OFFLINE',
          kickedBy: actorId,
          kickReasonCode: payload?.kickReasonCode || 'OTHER',
          kickCustomMessage: payload?.kickCustomMessage,
        };
        eventType = 'KICKED';
        break;

      case 'allow-rejoin':
        updates = {
          moderationStatus: 'NONE',
          presenceStatus: 'OFFLINE',
          kickReasonCode: undefined,
          kickCustomMessage: undefined,
        };
        eventType = 'ALLOW_REJOIN';
        break;

      case 'raise-hand':
        updates = {
          isHandRaised: true,
          handRaisedAt: now,
        };
        eventType = 'HAND_RAISED';
        break;

      case 'lower-hand':
        updates = {
          isHandRaised: false,
          handRaisedAt: undefined,
        };
        eventType = 'HAND_LOWERED';
        break;

      default:
        throw new AppError(`Unknown action ${action}`, 400);
    }

    await partRef.update(updates);

    if (eventType) {
      await this.logEvent(sessionId, actorId, eventType, targetStudentId, payload);
    }

    await this.incrementSessionVersion(sessionId);

    const updatedSnap = await partRef.get();
    return updatedSnap.data() as ILiveParticipant;
  }

  /**
   * Block a student globally from live sessions
   */
  static async blockStudent(
    studentId: string,
    actorId: string,
    reason?: string,
    displayName?: string
  ): Promise<ILiveBlock> {
    const now = new Date().toISOString();
    const blockRef = db.collection(LIVE_BLOCKS_COL).doc(studentId);

    const blockData: ILiveBlock = {
      studentId,
      displayName,
      blockedBy: actorId,
      blockedAt: now,
      reason,
      active: true,
    };

    await blockRef.set(blockData);
    await this.logEvent('GLOBAL', actorId, 'BLOCKED', studentId, { reason });

    return blockData;
  }

  /**
   * Unblock a student globally
   */
  static async unblockStudent(studentId: string, actorId: string): Promise<void> {
    const now = new Date().toISOString();
    const blockRef = db.collection(LIVE_BLOCKS_COL).doc(studentId);

    await blockRef.update({
      active: false,
      unblockedAt: now,
      unblockedBy: actorId,
    });

    await this.logEvent('GLOBAL', actorId, 'UNBLOCKED', studentId);
  }

  /**
   * List all global blocks
   */
  static async listGlobalBlocks(): Promise<ILiveBlock[]> {
    const snap = await db.collection(LIVE_BLOCKS_COL).where('active', '==', true).get();
    return snap.docs.map((doc) => doc.data() as ILiveBlock);
  }

  /**
   * Update participant status directly (e.g. from SDK webhooks)
   */
  static async updateParticipantStatus(
    sessionId: string, 
    userId: string | undefined, 
    status: PresenceStatus, 
    providerParticipantId?: string, 
    connectionState?: 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED',
    role?: 'HOST' | 'PARTICIPANT' | 'CO_HOST',
    displayName?: string
  ): Promise<void> {
    if (!userId) return;
    const partRef = db.collection(LIVE_SESSIONS_COL).doc(sessionId).collection(PARTICIPANTS_SUBCOL).doc(userId);
    const now = new Date().toISOString();
    
    const snap = await partRef.get();
    if (snap.exists) {
      const updates: Partial<ILiveParticipant> = {
        presenceStatus: status,
        lastHeartbeat: now
      };
      if (status === 'JOINED') updates.joinedAt = now;
      if (status === 'LEFT') updates.leftAt = now;
      if (providerParticipantId) updates.providerParticipantId = providerParticipantId;
      if (connectionState) updates.connectionState = connectionState;
      if (role) updates.role = role;
      
      await partRef.update(updates);
    } else if (status === 'JOINED' || role === 'HOST') {
      // Create if it doesn't exist (e.g. Host joining for first time)
      const newParticipant: ILiveParticipant = {
        studentId: userId,
        displayName: displayName || 'Unknown User',
        moderationStatus: 'APPROVED',
        presenceStatus: status,
        requestedAt: now,
        joinedAt: status === 'JOINED' ? now : undefined,
        lastHeartbeat: now,
        role: role || 'PARTICIPANT',
        connectionState: connectionState || 'CONNECTED',
        providerParticipantId,
        isHandRaised: false,
        capabilities: {
          canJoin: true,
          canRaiseHand: true,
          canChat: true,
          canSpeak: true,
        },
      };
      await partRef.set(newParticipant);
    }

    await this.logEvent(sessionId, userId, status === 'JOINED' ? 'JOINED' : 'LEFT', userId);
  }

  /**
   * Mark all active participants as LEFT when a session ends
   */
  static async markAllParticipantsLeft(sessionId: string): Promise<void> {
    const participantsRef = db.collection(LIVE_SESSIONS_COL).doc(sessionId).collection(PARTICIPANTS_SUBCOL);
    const snap = await participantsRef.get();
    
    if (snap.empty) return;
    
    const batch = db.batch();
    const now = new Date().toISOString();
    
    snap.docs.forEach(doc => {
      const p = doc.data() as ILiveParticipant;
      if (p.presenceStatus !== 'LEFT' && p.presenceStatus !== 'OFFLINE') {
        batch.update(doc.ref, {
          presenceStatus: 'LEFT',
          leftAt: now,
          lastHeartbeat: now
        });
      }
    });
    
    await batch.commit();
  }
}
