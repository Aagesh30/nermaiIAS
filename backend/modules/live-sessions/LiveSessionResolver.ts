import { db } from '../../infrastructure/firebase';

export interface ResolvedLiveSession {
  sessionId: string | null;
  provider: string;
  status: string;
  attendance: {
    status: string;
    startedAt: string | null;
    endedAt: string | null;
  };
  moderators: string[];
  joinAllowed: boolean;
  waitingRoomEnabled: boolean;
  actualStartTime?: string | null;
  scheduledStartTime?: string | null;
  expectedDurationMinutes?: number | null;
}

export class LiveSessionResolver {
  /**
   * The single source of truth for resolving a class's active live session state.
   * This should be used by the Dashboard, Join APIs, and Course Player to ensure
   * uniform provider, status, and join eligibility rules.
   */
  static async resolveActiveSession(classId: string, classDoc?: any): Promise<ResolvedLiveSession> {
    if (!classDoc) {
      const snap = await db.collection('classes').doc(classId).get();
      if (snap.exists) classDoc = snap.data();
    }

    // 1. Fetch active session
    const snapshot = await db.collection('live_sessions')
      .where('classId', '==', classId)
      .where('isDeleted', '==', false)
      .get();
      
    const sessions = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as any))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      
    // Prefer sessions that are genuinely active over scheduled/draft if multiple exist (cleanup scenarios)
    const activeSession = sessions.find(s => ['JOINING', 'HOST_CONNECTED', 'LIVE'].includes(s.status)) || sessions[0] || null;

    // 2. Base Fallback (No active session created yet)
    if (!activeSession) {
      let fallbackProvider = classDoc?.defaultProvider || 'live';
      if (classDoc?.classType === 'youtube_live') fallbackProvider = 'youtube';
      else if (classDoc?.classType === 'zoom_live') fallbackProvider = 'zoom';

    return {
        sessionId: null,
        provider: fallbackProvider,
        status: 'SCHEDULED',
        attendance: { status: 'NOT_STARTED', startedAt: null, endedAt: null },
        moderators: [],
        joinAllowed: false,
        waitingRoomEnabled: false,
        scheduledStartTime: classDoc?.scheduledStartTime || null,
        expectedDurationMinutes: classDoc?.expectedDurationMinutes || null,
      };
    }

    // 3. Resolve Provider
    let resolvedProvider = activeSession.provider || classDoc?.defaultProvider;
    if (!resolvedProvider) {
      if (classDoc?.classType === 'youtube_live') resolvedProvider = 'youtube';
      else if (classDoc?.classType === 'zoom_live') resolvedProvider = 'zoom';
      else resolvedProvider = 'live';
    }

    // 4. Resolve Join Authorization
    // Student join is exclusively determined by these raw status codes.
    const isJoinAllowed = ['JOINING', 'HOST_CONNECTED', 'LIVE'].includes(activeSession.status);

    return {
      sessionId: activeSession.id,
      provider: resolvedProvider,
      status: activeSession.status,
      attendance: {
        status: activeSession.attendance?.status || 'NOT_STARTED',
        startedAt: activeSession.attendance?.startedAt || null,
        endedAt: activeSession.attendance?.endedAt || null
      },
      moderators: activeSession.assignedStaffIds || [],
      joinAllowed: isJoinAllowed,
      waitingRoomEnabled: activeSession.waitingRoomEnabled !== false,
      actualStartTime: activeSession.actualStartTime || null,
      scheduledStartTime: activeSession.scheduledStartTime || classDoc?.scheduledStartTime || null,
      expectedDurationMinutes: activeSession.expectedDurationMinutes || classDoc?.expectedDurationMinutes || null,
    };
  }
}
