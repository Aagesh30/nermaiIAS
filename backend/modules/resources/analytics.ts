import { defaultQueue } from '../../infrastructure/queue';
import { logger } from '../../core/logger';

export const logResourceOpen = async (resourceId: string, userId: string, tenantId: string) => {
  try {
    // We push to the BullMQ queue rather than writing to Firestore immediately.
    // A worker will consume this and increment the "openedCount" and log "lastRead" 
    // asynchronously to save Firestore bandwidth and prevent blocking the UI.
    await defaultQueue.add('resource_opened', {
      resourceId,
      userId,
      tenantId,
      timestamp: new Date().toISOString()
    });
    
    logger.debug(`[Analytics] Queued resource_opened event for ${resourceId} by ${userId}`);
  } catch (error) {
    logger.error('Failed to queue resource analytics event:', error);
  }
};
