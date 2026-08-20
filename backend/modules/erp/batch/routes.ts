import { Router } from "express";
import { BatchController } from "./controller";
import { requireAuth, requireRole, requirePermission } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * BATCH ROUTES
 * Base Route: /api/erp/batch
 * SECURITY: Requires auth + admin/staff role.
 */
const adminRoles = ['super_admin', 'admin', 'staff'];

router.use(requireAuth);
router.use(requireRole(adminRoles));

router.get("/", requirePermission("batch_management", "R"), BatchController.getAll);
router.post("/", requirePermission("batch_management", "C"), BatchController.create);
router.put("/:id", requirePermission("batch_management", "U"), BatchController.update);
router.delete("/:id", requirePermission("batch_management", "D"), BatchController.delete);

export default router;
