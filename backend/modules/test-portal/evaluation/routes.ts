import { Router } from "express";
import { EvaluationController } from "./controller";
import { requireAuth, requireRole } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * ==========================================
 * EVALUATION ROUTES
 * Base Route: /api/test-portal/evaluation
 * SECURITY:
 *   - All routes require authentication.
 *   - Privileged operations (evaluate, recalculate, delete) require admin/staff role.
 *   - Student result reads are allowed for authenticated users (ownership enforced in controller).
 * ==========================================
 */

const adminRoles = ['super_admin', 'admin', 'staff'];

// All routes require auth
router.use(requireAuth);

/**
 * Evaluate a submitted attempt (admin/staff only)
 */
router.post("/evaluate/:attemptId", requireRole(adminRoles), EvaluationController.evaluateAttempt);

/**
 * Get evaluation result (authenticated — ownership enforced in controller)
 */
router.get("/result/:attemptId", EvaluationController.getResult);

/**
 * Get student result by test (authenticated — ownership or admin enforced in controller)
 */
router.get("/student/:studentId/test/:testId", EvaluationController.getStudentResult);

/**
 * Get all results of a student (authenticated — ownership or admin enforced in controller)
 */
router.get("/student/:studentId", EvaluationController.getStudentAllResults);

/**
 * Get all results of a test (admin/staff only)
 */
router.get("/test/:testId", requireRole(adminRoles), EvaluationController.getTestResults);

/**
 * Recalculate result (admin/staff only)
 */
router.post("/recalculate/:attemptId", requireRole(adminRoles), EvaluationController.recalculateResult);

/**
 * Delete Result (admin only)
 */
router.delete("/result/:resultId", requireRole(['super_admin', 'admin']), EvaluationController.deleteResult);

export default router;