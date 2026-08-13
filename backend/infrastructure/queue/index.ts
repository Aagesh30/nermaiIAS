// @ts-nocheck
import { Queue, Worker, QueueEvents } from 'bullmq';
import { rawRedisClient } from '../redis';
import { logger } from '../../core/logger';
import { env } from '../../config/env';

const QUEUE_NAME = 'defaultQueue';
const NOTIFICATION_QUEUE_NAME = 'notificationQueue';

// In development, if Redis is not explicitly required and connection fails, BullMQ will crash the app.
// We export mock Queues that just log to console when added.

class MockQueue {
  constructor(public name: string) {}
  async add(name: string, data: any, opts: any) {
    logger.info(`[MockQueue ${this.name}] Added job ${name}: ${JSON.stringify(data)}`);
    return { id: 'mock-id' };
  }
}

export const defaultQueue = env.REDIS_REQUIRED 
  ? new Queue(QUEUE_NAME, { 
      // @ts-expect-error - bullmq typing mismatch with ioredis
      connection: rawRedisClient 
    }) 
  : new MockQueue(QUEUE_NAME) as any;

export const notificationQueue = env.REDIS_REQUIRED 
  ? new Queue('notifications', { 
      // @ts-expect-error - bullmq typing mismatch with ioredis
      connection: rawRedisClient 
    }) 
  : new MockQueue('notifications') as any;

export const analyticsQueue = env.REDIS_REQUIRED 
  ? new Queue('analytics', { 
      // @ts-expect-error - bullmq typing mismatch with ioredis
      connection: rawRedisClient 
    }) 
  : new MockQueue('analytics') as any;

export const defaultQueueEvents = env.REDIS_REQUIRED 
  ? new QueueEvents(QUEUE_NAME, { connection: rawRedisClient as any }) 
  : null as any;

export const notificationQueueEvents = env.REDIS_REQUIRED 
  ? new QueueEvents(NOTIFICATION_QUEUE_NAME, { connection: rawRedisClient as any }) 
  : null as any;

// Example worker setup
export const setupWorkers = () => {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      logger.info(`Processing job ${job.id}`);
    },
    { 
      // @ts-expect-error - bullmq typing mismatch with ioredis
      connection: rawRedisClient 
    }
  );

  return worker;
};

