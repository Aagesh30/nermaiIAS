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

export const contentIndexerQueue = new MockQueue('content-indexer') as any;

interface IndexPayload {
  sourceType: string;
  sourceId: string;
  fullText: string;
}

export const contentIndexerWorker = null;
