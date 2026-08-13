import { db } from '../../infrastructure/firebase';
import { IClass } from '../courses/types';
import { attendanceService } from '../attendance/service';

export class AnalyticsWorker {
  private classAnalyticsCol = db.collection('class_analytics');
  private attendanceAnalyticsCol = db.collection('attendance_analytics');
  private coursesCollection = db.collection('classes');

  async queueImmediateAnalytics(classId: string) {
    console.log(`[BULLMQ] Processing immediate analytics for class ${classId}`);
    
    try {
      const classDocSnap = await this.coursesCollection.doc(classId).get();
      if (!classDocSnap.exists) return;
      
      const classData = classDocSnap.data() as any;
      
      const actualStart = classData.actualStartTime ? new Date(classData.actualStartTime).getTime() : 0;
      const actualEnd = classData.actualEndTime ? new Date(classData.actualEndTime).getTime() : 0;
      const scheduledStart = classData.scheduledStartTime ? new Date(classData.scheduledStartTime).getTime() : 0;
      
      let actualDurationSeconds = 0;
      if (actualStart && actualEnd) {
        actualDurationSeconds = (actualEnd - actualStart) / 1000;
      } else {
        actualDurationSeconds = (classData.expectedDurationMinutes || 60) * 60;
      }
      
      // 1. Reconcile Individual Attendance
      await attendanceService.finalizeClassAttendance(classId);
      
      // 2. Generate Class Analytics
      const teacherDelayMinutes = actualStart > scheduledStart ? Math.floor((actualStart - scheduledStart) / 60000) : 0;
      const teacherEndedEarly = (actualEnd > 0 && actualEnd < (scheduledStart + (classData.expectedDurationMinutes || 60) * 60000)) ? true : false;
      const totalExtensionMinutes = classData.extensionMinutes || 0;
      const extensionFrequency = classData.extensionLog ? classData.extensionLog.length : 0;

      const analyticsData = {
        classId,
        actualDurationMinutes: Math.floor(actualDurationSeconds / 60),
        teacherDelayMinutes,
        teacherEndedEarly,
        extensionFrequency,
        totalExtensionMinutes,
        joinSuccessPercentage: 0, // Mocked for now (requires aggregation)
        peakAttendance: 0, // Mocked for now
        updatedAt: new Date().toISOString()
      };

      await this.classAnalyticsCol.doc(classId).set(analyticsData, { merge: true });
      console.log(`[BULLMQ] Completed immediate analytics for class ${classId}`);
    } catch (e) {
      console.error(`[BULLMQ] Error generating immediate analytics:`, e);
    }
  }

  async queueDeferredAnalytics(classId: string, recordingDelayMinutes: number) {
    console.log(`[BULLMQ] Processing deferred analytics for class ${classId}`);
    try {
       // In a real scenario, this would aggregate historical viewing data
       const deferredData = {
           classId,
           recordingDelayMinutes,
           averageWatchPercentage: 0,
           completionPercentage: 0,
           recordingViews: 0,
           reconnectCount: 0,
           updatedAt: new Date().toISOString()
       };
       await this.attendanceAnalyticsCol.doc(classId).set(deferredData, { merge: true });
    } catch (e) {
       console.error(`[BULLMQ] Error generating deferred analytics:`, e);
    }
  }
}

export const analyticsWorker = new AnalyticsWorker();
