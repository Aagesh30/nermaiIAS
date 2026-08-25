import { Router } from "express";
import { TestCreationController, OfflineTestRequestController } from "./controller";
import { requireAuth, requireRole } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * ==========================================
 * TEST CREATION ROUTES
 * Base Route: /api/test-portal/test-creation
 * SECURITY:
 *   - Read routes (GET /, GET /:id, GET /feedback, GET /:id/question-paper, GET /:id/answer-key):
 *     requireAuth only — students and guests with a valid JWT can fetch published tests.
 *     The controller's getAll() returns all tests; role-based filtering (published/targetAudience)
 *     is applied in the frontend before displaying to students.
 *   - Write/Admin routes (POST /extract, POST /, PUT /:id, PATCH /publish, PATCH /unpublish,
 *     DELETE /:id, POST /feedback): requireAuth + admin/staff/teacher role only.
 * ==========================================
 */
const adminRoles = ['super_admin', 'admin', 'staff', 'teacher'];

// All routes require authentication
router.use(requireAuth);

/** AI PDF Question Extraction (billed external call — admin only) */
router.post("/extract", requireRole(adminRoles), TestCreationController.extractQuestionsFromPdf);

/** Get draft from AI extraction (admin only) */
router.get("/draft/:draftId", requireRole(adminRoles), TestCreationController.getDraft);

/** GET ALL TESTS — students and admins (frontend filters by published/targetAudience for students) */
router.get("/", TestCreationController.getAll);

/** TEST FEEDBACK — students submit feedback, admins view it */
router.get("/feedback", requireRole(adminRoles), TestCreationController.getFeedback);
router.post("/feedback", TestCreationController.submitFeedback);

// ─── Offline Student Test Permission Request Routes ───────────────────────────
// Base: /api/test-portal/test-creation/permission-requests
// Students POST to submit requests; Admins GET/PATCH/DELETE to manage them.

/** Student submits a permission request */
router.post("/permission-requests", OfflineTestRequestController.submitRequest);

/** Fetch permission requests — admin gets all, student filters by their own studentId via ?studentId= */
router.get("/permission-requests", OfflineTestRequestController.getAll);

/** Admin clears ALL requests */
router.delete("/permission-requests/clear-all", requireRole(adminRoles), OfflineTestRequestController.clearAll);

/** Admin approves or rejects a request */
router.patch("/permission-requests/:id", requireRole(adminRoles), OfflineTestRequestController.updateStatus);

/** Admin deletes a specific request */
router.delete("/permission-requests/by-test/:testId", OfflineTestRequestController.deleteByTest);
router.delete("/permission-requests/:id", OfflineTestRequestController.deleteRequest);

// ─────────────────────────────────────────────────────────────────────────────

/** GET SINGLE TEST — students and admins */
router.get("/:id", TestCreationController.getOne);

/** GET QUESTION PAPER PDF (available to all authenticated users after exam closes) */
router.get("/:id/question-paper", TestCreationController.getQuestionPaper);

/** GET ANSWER KEY PDF (available to all authenticated users after exam closes) */
router.get("/:id/answer-key", TestCreationController.getAnswerKey);

/** CREATE TEST (admin only) */
router.post("/", requireRole(adminRoles), TestCreationController.create);

/** UPDATE TEST (admin only) */
router.put("/:id", requireRole(adminRoles), TestCreationController.update);

/** PUBLISH TEST (admin only) */
router.patch("/:id/publish", requireRole(adminRoles), TestCreationController.publish);

/** UNPUBLISH TEST (admin only) */
router.patch("/:id/unpublish", requireRole(adminRoles), TestCreationController.unpublish);

/** DELETE TEST (SOFT DELETE — admin only) */
router.delete("/:id", requireRole(adminRoles), TestCreationController.delete);

export default router;