import { Router } from "express";
import { ExaminationController } from "./controller";
import { requireAuth } from "../../../core/middleware/auth.middleware";
import { examRateLimit, startTestRateLimit, answerRateLimit } from "../../../core/middleware/rateLimiter";

const router = Router();

// Apply requireAuth globally to all examination routes for security
router.use(requireAuth);

/**
 * ==========================================
 * EXAMINATION ROUTES
 * Base Route:
 * /api/test-portal/examination
 * ==========================================
 */

/**
 * START TEST
 */
router.post("/start/:testId", startTestRateLimit, ExaminationController.startTest);

/**
 * RESUME TEST
 */
router.get("/resume/:attemptId", examRateLimit, ExaminationController.resumeTest);

/**
 * GET TEST QUESTIONS
 */
router.get("/questions/:attemptId", examRateLimit, ExaminationController.getQuestions);

/**
 * SAVE SINGLE ANSWER
 */
router.post("/answer/:attemptId", answerRateLimit, ExaminationController.saveAnswer);

/**
 * AUTO SAVE
 */
router.post("/autosave/:attemptId", answerRateLimit, ExaminationController.autoSave);

/**
 * GET CURRENT PROGRESS
 */
router.get("/progress/:attemptId", examRateLimit, ExaminationController.getProgress);

/**
 * SUBMIT TEST
 */
router.post("/submit/:attemptId", examRateLimit, ExaminationController.submitTest);

/**
 * FOCUS EVENT (TAB SWITCH / BLUR TRACKING)
 */
router.post("/focus-event/:attemptId", answerRateLimit, ExaminationController.recordFocusEvent);

/**
 * GET REMAINING TIME
 */
router.get("/timer/:attemptId", examRateLimit, ExaminationController.getRemainingTime);

/**
 * LIVE VIEWER COUNT (Admin - though requireAuth role checking is done in controller)
 */
router.get("/live-count/:testId", examRateLimit, ExaminationController.getLiveViewerCount);

/**
 * STUDY MODE (Student - read-only past test access)
 */
router.get("/study/:testId", examRateLimit, ExaminationController.studyMode);

/**
 * REPORT WRONG ANSWER / QUESTION ISSUE
 */
router.post("/report-question/:testId", ExaminationController.reportQuestion);

/**
 * GET REPORTS SUMMARY FOR TEST
 */
router.get("/reports/:testId", ExaminationController.getQuestionReports);

export default router;