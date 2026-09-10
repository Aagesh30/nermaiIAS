import { Router } from "express";
import { ExaminationController } from "./controller";
import { requireAuth, requireAuthOrAttemptId } from "../../../core/middleware/auth.middleware";
import { examRateLimit, startTestRateLimit, answerRateLimit } from "../../../core/middleware/rateLimiter";

const router = Router();

// Most routes require standard JWT auth. Exam-write routes use the bypass
// middleware so they work even if the student's session expires mid-exam.

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
router.post("/start/:testId", requireAuth, startTestRateLimit, ExaminationController.startTest);

/**
 * RESUME TEST
 */
router.get("/resume/:attemptId", requireAuth, examRateLimit, ExaminationController.resumeTest);

/**
 * GET TEST QUESTIONS
 */
router.get("/questions/:attemptId", requireAuth, examRateLimit, ExaminationController.getQuestions);

/**
 * SAVE SINGLE ANSWER — bypass allowed so answers are never lost if JWT expires
 */
router.post("/answer/:attemptId", requireAuthOrAttemptId, answerRateLimit, ExaminationController.saveAnswer);

/**
 * AUTO SAVE — bypass allowed so answers are never lost if JWT expires
 */
router.post("/autosave/:attemptId", requireAuthOrAttemptId, answerRateLimit, ExaminationController.autoSave);

/**
 * GET CURRENT PROGRESS
 */
router.get("/progress/:attemptId", requireAuth, examRateLimit, ExaminationController.getProgress);

/**
 * SUBMIT TEST — bypass allowed so submission is never lost if JWT expires
 */
router.post("/submit/:attemptId", requireAuthOrAttemptId, examRateLimit, ExaminationController.submitTest);

/**
 * FOCUS EVENT (TAB SWITCH / BLUR TRACKING)
 */
router.post("/focus-event/:attemptId", requireAuth, answerRateLimit, ExaminationController.recordFocusEvent);

/**
 * GET REMAINING TIME
 */
router.get("/timer/:attemptId", requireAuth, examRateLimit, ExaminationController.getRemainingTime);

/**
 * LIVE VIEWER COUNT (Admin - though requireAuth role checking is done in controller)
 */
router.get("/live-count/:testId", requireAuth, examRateLimit, ExaminationController.getLiveViewerCount);

/**
 * STUDY MODE (Student - read-only past test access)
 */
router.get("/study/:testId", requireAuth, examRateLimit, ExaminationController.studyMode);

/**
 * REPORT WRONG ANSWER / QUESTION ISSUE
 */
router.post("/report-question/:testId", requireAuth, ExaminationController.reportQuestion);

/**
 * GET REPORTS SUMMARY FOR TEST
 */
router.get("/reports/:testId", requireAuth, ExaminationController.getQuestionReports);

/**
 * GET DETAILED REPORTS LOGS FOR TEST
 */
router.get("/reports/detail/:testId", requireAuth, ExaminationController.getDetailedQuestionReports);

export default router;