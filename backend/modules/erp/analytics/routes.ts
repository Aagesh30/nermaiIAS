import { Router } from "express";
import { AnalyticsController } from "./controller";
import { requireAuth, requireRole } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * ==========================================
 * ANALYTICS ROUTES
 * Base Route: /api/erp/analytics
 * SECURITY: Admin analytics requires admin role.
 *           Student analytics requires auth (controller enforces ownership).
 * ==========================================
 */

router.use(requireAuth);

router.get("/admin", requireRole(['super_admin', 'admin', 'staff']), AnalyticsController.getAdminAnalytics);
router.get("/student/:studentId", AnalyticsController.getStudentAnalytics);

export default router;
