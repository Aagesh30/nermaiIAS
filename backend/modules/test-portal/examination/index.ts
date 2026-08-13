import { Router } from "express";
import examinationRoutes from "./routes";

const router = Router();

/**
 * ==========================================
 * EXAMINATION MODULE
 *
 * Base Route:
 * /api/test-portal/examination
 * ==========================================
 */

router.use("/", examinationRoutes);

export default router;