import { Router } from "express";
import evaluationRoutes from "./routes";

const router = Router();

/**
 * ==========================================
 * EVALUATION MODULE
 *
 * Base Route:
 * /api/test-portal/evaluation
 * ==========================================
 */

router.use("/", evaluationRoutes);

export default router;