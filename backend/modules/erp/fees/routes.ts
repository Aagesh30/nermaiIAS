import { Router } from "express";
import { FeesController } from "./controller";
import { requireAuth, requireRole } from "../../../core/middleware/auth.middleware";

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
router.post("/structure", FeesController.createStructure);
router.get("/structures", FeesController.getStructures);

// Fee Assignment Routes
router.post("/assign", FeesController.assignToStudent);
router.get("/student/:studentId", FeesController.getStudentFees);

// Payment Routes
router.post("/payment", FeesController.recordPayment);
router.get("/payments", FeesController.getAllPayments);

export default router;
