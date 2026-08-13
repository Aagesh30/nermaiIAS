import { Router } from 'express';
import { requireAuth, requireRole } from '../../core/middleware/auth.middleware';
import { commentRateLimiter } from '../../core/middleware/rateLimiter';
import * as CommentsController from './controller';

export const liveCommentsRoutes = Router();

// Require SAPE/Auth for all live-comments routes
liveCommentsRoutes.use(requireAuth);

// ─── SHARED (Students & Staff) ────────────────────────────────────────────────
// Everyone can create comments, reply, and react
liveCommentsRoutes.get('/:liveSessionId', CommentsController.getComments);
liveCommentsRoutes.post('/', commentRateLimiter, CommentsController.createComment);
liveCommentsRoutes.post('/:id/reply', commentRateLimiter, CommentsController.addReply);
liveCommentsRoutes.post('/:id/react', CommentsController.toggleReaction);


// ─── ADMIN / STAFF ONLY ───────────────────────────────────────────────────────
const adminRouter = Router();
adminRouter.use(requireRole(['super_admin', 'admin', 'staff', 'teacher']));

adminRouter.put('/:id/status', CommentsController.updateStatus);
adminRouter.put('/:id/pin', CommentsController.togglePin);
adminRouter.put('/:id/hide', CommentsController.setHidden);
adminRouter.delete('/:id', CommentsController.deleteComment);
adminRouter.delete('/reply/:id', CommentsController.deleteReply);

liveCommentsRoutes.use('/admin', adminRouter);
