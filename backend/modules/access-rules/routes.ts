import { Router } from 'express';
import { requireAuth, requireRole } from '../../core/middleware/auth.middleware';
import * as ctrl from './controller';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ─── Admin Routes (/api/v1/access-rules/admin) ────────────────────────────────

const adminRouter = Router();
adminRouter.use(requireRole(['admin', 'teacher']));

// Entity permissions
adminRouter.put('/entity/:type/:id',                              ctrl.setEntityPermission);
adminRouter.get('/entity/:type/:id',                              ctrl.getEffectivePermission);
adminRouter.get('/conflict-check',                                ctrl.detectConflict);
adminRouter.get('/matrix/:courseId',                              ctrl.getPermissionMatrix);
adminRouter.get('/audit/:entityId',                               ctrl.getAuditLog);

// Access requests
adminRouter.get('/requests',                                      ctrl.listAccessRequests);
adminRouter.post('/requests/bulk-approve',                        ctrl.bulkApproveRequests);
adminRouter.post('/requests/:entityId/approve-by-filter',         ctrl.approveByFilter);
adminRouter.post('/requests/:id/approve',                         ctrl.approveRequest);
adminRouter.post('/requests/:id/reject',                          ctrl.rejectRequest);

// Batch capabilities
adminRouter.put('/batches/:batchId/capabilities',                 ctrl.setBatchCapabilities);
adminRouter.get('/batches/:batchId/capabilities',                 ctrl.getBatchCapabilities);

// Templates
adminRouter.get('/templates',                                     ctrl.listTemplates);
adminRouter.post('/templates',                                    ctrl.saveTemplate);
adminRouter.post('/templates/:templateId/apply/:type/:entityId',  ctrl.applyTemplate);

// ─── Student Routes (/api/v1/access-rules/student) ───────────────────────────

const studentRouter = Router();
studentRouter.use(requireRole(['student']));

studentRouter.get('/entity/:type/:id/lock-status',  ctrl.getLockStatus);
studentRouter.post('/entity/:id/request',           ctrl.submitAccessRequest);
studentRouter.get('/requests/my',                   ctrl.getMyAccessRequests);

// Mount sub-routers
router.use('/admin',   adminRouter);
router.use('/student', studentRouter);

export default router;
