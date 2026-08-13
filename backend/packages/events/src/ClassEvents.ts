export interface ClassEventPayloads {
  CLASS_STARTED: {
    classId: string;
    teacherId?: string;
    timestamp: string; // UTC ISODate
  };
  CLASS_EXTENDED: {
    classId: string;
    addedMinutes: number;
    adminId: string;
    timestamp: string;
  };
  CLASS_ENDED: {
    classId: string;
    timestamp: string;
  };
  RECORDING_UPLOADED: {
    classId: string;
    videoId: string;
    timestamp: string;
  };
}
