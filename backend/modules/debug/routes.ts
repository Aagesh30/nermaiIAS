import { Router } from 'express';
import { simulateRedisCrash, simulateFirebaseDelay, simulateError } from './controller';
import { env } from '../../config/env';

export const debugRoutes = Router();

// Only register these in non-production environments
if (env.NODE_ENV !== 'production') {
  debugRoutes.post('/fault/redis-crash', simulateRedisCrash);
  debugRoutes.post('/fault/firebase-delay', simulateFirebaseDelay);
  debugRoutes.post('/fault/error', simulateError);
}
