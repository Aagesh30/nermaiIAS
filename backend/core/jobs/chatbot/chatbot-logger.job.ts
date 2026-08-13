import { redisClient } from '../../../infrastructure/redis';
import { db } from '../../../infrastructure/firebase';
import { logger } from '../../logger';

// export const chatbotLoggerQueue = new Queue('chatbot-logger', { connection: redisClient as any });

export const chatbotLoggerQueue = {
  add: async (name: string, payload: any) => {
    logger.info(`Mocked Queue add: ${name}`, payload);
  }
};

interface LogPayload {
  studentId: string;
  query: string;
  response: string;
  intent: string;
  matchedSource: string;
  confidence: number;
  createdAt: string;
}

// export const chatbotLoggerWorker = new Worker('chatbot-logger', async (job: Job<LogPayload>) => {
//   try {
//     const payload = job.data;
//     await db.collection('chatbot_logs').add(payload);
//     logger.info(`Async logged chatbot interaction for student ${payload.studentId}`);
//   } catch (error) {
//     logger.error('Failed to log chatbot interaction', error);
//   }
// }, { connection: redisClient as any });
export const chatbotLoggerWorker = {};
