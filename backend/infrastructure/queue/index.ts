// @ts-nocheck
import { logger } from '../../core/logger';

const QUEUE_NAME = 'defaultQueue';
const NOTIFICATION_QUEUE_NAME = 'notificationQueue';

// Redis has been removed — BullMQ requires real Redis.
// All queues use MockQueue which logs jobs and no-ops.
// This is equivalent to the prior behaviour when REDIS_REQUIRED=false.

class MockQueue {
  constructor(public name: string) {}
  async add(name: string, data: any, opts?: any) {
    logger.info(`[MockQueue ${this.name}] Added job ${name}: ${JSON.stringify(data)}`);
    return { id: 'mock-id' };
  }
}

export const defaultQueue = new MockQueue(QUEUE_NAME) as any;
export const notificationQueue = new MockQueue('notifications') as any;
export const analyticsQueue = new MockQueue('analytics') as any;

export const defaultQueueEvents = null as any;
export const notificationQueueEvents = null as any;

export const setupWorkers = () => {
  logger.info('[Queue] Workers disabled (in-memory cache mode).');
  return null;
};

