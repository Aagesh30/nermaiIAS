import { getApiClient } from '../client';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface StartAttendancePayload {
  liveSessionId: string;
  classId: string;
  lateThresholdMinutes?: number;
  earlyLeaveThresholdPct?: number;
  minAttendancePct?: number;
}

// ─── LAMS API ─────────────────────────────────────────────────────────────────
export const LiveAttendanceApi = {

  // Staff controls
  startAttendance: (payload: StartAttendancePayload) =>
    getApiClient().post('/live-attendance/staff/start', payload),

  endAttendance: (sessionId: string) =>
    getApiClient().post(`/live-attendance/staff/${sessionId}/end`),

  getActiveSession: (liveSessionId: string) =>
    getApiClient().get(`/live-attendance/staff/${liveSessionId}/active`),

  getSessionSummary: (sessionId: string) =>
    getApiClient().get(`/live-attendance/staff/${sessionId}/summary`),

  getSessionLogs: (sessionId: string) =>
    getApiClient().get(`/live-attendance/staff/${sessionId}/logs`),

  // Student controls
  studentJoin: (sessionId: string) =>
    getApiClient().post(`/live-attendance/student/${sessionId}/join`),

  studentLeave: (sessionId: string) =>
    getApiClient().post(`/live-attendance/student/${sessionId}/leave`),

  // Shared (no prefix)
  checkActiveSession: (liveSessionId: string) =>
    getApiClient().get(`/live-attendance/active/${liveSessionId}`),
};
