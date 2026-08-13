import { Router } from "express";
import idCardRoutes from "./routes";

const router = Router();

/**
 * ==========================================
 * ID CARD MODULE
 * Base Route: /api/erp/id-card
 * ==========================================
 */

router.use("/", idCardRoutes);

export default router;
