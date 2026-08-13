import { Request, Response } from 'express';
import { redisClient } from '../../infrastructure/redis';
import { logger } from '../../core/logger';

export const simulateRedisCrash = async (req: Request, res: Response) => {
  logger.warn('Fault Simulation: Simulating Redis Crash...');
  if (redisClient) {
    // Force disconnect without emitting clean quit
    redisClient.disconnect();
    res.json({ message: 'Redis disconnected forcefully.' });
  } else {
    res.json({ message: 'Redis is not enabled.' });
  }
};

export const simulateFirebaseDelay = async (req: Request, res: Response) => {
  logger.warn('Fault Simulation: Simulating Firebase Network Delay (5000ms)...');
  const delayMs = Math.min(parseInt(req.query.ms as string) || 5000, 5000);
  
  await new Promise(resolve => setTimeout(resolve, delayMs));
  
  res.json({ message: `Simulated Firebase latency of ${delayMs}ms.` });
};

export const simulateError = async (req: Request, res: Response) => {
  logger.error('Fault Simulation: Throwing unhandled exception');
  throw new Error('Simulated Unhandled Exception for observability testing');
};
