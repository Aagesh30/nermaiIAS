import { Router } from "express";
import marksRoutes from "./routes";

const router = Router();

/**
 * ==========================================
 * MARKS MODULE
 * Base Route: /api/erp/marks
 * ==========================================
 */

router.use("/", marksRoutes);

export default router;
