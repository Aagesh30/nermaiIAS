import { Router } from "express";
import studentRoutes from "./routes";

const router = Router();

/**
 * ==========================================
 * STUDENT MODULE
 *
 * Base Route:
 * /api/erp/student
 * ==========================================
 */

router.use("/", studentRoutes);

export default router;
