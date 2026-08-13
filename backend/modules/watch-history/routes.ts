import { Router } from 'express';
import { requirePlayerJwt } from '../../core/middleware/auth.middleware';
import * as WatchHistoryController from './controller';

export const watchHistoryRoutes = Router();

watchHistoryRoutes.use(requirePlayerJwt);

watchHistoryRoutes.post('/:id/progress', WatchHistoryController.updateProgress);
watchHistoryRoutes.get('/:id/progress', WatchHistoryController.getProgress);
