import { Router } from "express";
import studentDashboardRoutes from "./routes";

const router = Router();

/**
 * ==========================================
 * STUDENT DASHBOARD MODULE
 * Base Route: /api/dashboard/student
 * ==========================================
 */

router.use("/", studentDashboardRoutes);

export default router;
