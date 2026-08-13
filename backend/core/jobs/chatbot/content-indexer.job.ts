import { Queue, Worker, Job } from 'bullmq';
import { redisClient } from '../../../infrastructure/redis';
import { db } from '../../../infrastructure/firebase';
import { logger } from '../../logger';
import { extractKeywords } from '../../services/chatbot/keywordSearch.util';
import { env } from '../../../config/env';

const isFirebaseDeploy = 
  !!process.env.GOOGLE_FUNCTION_TARGET ||
  !!process.env.FIREBASE_CONFIG ||
  process.argv.some(arg => arg.includes('firebase') || arg.includes('functions-framework') || arg.includes('deploy'));

class MockQueue {
  constructor(public name: string) {}
  async add(name: string, data: any, opts: any) {
    logger.info(`[MockQueue ${this.name}] Added job ${name}: ${JSON.stringify(data)}`);
    return { id: 'mock-id' };
  }
}

export const contentIndexerQueue = (env.REDIS_REQUIRED && !isFirebaseDeploy)
  ? new Queue('content-indexer', { connection: redisClient as any })
  : new MockQueue('content-indexer') as any;

interface IndexPayload {
  sourceType: string;
  sourceId: string;
  fullText: string;
}

export const contentIndexerWorker = (env.REDIS_REQUIRED && !isFirebaseDeploy)
  ? new Worker('content-indexer', async (job: Job<IndexPayload>) => {
      try {
        const { sourceType, sourceId, fullText } = job.data;
        
        // Chunking logic (simple split by sentences or paragraphs for now)
        const chunks = fullText.match(/[^\.!\?]+[\.!\?]+/g) || [fullText];
        const maxChunks = chunks.slice(0, 5); // Take first 5 chunks to keep small

        const batch = db.batch();
        const embeddingsRef = db.collection('chatbot_embeddings');

        // Delete old embeddings for this source
        const oldDocs = await embeddingsRef.where('sourceId', '==', sourceId).get();
        oldDocs.forEach((doc: any) => {
          batch.delete(doc.ref);
        });

        // Create new chunks
        maxChunks.forEach(chunkText => {
          const keywords = extractKeywords(chunkText);
          if (keywords.length > 0) {
            const docRef = embeddingsRef.doc();
            batch.set(docRef, {
              sourceType,
              sourceId,
              chunkText: chunkText.trim(),
              keywords,
              updatedAt: new Date().toISOString()
            });
          }
        });

        await batch.commit();
        logger.info(`Successfully indexed content for ${sourceType} ${sourceId}`);
        
        // Invalidate embeddings cache
        await redisClient.del('chatbot:idx:embeddings');

      } catch (error) {
        logger.error('Failed to index content', error);
      }
    }, { connection: redisClient as any })
  : null;
