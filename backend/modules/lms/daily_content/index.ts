import { Router } from "express";
import dailyContentRoutes from "./routes";

const router = Router();

/**
 * ==========================================
 * DAILY CONTENT MODULE
 * Base Route: /api/lms/daily-content
 * ==========================================
 */

router.use("/", dailyContentRoutes);

export default router;
