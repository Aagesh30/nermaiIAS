import { Router } from "express";
import { EvaluationController } from "./controller";
import { requireAuth, requireRole, requireAuthOrAttemptId } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * ==========================================
 * EVALUATION ROUTES
 * Base Route: /api/test-portal/evaluation
 * SECURITY:
 *   - All routes require authentication.
 *   - Privileged operations (recalculate, delete) require admin/staff role.
 *   - The /evaluate endpoint uses requireAuthOrAttemptId so it works even
 *     if the student's JWT session expired during the exam.
 *   - Student result reads are allowed for authenticated users (ownership enforced in controller).
 * ==========================================
 */

const adminRoles = ['super_admin', 'admin', 'staff'];

/**
 * Evaluate a submitted attempt — bypass allowed so student can always trigger
 * evaluation even if their JWT session expired at the end of the exam.
 */
router.post("/evaluate/:attemptId", requireAuthOrAttemptId, EvaluationController.evaluateAttempt);

/**
 * Get evaluation result (authenticated — ownership enforced in controller)
 */
router.get("/result/:attemptId", requireAuth, EvaluationController.getResult);

/**
 * Get student result by test (authenticated — ownership or admin enforced in controller)
 */
router.get("/student/:studentId/test/:testId", requireAuth, EvaluationController.getStudentResult);

/**
 * Get all results of a student (authenticated — ownership or admin enforced in controller)
 */
router.get("/student/:studentId", requireAuth, EvaluationController.getStudentAllResults);

/**
 * Get all results of a test (authenticated)
 */
router.get("/test/:testId", requireAuth, EvaluationController.getTestResults);

/**
 * Recalculate result (admin/staff only)
 */
router.post("/recalculate/:attemptId", requireRole(adminRoles), EvaluationController.recalculateResult);

/**
 * Delete Result (admin only)
 */
router.delete("/result/:resultId", requireRole(['super_admin', 'admin']), EvaluationController.deleteResult);

export default router;