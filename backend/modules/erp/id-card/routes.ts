import { Router } from "express";
import { IDCardController } from "./controller";
import { requireAuth, requireRole } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * ==========================================
 * ID CARD ROUTES
 * Base Route: /api/erp/id-card
 * SECURITY: Requires auth + admin/staff role.
 * ==========================================
 */
const adminRoles = ['super_admin', 'admin', 'staff'];

router.use(requireAuth);
router.use(requireRole(adminRoles));

router.post("/", IDCardController.generate);
router.get("/", IDCardController.getAll);
router.get("/user/:userId", IDCardController.getByUser);

export default router;
