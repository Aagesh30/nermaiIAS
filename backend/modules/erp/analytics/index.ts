import { Router } from "express";
import analyticsRoutes from "./routes";

const router = Router();

/**
 * ==========================================
 * ANALYTICS MODULE
 * Base Route: /api/erp/analytics
 * ==========================================
 */

router.use("/", analyticsRoutes);

export default router;
