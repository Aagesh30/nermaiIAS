export interface AttendanceEventPayloads {
  ATTENDANCE_PROCESSING: {
    classId: string;
    timestamp: string; // UTC ISODate
  };
  ATTENDANCE_FINALIZED: {
    classId: string;
    timestamp: string;
  };
  ATTENDANCE_LOCKED: {
    classId: string;
    adminId: string;
    timestamp: string;
  };
  ATTENDANCE_OVERRIDDEN: {
    classId: string;
    userId: string;
    adminId: string;
    reason: string;
    oldStatus: string;
    newStatus: string;
    timestamp: string;
  };
}
