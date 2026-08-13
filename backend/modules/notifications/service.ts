import { notificationQueue } from '../../infrastructure/queue';

interface NotificationPayload {
  tenantId: string;
  title: string;
  body: string;
  visibility: 'global' | 'batch' | 'course' | 'topic' | 'student';
  targetBatchIds?: string[];
  targetCourseIds?: string[];
  targetStudentIds?: string[];
  metadata?: Record<string, string>;
  announcementId?: string;
  publishAt?: Date; // Optional scheduled time
}

export class NotificationService {
  async dispatchNotification(payload: NotificationPayload) {
    const delay = payload.publishAt ? Math.max(0, payload.publishAt.getTime() - Date.now()) : 0;
    
    await notificationQueue.add(
      'send-push',
      payload,
      {
        delay, // BullMQ automatically schedules it if delay > 0
        removeOnComplete: true,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );
  }
}
