import { Router } from "express";
import { AdmissionController } from "./controller";
import { requireAuth, requireRole } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * ==========================================
 * ADMISSION ROUTES
 * Base Route: /api/crm/admission
 * SECURITY: POST / (submit form) is public so guests can apply.
 *           All management routes require auth + admin/staff role.
 * ==========================================
 */
const adminRoles = ['super_admin', 'admin', 'staff'];

// Public: guest submission of admission application form
router.post("/", AdmissionController.create);

// Admin-only: manage admissions
router.get("/", requireAuth, requireRole(adminRoles), AdmissionController.getAll);
router.patch("/:id", requireAuth, requireRole(adminRoles), AdmissionController.updateStatus);
router.delete("/:id", requireAuth, requireRole(adminRoles), AdmissionController.delete);

export default router;

