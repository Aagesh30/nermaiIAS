import { Router } from "express";
import { StudentDashboardController } from "./controller";

const router = Router();

/**
 * ==========================================
 * STUDENT DASHBOARD ROUTES
 * Base Route: /api/dashboard/student
 * ==========================================
 */

router.get("/overview", StudentDashboardController.getOverview);
router.get("/marks", StudentDashboardController.getMarks);
router.get("/fees", StudentDashboardController.getFeeHistory);

router.get("/:studentId/overview", StudentDashboardController.getOverview);
router.get("/:studentId/marks", StudentDashboardController.getMarks);
router.get("/:studentId/fees", StudentDashboardController.getFeeHistory);

export default router;
