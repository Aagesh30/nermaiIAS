import { Router } from "express";
import adminDashboardRoutes from "./routes";

const router = Router();

/**
 * ==========================================
 * ADMIN DASHBOARD MODULE
 * Base Route: /api/dashboard/admin
 * ==========================================
 */

router.use("/", adminDashboardRoutes);

export default router;
