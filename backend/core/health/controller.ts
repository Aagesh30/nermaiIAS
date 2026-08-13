import { Request, Response } from 'express';
import { db } from '../../infrastructure/firebase';
import { redisClient } from '../../infrastructure/redis';

export const getLiveness = (req: Request, res: Response) => {
  res.json({
    status: 'alive',
  });
};

export const getReadiness = async (req: Request, res: Response) => {
  let isFirebaseHealthy = false;
  let isRedisHealthy = false;

  // Check Firebase
  try {
    // Attempting a simple listCollections call or a basic read
    // For firestore, we can just do a very lightweight operation like listing collections or checking a dummy document.
    // However, just getting a reference to a collection is not an async operation. Let's do a dummy read.
    await db.collection('system_health').doc('ping').get();
    isFirebaseHealthy = true;
  } catch (error) {
    isFirebaseHealthy = false;
  }

  // Check Redis
  try {
    if (redisClient) {
      await redisClient.ping();
      isRedisHealthy = true;
    } else {
      isRedisHealthy = false; // Redis is disabled/uninitialized
    }
  } catch (error) {
    isRedisHealthy = false;
  }

  const isHealthy = isFirebaseHealthy && isRedisHealthy;

  if (isHealthy) {
    res.json({
      status: 'ready',
      firebase: 'up',
      redis: 'up',
    });
  } else {
    res.status(503).json({
      status: 'degraded',
      firebase: isFirebaseHealthy ? 'up' : 'down',
      redis: isRedisHealthy ? 'up' : 'down',
    });
  }
};
