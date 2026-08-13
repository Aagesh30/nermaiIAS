import cron from 'node-cron';
import { db } from '../infrastructure/firebase';
import { attendanceService } from '../modules/attendance/service';

export class LiveSyncService {
  private static instance: LiveSyncService;
  private isPolling = false;

  private constructor() {}

  public static getInstance(): LiveSyncService {
    if (!LiveSyncService.instance) {
      LiveSyncService.instance = new LiveSyncService();
    }
    return LiveSyncService.instance;
  }

  public init() {
    // Run every minute
    cron.schedule('* * * * *', () => {
      this.pollLiveStatuses();
    });
    console.log('[LiveSyncService] Cron job initialized for Live Class tracking.');
  }

  private async pollLiveStatuses() {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      // Find all scheduled and live classes
      const snapshot = await db.collection('classes')
        .where('classType', 'in', ['youtube_live', 'zoom_live'])
        .where('isDeleted', '==', false)
        .get();

      const activeClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }))
        .filter(c => !c.status || c.status === 'UPCOMING' || c.status === 'LIVE');

      for (const cls of activeClasses) {
        try {
          await this.syncClassStatus(cls);
        } catch (err) {
          console.error(`[LiveSyncService] Failed to sync status for class ${cls.id}:`, err);
        }
      }
    } catch (err) {
      console.error('[LiveSyncService] Polling error:', err);
    } finally {
      this.isPolling = false;
    }
  }

  private async syncClassStatus(cls: any) {
    let newStatus = cls.status || 'UPCOMING';
    const currentStatus = cls.status || 'UPCOMING';
    const now = new Date().getTime();
    const scheduledTime = cls.scheduledStartTime ? new Date(cls.scheduledStartTime).getTime() : 0;
    
    let actualStartTime = cls.actualStartTime;
    let actualEndTime = cls.actualEndTime;

    // --- Mock Integration Fallback for Local Development ---
    // In a real environment, we would use Zoom Server-to-Server OAuth or YouTube Data API here.
    // Because we are on localhost and may not have keys, we simulate the live events based on time.

    // Both Zoom and YouTube behave identically for simulation purposes here.
    if (cls.classType === 'zoom_live' || cls.classType === 'youtube_live') {
      if (currentStatus === 'UPCOMING' && now >= scheduledTime && scheduledTime > 0) {
        // Simulate teacher starting the meeting right on time
        console.log(`[LiveSyncService] Class ${cls.id} has started (Simulated). Status -> LIVE`);
        newStatus = 'LIVE';
        actualStartTime = new Date().toISOString();
      } else if (currentStatus === 'LIVE' && now >= scheduledTime + (2.5 * 60 * 60 * 1000)) {
        // Simulate meeting ending exactly 2.5 hours after scheduled time
        console.log(`[LiveSyncService] Class ${cls.id} has ended (Simulated). Status -> ENDED`);
        newStatus = 'ENDED';
        actualEndTime = new Date().toISOString();
      }
    }

    if (newStatus !== currentStatus) {
      const updatePayload: any = {
        status: newStatus,
        updatedAt: new Date().toISOString()
      };
      
      if (actualStartTime && !cls.actualStartTime) {
        updatePayload.actualStartTime = actualStartTime;
      }
      if (actualEndTime && !cls.actualEndTime) {
        updatePayload.actualEndTime = actualEndTime;
      }

      await db.collection('classes').doc(cls.id).update(updatePayload);

      // --- Trigger Attendance Reconciliation when ENDED ---
      if (newStatus === 'ENDED' && updatePayload.actualEndTime && cls.actualStartTime) {
        const start = new Date(cls.actualStartTime).getTime();
        const end = new Date(updatePayload.actualEndTime).getTime();
        const durationSeconds = Math.floor((end - start) / 1000);
        
        if (durationSeconds > 0) {
          console.log(`[LiveSyncService] Triggering Attendance Reconciliation for ${cls.id} (Duration: ${durationSeconds}s)`);
          // Fire and forget
          attendanceService.finalizeClassAttendance(cls.id).catch((err: any) => {
            console.error(`[LiveSyncService] Attendance reconciliation failed for ${cls.id}:`, err);
          });
        }
      }
    }
  }
}

export const liveSyncService = LiveSyncService.getInstance();
