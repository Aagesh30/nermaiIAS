import { Router } from 'express';
import { requireAuth, requireRole } from '../../../core/middleware/auth.middleware';
import {
  listDeviceAlerts,
  acknowledgeAlert,
  deleteAlert,
  getUnacknowledgedCount,
} from './controller';

const router = Router();

// All device alert routes require authentication + admin/staff role
const adminRoles = ['super_admin', 'admin', 'developer', 'staff'];
router.use(requireAuth);
router.use(requireRole(adminRoles));

// GET /api/erp/device-alerts — list alerts
router.get('/', listDeviceAlerts);

// GET /api/erp/device-alerts/count — unacknowledged count
router.get('/count', getUnacknowledgedCount);

// PUT /api/erp/device-alerts/:id/acknowledge — acknowledge an alert
router.put('/:id/acknowledge', acknowledgeAlert);

// DELETE /api/erp/device-alerts/:id — delete/dismiss an alert
router.delete('/:id', deleteAlert);

export default router;
