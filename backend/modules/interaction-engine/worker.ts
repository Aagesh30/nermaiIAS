import { Worker, Job } from 'bullmq';
import { db } from '../../infrastructure/firebase';
import { redisClient, rawRedisClient } from '../../infrastructure/redis';
import { IInteraction } from './types';
import { logger } from '../../core/logger';
import { interactionEventBus } from './eventBus';

import { env } from '../../config/env';

// In a real application, this would use a proper Queue configuration
const QUEUE_NAME = 'interaction-persistence';

// export const interactionWorker = new Worker(QUEUE_NAME, async (job: Job) => {
//   // This worker handles individual interaction jobs, but we also run a CRON-like 
//   // periodic flush for the Redis List based queue we created in service.ts.
// }, { connection: { url: env.REDIS_URL } as any });

// A specialized function to drain the Redis list `interaction-persistence-queue`
// and batch write to Firestore.
export const startPersistenceDrainer = () => {
  setInterval(async () => {
    try {
      const batchSize = 100;
      // Atomically pop multiple items from the list using a Lua script or simply pop in a loop.
      // For simplicity, we just LPOP in a loop up to batchSize.
      const rawItems: string[] = [];
      for (let i = 0; i < batchSize; i++) {
        const item = await redisClient.lpop('interaction-persistence-queue');
        if (!item) break;
        rawItems.push(item);
      }

      if (rawItems.length === 0) return;

      const firestoreBatch = db.batch();
      const interactionsCollection = db.collection('interactions');

      rawItems.forEach(raw => {
        const interaction = JSON.parse(raw) as IInteraction;
        const docRef = interactionsCollection.doc(interaction.id);
        firestoreBatch.set(docRef, interaction);
        
        // Fire decoupled event bus hooks for future AI modules (e.g. Knowledge Studio)
        // This keeps the Interaction Engine strictly agnostic to AI logic.
        if (interaction.interactionType === 'QUESTION' && interaction.status === 'ANSWERED') {
           interactionEventBus.emitQuestionAnswered(interaction);
        }
        if (interaction.interactionType === 'QUESTION' && interaction.status === 'PINNED') {
           interactionEventBus.emitQuestionPinned(interaction);
        }
      });

      await firestoreBatch.commit();
      logger.info(`[InteractionWorker] Flushed ${rawItems.length} interactions to Firestore.`);
    } catch (error) {
      logger.error(`[InteractionWorker] Error flushing interactions to Firestore:`, error);
    }
  }, 5000);
};
