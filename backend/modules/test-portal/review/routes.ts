import { Router } from "express";
import { ReviewController } from "./controller";

const router = Router();

/**
 * ==========================================
 * REVIEW ROUTES
 * Base Route:
 * /api/test-portal/review
 * ==========================================
 */

/**
 * Review complete attempt
 */
router.get(
    "/attempt/:attemptId",
    ReviewController.getAttemptReview
);

/**
 * Review a single question
 */
router.get(
    "/attempt/:attemptId/question/:questionId",
    ReviewController.getQuestionReview
);

/**
 * Get correct answers
 */
router.get(
    "/answers/:attemptId",
    ReviewController.getCorrectAnswers
);

/**
 * Get explanations
 */
router.get(
    "/explanations/:attemptId",
    ReviewController.getExplanations
);

/**
 * Topic Analysis
 */
router.get(
    "/analysis/topic/:attemptId",
    ReviewController.getTopicAnalysis
);

/**
 * Difficulty Analysis
 */
router.get(
    "/analysis/difficulty/:attemptId",
    ReviewController.getDifficultyAnalysis
);

/**
 * Student Attempt History
 */
router.get(
    "/history/:studentId",
    ReviewController.getAttemptHistory
);

/**
 * Leaderboard
 */
router.get(
    "/leaderboard/:testId",
    ReviewController.getLeaderboard
);

/**
 * Top Rankers
 */
router.get(
    "/top-rankers/:testId",
    ReviewController.getTopRankers
);

/**
 * Student Analytics
 */
router.get(
    "/analytics/:studentId",
    ReviewController.getStudentAnalytics
);

/**
 * Admin Results Log — all tests with per-student leaderboard
 * Supports ?keyword=&date= query params
 */
router.get(
    "/results/all-tests",
    ReviewController.getAllTestResults
);

export default router;