import { Router } from "express";
import staffRoutes from "./routes";

const router = Router();

/**
 * ==========================================
 * STAFF MODULE
 * Base Route: /api/erp/staff
 * ==========================================
 */

router.use("/", staffRoutes);

export default router;
