export type AuditEventType = 
  | 'POLICY_CREATED'
  | 'POLICY_CHANGED'
  | 'CLASS_STARTED'
  | 'CLASS_EXTENDED'
  | 'CLASS_ENDED'
  | 'RECORDING_UPLOADED'
  | 'ATTENDANCE_PROCESSING'
  | 'ATTENDANCE_FINALIZED'
  | 'ATTENDANCE_LOCKED'
  | 'ADMIN_OVERRIDE';

export interface IAttendanceAudit {
  id?: string;
  classId: string;
  eventType: AuditEventType;
  createdAt: string; // ISODate
  performedBy: string; // userId / adminId / 'system'
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface IClassLifecycle {
  id?: string;
  classId: string;
  currentState: 'Scheduled' | 'Started' | 'Extended' | 'Ended' | 'Recording_Uploaded' | 'Processing' | 'Finalized' | 'Locked';
  transitions: {
    state: string;
    timestamp: string;
    performedBy: string;
  }[];
}
