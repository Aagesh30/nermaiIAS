import { Router } from "express";
import { AdmissionController } from "./controller";
import { requireAuth, requireRole } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * ==========================================
 * ADMISSION ROUTES
 * Base Route: /api/crm/admission
 * SECURITY: All routes require auth + admin/staff role.
 * ==========================================
 */
const adminRoles = ['super_admin', 'admin', 'staff'];

router.use(requireAuth);
router.use(requireRole(adminRoles));

router.post("/", AdmissionController.create);
router.get("/", AdmissionController.getAll);
router.patch("/:id", AdmissionController.updateStatus);
router.delete("/:id", AdmissionController.delete);

export default router;
