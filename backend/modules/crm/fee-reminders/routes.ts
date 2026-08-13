import { Router } from "express";
import { FeeRemindersController } from "./controller";
import { requireAuth, requireRole } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * ==========================================
 * FEE REMINDERS ROUTES
 * Base Route: /api/crm/fee-reminders
 * SECURITY: Requires auth + admin/staff role.
 * ==========================================
 */
const adminRoles = ['super_admin', 'admin', 'staff'];

router.use(requireAuth);
router.use(requireRole(adminRoles));

router.post("/", FeeRemindersController.create);
router.get("/", FeeRemindersController.getAll);

export default router;
