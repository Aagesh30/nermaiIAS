import { Router } from "express";
import dailyQuizRoutes from "./routes";

const router = Router();

/**
 * ==========================================
 * DAILY QUIZ MODULE
 * Base Route: /api/lms/daily-quiz
 * ==========================================
 */

router.use("/", dailyQuizRoutes);

export default router;
