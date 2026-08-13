import { Router } from 'express';
import { AnnouncementController } from './controller';
import { requireAuth, requireRole } from '../../core/middleware/auth.middleware';

const attachAccessContext = (req: any, res: any, next: any) => {
  // Infer batchIds from programMemberships populated by requireAuth
  if (req.user) {
    req.user.accessContext = {
      batchIds: (req.user.programMemberships || []).map((m: any) => m.batchId).filter(Boolean),
      courseIds: []
    };
  }
  next();
};

const router = Router();
const controller = new AnnouncementController();

// Admin Routes
router.post(
  '/admin',
  requireAuth,
  requireRole(['admin', 'superadmin']),
  (req, res, next) => controller.createAnnouncement(req, res).catch(next)
);

router.get(
  '/admin',
  requireAuth,
  requireRole(['admin', 'superadmin']),
  (req, res, next) => controller.listAnnouncements(req, res).catch(next)
);

router.patch(
  '/admin/:id',
  requireAuth,
  requireRole(['admin', 'superadmin']),
  (req, res, next) => controller.updateAnnouncement(req, res).catch(next)
);

router.delete(
  '/admin/:id',
  requireAuth,
  requireRole(['admin', 'superadmin']),
  (req, res, next) => controller.deleteAnnouncement(req, res).catch(next)
);

// Student Routes
router.get(
  '/',
  requireAuth,
  attachAccessContext,
  (req, res, next) => controller.listAnnouncements(req, res).catch(next)
);

export default router;
