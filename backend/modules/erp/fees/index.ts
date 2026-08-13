import { Router } from "express";
import feesRoutes from "./routes";

const router = Router();

/**
 * ==========================================
 * FEES MODULE
 * Base Route: /api/erp/fees
 * ==========================================
 */

router.use("/", feesRoutes);

export default router;
