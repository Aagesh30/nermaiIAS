import { Router } from "express";
import erpDashboardRoutes from "./routes";

const router = Router();

/**
 * ==========================================
 * ERP DASHBOARD MODULE
 * Base Route: /api/dashboard/erp
 * ==========================================
 */

router.use("/", erpDashboardRoutes);

export default router;
