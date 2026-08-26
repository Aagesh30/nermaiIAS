import { Router } from 'express';
import deviceAlertsRoutes from './routes';

const router = Router();

/**
 * ==========================================
 * DEVICE ALERTS MODULE
 * Base Route: /api/erp/device-alerts
 *
 * Provides ERP admins visibility into logins
 * that occurred from new/unknown devices.
 * ==========================================
 */

router.use('/', deviceAlertsRoutes);

export default router;
