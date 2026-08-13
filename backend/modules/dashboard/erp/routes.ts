import { Router } from "express";
import { ERPDashboardController } from "./controller";

const router = Router();

/**
 * ==========================================
 * ERP DASHBOARD ROUTES
 * Base Route: /api/dashboard/erp
 * ==========================================
 */

router.get("/overview", ERPDashboardController.getOverview);
router.get("/student-stats", ERPDashboardController.getStudentStats);

export default router;
