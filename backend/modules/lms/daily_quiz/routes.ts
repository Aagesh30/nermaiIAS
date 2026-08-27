import { Router } from "express";
import { DailyQuizController } from "./controller";
import { requireAuth, requirePermission } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * ==========================================
 * DAILY QUIZ / LMS QUIZ ROUTES
 * Base Route: /api/lms/daily-quiz
 * ==========================================
 */

// Create new quiz (Admin/Staff)
router.post("/", [requireAuth, requirePermission("lms_quiz_posting", "C")], DailyQuizController.createOrUpdateQuiz);

// Get ALL active quizzes (LMS page - all visible)
router.get("/all", [requireAuth, requirePermission("lms_quiz_posting", "R")], DailyQuizController.getAllQuizzes);

// Monthly archive
router.get("/archive", [requireAuth, requirePermission("lms_quiz_posting", "R")], DailyQuizController.getMonthlyArchive);

// Get today's/next pending quiz (Dashboard - one at a time)
router.get("/today", requireAuth, DailyQuizController.getTodayQuiz);

// Submit quiz answer
router.post("/submit", requireAuth, DailyQuizController.submitQuizAnswer);

// Get student's quiz history
router.get("/history/:studentId", requireAuth, DailyQuizController.getStudentHistory);

// Get specific quiz by ID
router.get("/:quizId", requireAuth, DailyQuizController.getQuiz);

// Delete daily quiz
router.delete("/:quizId", [requireAuth, requirePermission("lms_quiz_posting", "D")], DailyQuizController.deleteQuiz);

export default router;
