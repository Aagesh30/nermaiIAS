import { Router } from "express";
import freebiesRoutes from "./routes";

const router = Router();

/**
 * ==========================================
 * FREEBIES MODULE
 * Base Route: /api/crm/freebies
 * ==========================================
 */

router.use("/", freebiesRoutes);

export default router;
