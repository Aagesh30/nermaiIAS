/**
 * LAMS — Live Attendance Management System: Type Definitions
 *
 * Three Firestore collections:
 *  live_attendance_sessions  — one active session per live class window
 *  attendance_logs           — raw join/leave events per student
 *  attendance_summaries      — computed final result per student per session
 */

export type LamsSessionStatus = 'ACTIVE' | 'ENDED' | 'FINALIZED';

export type LamsAttendanceStatus = 'Present' | 'Late' | 'Early Leave' | 'Absent';

export interface ILiveAttendanceSession {
  id: string;
  liveSessionId: string;  // FK → live_sessions
  classId: string;
  staffId: string;
  tenantId: string;
  status: LamsSessionStatus;

  startedAt: string;       // ISO timestamp
  endedAt?: string;        // set on END ATTENDANCE

  // Configurable thresholds (copied from admin config at creation time)
  lateThresholdMinutes: number;      // default: 15
  earlyLeaveThresholdPct: number;    // default: 80 (leave before 80% of window = early exit)
  minAttendancePct: number;          // default: 75

  // Rolling counters (updated live)
  studentCount: number;
  presentCount: number;
  absentCount: number;

  createdAt: string;
  updatedAt: string;
}

export interface IAttendanceLog {
  id: string;
  sessionId: string;
  studentId: string;
  joinTime: string;        // ISO
  leaveTime?: string;      // ISO — null while student is still present
  durationSeconds?: number; // computed on leave
}

export interface IAttendanceSummary {
  id: string;              // `${sessionId}_${studentId}`
  sessionId: string;
  studentId: string;
  classId: string;
  liveSessionId: string;

  joins: Array<{
    joinTime: string;
    leaveTime?: string;
    durationSeconds?: number;
  }>;

  totalPresenceSeconds: number;
  windowSeconds: number;   // total attendance window duration
  attendancePct: number;   // 0–100

  status: LamsAttendanceStatus;
  isLate: boolean;
  isEarlyLeave: boolean;

  finalizedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Staff assignment on a live session
export interface ILamsStaffAssignment {
  liveSessionId: string;
  assignedStaffId: string;   // resolved staff (class override → subject default → course default)
  assignedStaffName?: string;
  assignedAt: string;
  assignedBy: string;
  overrideLevel: 'class' | 'subject' | 'course'; // which level this was resolved from
}
