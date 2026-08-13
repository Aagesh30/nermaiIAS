import { Worker } from 'bullmq';
import { redisClient, rawRedisClient } from '../../infrastructure/redis';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '../../core/logger';
import { env } from '../../config/env';

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
  if (!env.REDIS_REQUIRED) {
    logger.warn('[NotificationWorker] Mocking worker because REDIS_REQUIRED is false');
    return null;
  }

  const worker = new Worker<NotificationJobData>(
    NOTIFICATION_QUEUE_NAME,
    async (job) => {
      const { tenantId, title, body, visibility, targetBatchIds, targetStudentIds, announcementId, metadata } = job.data;
      logger.info(`[NotificationWorker] Processing job ${job.id} for announcement ${announcementId}`);

      try {
        let tokens: string[] = [];

        // If visibility is global, we might want to fetch all active tokens, but for now we fallback to querying the active student profiles
        // To strictly optimize, we should store all tokens in a Redis set `tenant:${tenantId}:tokens`
        // For this MVP, we query Firestore (or Redis keys if we maintained an index). 
        // Here we'll do the Firestore query but pull FCM tokens if they exist.
        
        let query = db.collection('student_profiles')
          .where('tenantId', '==', tenantId)
          .where('status', '==', 'active');
          
        const snapshot = await query.get();
        
        // Parallel lookup from Redis for blazing fast FCM token retrieval
        const pipeline = redisClient.pipeline();
        const userIds = snapshot.docs.map(doc => {
            const data = doc.data();
            let shouldInclude = false;
            if (visibility === 'global') shouldInclude = true;
            else if (visibility === 'student' && targetStudentIds) {
              if (targetStudentIds.includes(doc.id)) shouldInclude = true;
            }
            else if (visibility === 'batch' && targetBatchIds) {
              const studentBatches = (data.programMemberships || []).map((pm: any) => pm.batchId);
              if (targetBatchIds.some(id => studentBatches.includes(id))) {
                shouldInclude = true;
              }
            }
            return shouldInclude ? doc.id : null;
        }).filter(Boolean);

        for (const uid of userIds) {
            pipeline.get(`fcm:${tenantId}:${uid}`);
        }

        const results = await pipeline.exec();
        // results is an array of [error, value]
        if (results) {
            tokens = results.map((r: [Error | null, any]) => r[1] as string).filter(Boolean);
        }

        if (tokens.length === 0) {
            logger.info(`[NotificationWorker] No valid FCM tokens found for job ${job.id}`);
            return;
        }

        // Firebase Multicast limits to 500 tokens
        const messages = [];
        const MAX_TOKENS = 500;
        
        for (let i = 0; i < tokens.length; i += MAX_TOKENS) {
          const chunk = tokens.slice(i, i + MAX_TOKENS);
          messages.push(getMessaging().sendEachForMulticast({
            tokens: chunk,
            notification: {
              title: title,
              body: body,
            },
            data: metadata || {}
          }));
        }

        const fcmResults = await Promise.all(messages);
        let successCount = fcmResults.reduce((acc, result) => acc + result.successCount, 0);
        
        logger.info(`[NotificationWorker] Delivered push notification to ${successCount} devices`);

        // If it was tied to an announcement, update the delivery count
        if (announcementId) {
            await db.collection('announcements').doc(announcementId).update({
                pushDelivered: true,
                pushDeliveryCount: successCount
            });
        }
      } catch (err) {
        logger.error(`[NotificationWorker] Failed job ${job.id}`, err);
        throw err;
      }
    },
    // @ts-expect-error - bullmq typing mismatch
    { connection: redisClient }
  );

  return worker;
};
