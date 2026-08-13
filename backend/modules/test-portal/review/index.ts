import { Router } from "express";
import reviewRoutes from "./routes";

const router = Router();

/**
 * ==========================================
 * REVIEW MODULE
 *
 * Base Route:
 * /api/test-portal/review
 * ==========================================
 */

router.use("/", reviewRoutes);

export default router;