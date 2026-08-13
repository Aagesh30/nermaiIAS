import { platformEvents } from '@nermai/events';
import { attendanceAnalyticsService } from './attendance.service';
import { db } from '../../infrastructure/firebase';

export class AttendanceAnalyticsWorker {
  start() {
    platformEvents.on('ATTENDANCE_FINALIZED', async (payload: any) => {
      console.log(`[AnalyticsWorker] Received ATTENDANCE_FINALIZED for ${payload.classId}`);
      try {
        await this.computeClassAnalytics(payload.classId);
      } catch (err) {
        console.error(`[AnalyticsWorker] Failed to compute analytics for ${payload.classId}`, err);
      }
    });
  }

  private async computeClassAnalytics(classId: string) {
    const classDocSnap = await db.collection('classes').doc(classId).get();
    if (!classDocSnap.exists) return;
    
    const classDoc = classDocSnap.data();
    const expectedDurationMinutes = classDoc?.expectedDurationMinutes || 60;
    
    const sessionsSnap = await db.collection('attendance_sessions')
      .where('classId', '==', classId)
      .get();
      
    let totalStudents = 0;
    let presentCount = 0;
    let absentCount = 0;
    let totalWatchSeconds = 0;
    let totalPercentage = 0;
    let maxReconnects = 0;
    
    sessionsSnap.docs.forEach(doc => {
      const data = doc.data();
      totalStudents++;
      totalWatchSeconds += data.activeTimeSeconds || 0;
      
      const result = data.finalResult || data.calculatedResult;
      if (result) {
        if (result.status === 'Present') presentCount++;
        else absentCount++;
        totalPercentage += result.percentage || 0;
      }
      
      if (data.reconnects > maxReconnects) {
        maxReconnects = data.reconnects;
      }
    });
    
    const avgWatchSeconds = totalStudents > 0 ? totalWatchSeconds / totalStudents : 0;
    const avgPercentage = totalStudents > 0 ? totalPercentage / totalStudents : 0;
    
    const analyticsPayload = {
      expectedDurationMinutes,
      totalStudents,
      presentCount,
      absentCount,
      avgWatchSeconds,
      avgPercentage,
      maxReconnects,
      calculatedAt: new Date().toISOString()
    };
    
    await attendanceAnalyticsService.computeAndStore(classId, analyticsPayload);
    console.log(`[AnalyticsWorker] Completed analytics for ${classId}`, analyticsPayload);
  }
}

export const attendanceAnalyticsWorker = new AttendanceAnalyticsWorker();
