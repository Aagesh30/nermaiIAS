import { Router } from 'express';
import { requireAuth, requireRole } from '../../core/middleware/auth.middleware';
import * as ctrl from './controller';

const router = Router();

const adminRoles = ['super_admin', 'admin'];

// ── Student routes ────────────────────────────────────────────────────────────
router.post('/join', requireAuth, ctrl.recordJoin);
router.post('/submit', requireAuth, ctrl.submitAttendance);
router.get('/my', requireAuth, ctrl.getMyAttendance);
router.get('/class/:classId', requireAuth, ctrl.getClassAttendance);
router.post('/:id/request-correction', requireAuth, ctrl.requestCorrection);

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get('/admin/records', requireAuth, requireRole(adminRoles), ctrl.adminListRecords);
router.patch('/admin/:id/mark', requireAuth, requireRole(adminRoles), ctrl.adminManualMark);
router.get('/admin/corrections', requireAuth, requireRole(adminRoles), ctrl.adminListCorrections);
router.patch('/admin/corrections/:id', requireAuth, requireRole(adminRoles), ctrl.adminReviewCorrection);
router.post('/admin/class/:classId/close', requireAuth, requireRole(adminRoles), ctrl.adminCloseClassAttendance);
router.get('/admin/class/:classId/summary', requireAuth, requireRole(adminRoles), ctrl.adminGetClassSummary);

export default router;
