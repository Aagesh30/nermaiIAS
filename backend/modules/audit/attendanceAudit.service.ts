import { db } from '../../infrastructure/firebase';
import { IAttendanceAudit, AuditEventType } from './types';

class AttendanceAuditService {
  private collection = db.collection('attendance_audits');

  async logEvent(
    classId: string, 
    eventType: AuditEventType, 
    performedBy: string, 
    oldValue?: Record<string, any>, 
    newValue?: Record<string, any>, 
    metadata?: Record<string, any>
  ) {
    const payload: IAttendanceAudit = {
      classId,
      eventType,
      performedBy,
      createdAt: new Date().toISOString(),
      oldValue,
      newValue,
      metadata
    };
    
    await this.collection.add(payload);
  }
}

export const attendanceAuditService = new AttendanceAuditService();
