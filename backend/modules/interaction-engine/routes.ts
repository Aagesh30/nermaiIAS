import { Router } from 'express';
import { requireAuth, requireAuthOrQueryToken } from '../../core/middleware/auth.middleware';
import * as InteractionController from './controller';

export const interactionRoutes = Router();

// unified POST endpoint for all interactions
interactionRoutes.post('/', requireAuth, InteractionController.postInteraction);

// SSE connection endpoint for receiving real-time interactions.
// Uses requireAuthOrQueryToken so that browser EventSource can pass token
// via ?token= query parameter (browsers cannot set custom headers on EventSource).
interactionRoutes.get('/stream/:tenantId/:contextType/:contextId', requireAuthOrQueryToken, InteractionController.streamInteractions);
