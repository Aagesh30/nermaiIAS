import { Router } from 'express';
import { requireAuth, requireRole } from '../../core/middleware/auth.middleware';
import * as ContentFilteringController from './controller';

export const contentFilteringRoutes = Router();

contentFilteringRoutes.use(requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher']));

contentFilteringRoutes.post('/attach', ContentFilteringController.attachRule);
contentFilteringRoutes.post('/bulk-attach', ContentFilteringController.bulkAttachRules);
contentFilteringRoutes.delete('/detach/:ruleId', ContentFilteringController.detachRule);
contentFilteringRoutes.get('/:entityType/:entityId', ContentFilteringController.listRules);
