import { Router } from "express";
import campaignsRoutes from "./routes";

const router = Router();

/**
 * ==========================================
 * CAMPAIGNS MODULE
 * Base Route: /api/crm/campaigns
 * ==========================================
 */

router.use("/", campaignsRoutes);

export default router;
