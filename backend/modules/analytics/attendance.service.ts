import { db } from '../../infrastructure/firebase';

class AttendanceAnalyticsService {
  private collection = db.collection('attendance_analytics');

  async computeAndStore(classId: string, payload: any) {
    // Computes Average %, Peak Concurrent, Teacher Delay, Reconnects
    await this.collection.doc(classId).set({
      ...payload,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }
}

export const attendanceAnalyticsService = new AttendanceAnalyticsService();
