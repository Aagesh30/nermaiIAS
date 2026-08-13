import { db } from '../../infrastructure/firebase';
import { redisClient } from '../../infrastructure/redis';
import { AppError } from '../../core/errors/AppError';
import { logger } from '../../core/logger';
import {
  ILiveAttendanceSession,
  IAttendanceLog,
  IAttendanceSummary,
  LamsSessionStatus,
  LamsAttendanceStatus,
} from './types';
import { EventBus, Events } from '../../core/events/EventBus';
import { teachingAssignmentService } from '../staff/TeachingAssignmentService';


// ─── Collection names ─────────────────────────────────────────────────────────
const SESSIONS_COL = 'live_attendance_sessions';
const LOGS_COL = 'attendance_logs';
const SUMMARIES_COL = 'attendance_summaries';

// Redis key: marks whether a live session has an active LAMS session
const activeKey = (liveSessionId: string) => `lams:active:${liveSessionId}`;

// ─── Default thresholds ───────────────────────────────────────────────────────
const DEFAULTS = {
  lateThresholdMinutes: 15,
  earlyLeaveThresholdPct: 80,
  minAttendancePct: 75,
};

// ─── Service ──────────────────────────────────────────────────────────────────
export class LiveAttendanceService {

  // ── START ATTENDANCE ──────────────────────────────────────────────────────
  async startAttendance(
    liveSessionId: string,
    staffId: string,
    tenantId: string,
    classId: string,
    config?: {
      lateThresholdMinutes?: number;
      earlyLeaveThresholdPct?: number;
      minAttendancePct?: number;
    },
    role?: string
  ): Promise<ILiveAttendanceSession> {
    // Check if staff is assigned unless user is admin / super_admin
    const isAdmin = ['super_admin', 'admin'].includes(role || '');
    if (!isAdmin) {
      const canConduct = await teachingAssignmentService.canConductClass(classId, staffId);
      if (!canConduct) {
        throw new AppError('You are not assigned to conduct this class.', 403);
      }
    }

    // Guard: cannot have two active sessions for the same live class
    const existing = await this.getActiveSession(liveSessionId);
    if (existing) {
      throw new AppError('Attendance session already active for this class', 409);
    }

    const now = new Date().toISOString();
    const docRef = db.collection(SESSIONS_COL).doc();
    const session: ILiveAttendanceSession = {
      id: docRef.id,
      liveSessionId,
      classId,
      staffId,
      tenantId,
      status: 'ACTIVE',
      startedAt: now,
      lateThresholdMinutes: config?.lateThresholdMinutes ?? DEFAULTS.lateThresholdMinutes,
      earlyLeaveThresholdPct: config?.earlyLeaveThresholdPct ?? DEFAULTS.earlyLeaveThresholdPct,
      minAttendancePct: config?.minAttendancePct ?? DEFAULTS.minAttendancePct,
      studentCount: 0,
      presentCount: 0,
      absentCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(session);

    // Cache session ID in Redis for fast lookup (TTL: 8 hours — generous for any class)
    await redisClient.set(activeKey(liveSessionId), docRef.id, 'EX', 8 * 3600);

    // Update parent live_sessions document
    await db.collection('live_sessions').doc(liveSessionId).update({
      lamsStatus: 'ATTENDANCE_ACTIVE',
      activeAttendanceSessionId: docRef.id,
      attendance: {
        status: 'LIVE',
        startedAt: now,
        startedBy: staffId
      }
    });


    // Emit event
    await EventBus.emit(Events.ATTENDANCE_STARTED, {
      sessionId: docRef.id,
      liveSessionId,
      staffId,
      timestamp: now
    });

    logger.info(`[LAMS] Attendance STARTED for liveSession=${liveSessionId} by staff=${staffId}`);
    return session;
  }

  // ── END ATTENDANCE ────────────────────────────────────────────────────────
  async endAttendance(
    sessionId: string,
    staffId: string,
    role?: string
  ): Promise<ILiveAttendanceSession> {
    const sessionRef = db.collection(SESSIONS_COL).doc(sessionId);
    const snap = await sessionRef.get();
    if (!snap.exists) throw new AppError('Attendance session not found', 404);

    const session = snap.data() as ILiveAttendanceSession;
    if (session.status !== 'ACTIVE') {
      throw new AppError('Attendance session is not currently active', 400);
    }

    const isAdmin = ['super_admin', 'admin'].includes(role || '');
    if (session.staffId !== staffId && !isAdmin) {
      throw new AppError('Only the Attendance Owner or an Administrator can end this attendance session', 403);
    }

    const now = new Date().toISOString();
    const endedAt = now;

    // Close any open attendance logs (students still "joined" when staff ends)
    await this._closeOpenLogs(sessionId, now);

    // Update session status
    await sessionRef.update({ status: 'ENDED', endedAt, updatedAt: now });

    // Clear Redis active flag
    await redisClient.del(activeKey(session.liveSessionId));

    // Run finalization (compute summaries)
    await this._finalize(sessionId, session, endedAt);

    // Update parent live_sessions document
    await db.collection('live_sessions').doc(session.liveSessionId).update({
      lamsStatus: 'ATTENDANCE_ENDED',
      activeAttendanceSessionId: null, // Clear the lock
      'attendance.status': 'ENDED',
      'attendance.endedAt': endedAt,
      'attendance.endedBy': staffId
    });


    // Emit event
    await EventBus.emit(Events.ATTENDANCE_ENDED, {
      sessionId,
      liveSessionId: session.liveSessionId,
      staffId,
      timestamp: endedAt
    });

    logger.info(`[LAMS] Attendance ENDED for session=${sessionId} by staff=${staffId}`);
    const updatedSnap = await sessionRef.get();
    return updatedSnap.data() as ILiveAttendanceSession;
  }

  // ── STUDENT JOIN ──────────────────────────────────────────────────────────
  async logStudentJoin(
    sessionId: string,
    studentId: string
  ): Promise<IAttendanceLog> {
    const session = await this._getSession(sessionId);
    if (session.status !== 'ACTIVE') {
      throw new AppError('Attendance session is not active', 400);
    }

    const now = new Date().toISOString();
    const logRef = db.collection(LOGS_COL).doc();
    const log: IAttendanceLog = {
      id: logRef.id,
      sessionId,
      studentId,
      joinTime: now,
    };
    await logRef.set(log);

    // Increment student count
    await db.collection(SESSIONS_COL).doc(sessionId).update({
      studentCount: session.studentCount + 1,
      updatedAt: now,
    });

    logger.debug(`[LAMS] Student JOIN session=${sessionId} student=${studentId}`);
    return log;
  }

  // ── STUDENT LEAVE ─────────────────────────────────────────────────────────
  async logStudentLeave(
    sessionId: string,
    studentId: string
  ): Promise<void> {
    const now = new Date().toISOString();

    // Find the most recent open log for this student in this session
    const logsSnap = await db.collection(LOGS_COL)
      .where('sessionId', '==', sessionId)
      .where('studentId', '==', studentId)
      .get();

    // Sort in memory to avoid composite index requirement
    const openLog = logsSnap.docs
      .map(d => ({ ref: d.ref, data: d.data() as IAttendanceLog }))
      .filter(({ data }) => !data.leaveTime)
      .sort((a, b) => new Date(b.data.joinTime).getTime() - new Date(a.data.joinTime).getTime())[0];

    if (!openLog) {
      logger.warn(`[LAMS] No open log found for student=${studentId} session=${sessionId}`);
      return;
    }

    const durationSeconds = Math.floor(
      (new Date(now).getTime() - new Date(openLog.data.joinTime).getTime()) / 1000
    );

    await openLog.ref.update({ leaveTime: now, durationSeconds });
    logger.debug(`[LAMS] Student LEAVE session=${sessionId} student=${studentId} duration=${durationSeconds}s`);
  }

  // ── GET ACTIVE SESSION ────────────────────────────────────────────────────
  async getActiveSession(liveSessionId: string): Promise<ILiveAttendanceSession | null> {
    // Try Redis cache first
    const cachedId = await redisClient.get(activeKey(liveSessionId));
    if (cachedId) {
      const snap = await db.collection(SESSIONS_COL).doc(cachedId).get();
      if (snap.exists) {
        const data = snap.data() as ILiveAttendanceSession;
        if (data.status === 'ACTIVE') return data;
      }
      // Stale cache — clear it
      await redisClient.del(activeKey(liveSessionId));
    }

    // Fall back to Firestore query (crash recovery path)
    const snap = await db.collection(SESSIONS_COL)
      .where('liveSessionId', '==', liveSessionId)
      .where('status', '==', 'ACTIVE')
      .get();

    if (snap.empty) return null;

    // In-memory sort to find latest
    const sessions = snap.docs
      .map(d => d.data() as ILiveAttendanceSession)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    const active = sessions[0];

    // Restore Redis cache
    await redisClient.set(activeKey(liveSessionId), active.id, 'EX', 8 * 3600);

    return active;
  }

  // ── GET SESSION SUMMARY ───────────────────────────────────────────────────
  async getSessionSummary(sessionId: string): Promise<IAttendanceSummary[]> {
    const snap = await db.collection(SUMMARIES_COL)
      .where('sessionId', '==', sessionId)
      .get();
    return snap.docs.map(d => d.data() as IAttendanceSummary);
  }

  // ── GET SESSION (raw) ─────────────────────────────────────────────────────
  async getSession(sessionId: string): Promise<ILiveAttendanceSession> {
    return this._getSession(sessionId);
  }

  // ── GET LIVE LOGS ─────────────────────────────────────────────────────────
  async getLiveLogs(sessionId: string): Promise<IAttendanceLog[]> {
    const snap = await db.collection(LOGS_COL)
      .where('sessionId', '==', sessionId)
      .get();
    return snap.docs
      .map(d => d.data() as IAttendanceLog)
      .sort((a, b) => new Date(a.joinTime).getTime() - new Date(b.joinTime).getTime());
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async _getSession(sessionId: string): Promise<ILiveAttendanceSession> {
    const snap = await db.collection(SESSIONS_COL).doc(sessionId).get();
    if (!snap.exists) throw new AppError('Attendance session not found', 404);
    return snap.data() as ILiveAttendanceSession;
  }

  /** Close all open logs when END ATTENDANCE is clicked */
  private async _closeOpenLogs(sessionId: string, endTime: string): Promise<void> {
    const logsSnap = await db.collection(LOGS_COL)
      .where('sessionId', '==', sessionId)
      .get();

    const batch = db.batch();
    for (const doc of logsSnap.docs) {
      const data = doc.data() as IAttendanceLog;
      if (!data.leaveTime) {
        const duration = Math.floor(
          (new Date(endTime).getTime() - new Date(data.joinTime).getTime()) / 1000
        );
        batch.update(doc.ref, { leaveTime: endTime, durationSeconds: duration });
      }
    }
    await batch.commit();
  }

  /** Compute and persist attendance summaries for all students */
  private async _finalize(
    sessionId: string,
    session: ILiveAttendanceSession,
    endedAt: string
  ): Promise<void> {
    const windowSeconds = Math.floor(
      (new Date(endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000
    );
    const lateWindowSeconds = session.lateThresholdMinutes * 60;
    const earlyLeaveCutoffSeconds = windowSeconds * (session.earlyLeaveThresholdPct / 100);

    const logsSnap = await db.collection(LOGS_COL)
      .where('sessionId', '==', sessionId)
      .get();

    // Group logs by student
    const byStudent = new Map<string, IAttendanceLog[]>();
    for (const doc of logsSnap.docs) {
      const log = doc.data() as IAttendanceLog;
      if (!byStudent.has(log.studentId)) byStudent.set(log.studentId, []);
      byStudent.get(log.studentId)!.push(log);
    }

    const summaryBatch = db.batch();
    let presentCount = 0;
    let absentCount = 0;

    for (const [studentId, logs] of byStudent.entries()) {
      const sortedLogs = logs.sort(
        (a, b) => new Date(a.joinTime).getTime() - new Date(b.joinTime).getTime()
      );

      const totalPresenceSeconds = sortedLogs.reduce(
        (acc, l) => acc + (l.durationSeconds ?? 0), 0
      );

      const attendancePct = windowSeconds > 0
        ? Math.min(100, (totalPresenceSeconds / windowSeconds) * 100)
        : 0;

      // Late: first join after threshold
      const firstJoin = new Date(sortedLogs[0].joinTime).getTime();
      const sessionStart = new Date(session.startedAt).getTime();
      const isLate = (firstJoin - sessionStart) / 1000 > lateWindowSeconds;

      // Early leave: last leave before earlyLeave threshold
      const lastLog = sortedLogs[sortedLogs.length - 1];
      const lastLeave = lastLog.leaveTime
        ? new Date(lastLog.leaveTime).getTime()
        : new Date(endedAt).getTime();
      const presenceSeconds = (lastLeave - sessionStart) / 1000;
      const isEarlyLeave = presenceSeconds < earlyLeaveCutoffSeconds;

      let status: LamsAttendanceStatus;
      if (attendancePct >= session.minAttendancePct) {
        status = isLate ? 'Late' : isEarlyLeave ? 'Early Leave' : 'Present';
      } else {
        status = 'Absent';
      }

      if (status !== 'Absent') presentCount++;
      else absentCount++;

      const summaryId = `${sessionId}_${studentId}`;
      const now = new Date().toISOString();
      const summary: IAttendanceSummary = {
        id: summaryId,
        sessionId,
        studentId,
        classId: session.classId,
        liveSessionId: session.liveSessionId,
        joins: sortedLogs.map(l => ({
          joinTime: l.joinTime,
          leaveTime: l.leaveTime,
          durationSeconds: l.durationSeconds,
        })),
        totalPresenceSeconds,
        windowSeconds,
        attendancePct: Math.round(attendancePct * 10) / 10,
        status,
        isLate,
        isEarlyLeave,
        finalizedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      summaryBatch.set(
        db.collection(SUMMARIES_COL).doc(summaryId),
        summary
      );
    }

    // Update session counters
    summaryBatch.update(db.collection(SESSIONS_COL).doc(sessionId), {
      status: 'FINALIZED',
      presentCount,
      absentCount,
      studentCount: byStudent.size,
      updatedAt: new Date().toISOString(),
    });

    await summaryBatch.commit();
    logger.info(`[LAMS] Finalized session=${sessionId}: present=${presentCount} absent=${absentCount}`);
  }
}

export const liveAttendanceService = new LiveAttendanceService();
