import { Router } from 'express';
import { requireAuth, requireRole } from '../../core/middleware/auth.middleware';
import * as ctrl from './controller';

const router = Router();

// ─── Student Routes ──────────────────────────────────────────────────────────
router.post('/', requireAuth, ctrl.createRequest);
router.get('/my-requests', requireAuth, ctrl.getMyRequests);

// ─── Admin Routes ────────────────────────────────────────────────────────────
const adminRoles = ['super_admin', 'admin', 'staff'];
router.get('/admin/pending', requireAuth, requireRole(adminRoles), ctrl.listPendingRequests);
router.post('/admin/bulk-approve', requireAuth, requireRole(adminRoles), ctrl.bulkApprove);
router.post('/admin/:requestId/approve', requireAuth, requireRole(adminRoles), ctrl.approveRequest);
router.post('/admin/:requestId/reject', requireAuth, requireRole(adminRoles), ctrl.rejectRequest);

// Temporary Grant management
router.get('/admin/temporary-grants', requireAuth, requireRole(adminRoles), ctrl.listTemporaryGrants);
router.post('/admin/grants/:grantId/extend', requireAuth, requireRole(adminRoles), ctrl.extendGrant);
router.post('/admin/grants/:grantId/revoke', requireAuth, requireRole(adminRoles), ctrl.revokeGrant);

// Analytics
router.get('/admin/analytics', requireAuth, requireRole(adminRoles), ctrl.getAnalytics);
router.post('/admin/export', requireAuth, requireRole(adminRoles), ctrl.exportAnalytics);

// History (Approved + Rejected)
router.get('/admin/history', requireAuth, requireRole(adminRoles), ctrl.listHistory);

// Permanent Grants
router.get('/admin/permanent-grants', requireAuth, requireRole(adminRoles), ctrl.listPermanentGrants);

// Grant Type Conversion
router.post('/admin/grants/:grantId/convert', requireAuth, requireRole(adminRoles), ctrl.convertGrant);

export default router;
