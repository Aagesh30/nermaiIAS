import { Router } from "express";
import { BatchController } from "./controller";
import { requireAuth, requireRole } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * BATCH ROUTES
 * Base Route: /api/erp/batch
 * SECURITY: Requires auth + admin/staff role.
 */
const adminRoles = ['super_admin', 'admin', 'staff'];

router.use(requireAuth);
router.use(requireRole(adminRoles));

router.get("/", BatchController.getAll);
router.post("/", BatchController.create);
router.put("/:id", BatchController.update);
router.delete("/:id", BatchController.delete);

export default router;
