import cron from 'node-cron';
import { db } from '../infrastructure/firebase';
import { logger } from '../core/logger';

export class AccessCleanupService {
  private static instance: AccessCleanupService;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): AccessCleanupService {
    if (!AccessCleanupService.instance) {
      AccessCleanupService.instance = new AccessCleanupService();
    }
    return AccessCleanupService.instance;
  }

  init() {
    if (this.isInitialized) return;

    // Run every day at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
      logger.info('[AccessCleanupService] Running daily access cleanup...');
      await this.cleanupExpiredRequestsAndGrants();
    });

    this.isInitialized = true;
    logger.info('[AccessCleanupService] Cron job initialized for Access Cleanup.');
  }

  private async cleanupExpiredRequestsAndGrants() {
    try {
      const now = new Date();
      
      // 1. Mark expired requests
      const requestsSnap = await db.collection('access_requests')
        .where('status', '==', 'approved')
        .get();

      let expiredCount = 0;
      const batch = db.batch();
      
      for (const doc of requestsSnap.docs) {
        const data = doc.data();
        if (data.grantExpiresAt && new Date(data.grantExpiresAt) <= now) {
          batch.update(doc.ref, { 
            status: 'expired',
            updatedAt: now.toISOString()
          });
          expiredCount++;
        }
      }
      
      if (expiredCount > 0) {
        await batch.commit();
        logger.info(`[AccessCleanupService] Marked ${expiredCount} requests as expired.`);
      }

      // 2. Delete old requests (older than 30 days) to keep DB small and naturally free up quota
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const oldRequestsSnap = await db.collection('access_requests')
        .where('createdAt', '<', thirtyDaysAgo)
        .get();

      let deletedCount = 0;
      const deleteBatch = db.batch();
      for (const doc of oldRequestsSnap.docs) {
        deleteBatch.delete(doc.ref);
        deletedCount++;
        if (deletedCount % 500 === 0) {
          await deleteBatch.commit();
        }
      }
      if (deletedCount % 500 !== 0) {
        await deleteBatch.commit();
      }

      if (deletedCount > 0) {
        logger.info(`[AccessCleanupService] Deleted ${deletedCount} requests older than 30 days.`);
      }
    } catch (e) {
      logger.error('[AccessCleanupService] Failed to run access cleanup:', e);
    }
  }
}
