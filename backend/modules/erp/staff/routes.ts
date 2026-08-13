import { Router } from "express";
import { StaffController } from "./controller";
import { requireAuth, requireRole } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * ==========================================
 * STAFF ROUTES
 * Base Route: /api/erp/staff
 * SECURITY: Requires auth + admin role.
 * ==========================================
 */
const adminRoles = ['super_admin', 'admin'];

router.use(requireAuth);
router.use(requireRole(adminRoles));

router.get("/", StaffController.getAll);
router.get("/:id", StaffController.getOne);
router.post("/", StaffController.create);
router.put("/:id", StaffController.update);
router.delete("/:id", StaffController.delete);

export default router;
