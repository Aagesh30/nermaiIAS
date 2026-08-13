import { Router } from "express";
import { AlumniFeedbackController } from "./controller";
import { requireAuth, requireRole } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * ==========================================
 * ALUMNI FEEDBACK ROUTES
 * Base Route: /api/crm/alumni-feedback
 * SECURITY:
 *   - Submit (POST): authenticated users (authenticated alumni/students)
 *   - Get all (GET): admin/staff only
 * ==========================================
 */

// Submit feedback: require auth (authenticated alumni)
router.post("/", requireAuth, AlumniFeedbackController.create);

// View all feedback: admin/staff only
router.get("/", requireAuth, requireRole(['super_admin', 'admin', 'staff']), AlumniFeedbackController.getAll);

export default router;
