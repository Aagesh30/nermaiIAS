import { getApiClient } from '../../../../core/services';
import { doc, collection, onSnapshot, query, orderBy, limit, Firestore } from 'firebase/firestore';
import { signInWithCustomToken, Auth } from 'firebase/auth';

export type SessionStatus = 'SCHEDULED' | 'JOINING' | 'HOST_CONNECTED' | 'LIVE' | 'ATTENDANCE_RUNNING' | 'ENDING' | 'ENDED' | 'FINALIZED';

export type ModerationStatus = 'NONE' | 'WAITING' | 'APPROVED' | 'REJECTED' | 'KICKED';
export type PresenceStatus = 'OFFLINE' | 'CONNECTING' | 'JOINED' | 'RECONNECTING' | 'LEFT';

export interface ILiveParticipant {
  studentId: string;
  displayName: string;
  avatarUrl?: string;
  role?: 'HOST' | 'PARTICIPANT' | 'CO_HOST';
  connectionState?: 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';
  providerParticipantId?: string;

  // Decoupled Statuses
  moderationStatus: ModerationStatus;
  presenceStatus: PresenceStatus;

  // Timestamps
  requestedAt?: string;
  approvedAt?: string;
  joinedAt?: string;
  leftAt?: string;
  lastHeartbeat?: string;

  // Device & Platform Info
  device?: string;
  platform?: 'web' | 'android' | 'ios';

  // Audit Fields
  approvedBy?: string;
  kickedBy?: string;
  kickReasonCode?: 'SPAM' | 'MISCONDUCT' | 'DISRUPTION' | 'OTHER';
  kickCustomMessage?: string;

  // Interactivity
  isHandRaised: boolean;
  handRaisedAt?: string;
  isMuted?: boolean;
}

export interface IActivityLog {
  id: string;
  studentId?: string;
  actorId?: string;
  actorName?: string;          // Display name of the actor (student or staff)
  actorDisplayName?: string;   // Alias for actorName used in some contexts
  eventType: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

type Unsubscribe = () => void;

export class LiveSessionRealtimeService {
  private db: Firestore;
  private auth: Auth;
  private sessionId: string | null = null;

  private unsubSession: Unsubscribe | null = null;
  private unsubParticipants: Unsubscribe | null = null;
  private unsubActivityFeed: Unsubscribe | null = null;

  private retryCount = 0;
  private maxRetries = 5;
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(db: Firestore, auth: Auth) {
    this.db = db;
    this.auth = auth;
  }

  /**
   * Connects to the backend, fetches a Firebase custom token, and authenticates.
   */
  async authenticate(): Promise<void> {
    try {
      if (this.auth.currentUser) {
        return; // Already authenticated
      }
      const response = await getApiClient().get('/auth/firebase-token');
      const customToken = response.data?.data?.token;
      
      if (!customToken) {
        throw new Error('Failed to retrieve Firebase Custom Token from backend');
      }

      await signInWithCustomToken(this.auth, customToken);
    } catch (error) {
      console.error('[RealtimeGateway] Authentication failed:', error);
      throw error;
    }
  }

  /**
   * Starts all subscriptions for the given session. Includes automatic retry logic for permission errors.
   */
  async subscribe(
    sessionId: string,
    callbacks: {
      onSessionUpdate: (session: any) => void;
      onParticipantsUpdate: (participants: ILiveParticipant[]) => void;
      onActivityUpdate: (logs: IActivityLog[]) => void;
      onError: (error: Error) => void;
    }
  ) {
    this.sessionId = sessionId;
    this.cleanup(); // Clean any existing subscriptions

    try {
      await this.authenticate();
      this.initListeners(callbacks);
    } catch (error: any) {
      this.handleError(error, callbacks);
    }
  }

  private initListeners(callbacks: any) {
    if (!this.sessionId) return;
    this.retryCount = 0;

    // Session Document
    this.unsubSession = onSnapshot(
      doc(this.db, 'live_sessions', this.sessionId),
      (docSnap) => {
        if (docSnap.exists()) {
          callbacks.onSessionUpdate({ id: docSnap.id, ...docSnap.data() });
        }
      },
      (error) => this.handleError(error, callbacks)
    );

    // Participants Subcollection
    this.unsubParticipants = onSnapshot(
      collection(this.db, 'live_sessions', this.sessionId, 'participants'),
      (querySnap) => {
        const parts = querySnap.docs.map(d => d.data() as ILiveParticipant);
        callbacks.onParticipantsUpdate(parts);
      },
      (error) => this.handleError(error, callbacks)
    );

    // Activity Feed Subcollection
    const q = query(
      collection(this.db, 'live_sessions', this.sessionId, 'activity_feed'), 
      orderBy('timestamp', 'desc'), 
      limit(50)
    );
    this.unsubActivityFeed = onSnapshot(
      q,
      (querySnap) => {
        const logs = querySnap.docs.map(d => d.data() as IActivityLog);
        callbacks.onActivityUpdate(logs);
      },
      (error) => this.handleError(error, callbacks)
    );
  }

  private handleError(error: any, callbacks: any) {
    console.error('[RealtimeGateway] Subscription Error:', error);
    this.cleanup();

    // Check if it's a permission denied or network error
    const isPermissionError = error?.code === 'permission-denied' || error?.message?.includes('Missing or insufficient permissions');
    const isNetworkError = error?.code === 'unavailable';

    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delayMs = Math.min(1000 * Math.pow(2, this.retryCount), 15000); // Exponential backoff max 15s
      
      console.log(`[RealtimeGateway] Retrying connection in ${delayMs}ms (Attempt ${this.retryCount}/${this.maxRetries})`);
      
      this.retryTimeout = setTimeout(async () => {
        try {
          if (isPermissionError) {
            // Token might be expired, clear it and force re-auth
            await this.auth.signOut();
            await this.authenticate();
          }
          this.initListeners(callbacks);
        } catch (e) {
          this.handleError(e, callbacks);
        }
      }, delayMs);
    } else {
      console.error('[RealtimeGateway] Max retries reached. Reporting error to UI.');
      callbacks.onError(error);
    }
  }

  cleanup() {
    if (this.unsubSession) this.unsubSession();
    if (this.unsubParticipants) this.unsubParticipants();
    if (this.unsubActivityFeed) this.unsubActivityFeed();
    
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    this.unsubSession = null;
    this.unsubParticipants = null;
    this.unsubActivityFeed = null;
  }
}

