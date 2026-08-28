import { redisClient } from '../../infrastructure/redis';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '../../core/logger';


const NOTIFICATION_QUEUE_NAME = 'notificationQueue';
const db = getFirestore();

interface NotificationJobData {
  tenantId: string;
  title: string;
  body: string;
  visibility: 'global' | 'batch' | 'course' | 'topic' | 'student';
  targetBatchIds?: string[];
  targetCourseIds?: string[];
  targetStudentIds?: string[];
  metadata?: Record<string, string>;
  announcementId?: string;
}

export const setupNotificationWorker = () => {
  // BullMQ requires a real Redis connection which has been removed.
  // Notifications are delivered synchronously via Firestore instead.
  logger.info('[NotificationWorker] Running without BullMQ (in-memory cache mode).');
  return null;
};
