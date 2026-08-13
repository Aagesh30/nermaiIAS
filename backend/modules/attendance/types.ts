export type AttendanceStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PROCESSING' | 'FINALIZED' | 'LOCKED';

export interface AttendanceResult {
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  watchTimeSeconds: number;
  percentage: number;
}

export interface AttendanceOverride {
  by: string; // adminId
  reason: string;
  oldStatus: string;
  newStatus: string;
  time: string; // ISODate
}

export interface AttendancePolicySnapshot {
  mode: 'percentage' | 'fixed_minutes' | 'full' | 'manual' | 'first_join_only' | 'teacher_marked' | 'hybrid';
  value: number;
  version: number;
}

export interface IAttendanceSession {
  id?: string;
  classId: string;
  userId: string;
  status: AttendanceStatus;
  
  joinTime: string; // ISODate
  leaveTime?: string; // ISODate
  activeTimeSeconds: number;
  reconnects: number;
  gracePeriodApplied: boolean;
  
  calculatedResult?: AttendanceResult;
  overrideResult?: AttendanceOverride;
  finalResult?: AttendanceResult;
  
  attendancePolicySnapshot?: AttendancePolicySnapshot;
  attendanceFrozenAt?: string; // ISODate when locked
  
  createdAt: string;
  updatedAt: string;
}
