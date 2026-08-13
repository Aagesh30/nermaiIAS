import { Router } from "express";
import { DailyQuizController } from "./controller";

const router = Router();

/**
 * ==========================================
 * DAILY QUIZ / LMS QUIZ ROUTES
 * Base Route: /api/lms/daily-quiz
 * ==========================================
 */

// Create new quiz (Admin/Staff)
router.post("/", DailyQuizController.createOrUpdateQuiz);

// Get ALL active quizzes (LMS page - all visible)
router.get("/all", DailyQuizController.getAllQuizzes);

// Monthly archive
router.get("/archive", DailyQuizController.getMonthlyArchive);

// Get today's/next pending quiz (Dashboard - one at a time)
router.get("/today", DailyQuizController.getTodayQuiz);

// Submit quiz answer
router.post("/submit", DailyQuizController.submitQuizAnswer);

// Get student's quiz history
router.get("/history/:studentId", DailyQuizController.getStudentHistory);

// Get specific quiz by ID
router.get("/:quizId", DailyQuizController.getQuiz);

// Delete daily quiz
router.delete("/:quizId", DailyQuizController.deleteQuiz);

export default router;
