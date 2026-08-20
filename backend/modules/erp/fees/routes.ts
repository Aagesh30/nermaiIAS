import { Router } from "express";
import { FeesController } from "./controller";
import { requireAuth, requireRole, requirePermission } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * ==========================================
 * FEES ROUTES
 * Base Route: /api/erp/fees
 * SECURITY: Requires auth + admin/staff role.
 * ==========================================
 */
const adminRoles = ['super_admin', 'admin', 'staff'];

router.use(requireAuth);
router.use(requireRole(adminRoles));

// Fee Structure Routes
router.post("/structure", requirePermission("fees_management", "C"), FeesController.createStructure);
router.get("/structures", requirePermission("fees_management", "R"), FeesController.getStructures);

// Fee Assignment Routes
router.post("/assign", requirePermission("fees_management", "C"), FeesController.assignToStudent);
router.get("/student/:studentId", requirePermission("fees_management", "R"), FeesController.getStudentFees);

// Payment Routes
router.post("/payment", requirePermission("fees_management", "C"), FeesController.recordPayment);
router.get("/payments", requirePermission("fees_management", "R"), FeesController.getAllPayments);

export default router;
