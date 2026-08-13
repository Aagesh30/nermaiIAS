import { Router } from "express";
import { AdminDashboardController } from "./controller";

const router = Router();

/**
 * ==========================================
 * ADMIN DASHBOARD ROUTES
 * Base Route: /api/dashboard/admin
 * ==========================================
 */

router.get("/overview", AdminDashboardController.getOverview);
router.get("/quick-stats", AdminDashboardController.getQuickStats);

export default router;
