import { Router } from "express";
import { TestCreationController } from "./controller";
import { requireAuth, requireRole } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * ==========================================
 * TEST CREATION ROUTES
 * Base Route: /api/test-portal/test-creation
 * SECURITY: All routes require auth + admin/staff/teacher role.
 * ==========================================
 */
const adminRoles = ['super_admin', 'admin', 'staff', 'teacher'];

router.use(requireAuth);
router.use(requireRole(adminRoles));

/** AI PDF Question Extraction (billed external call — auth required) */
router.post("/extract", TestCreationController.extractQuestionsFromPdf);

/** Get draft from AI extraction */
router.get("/draft/:draftId", TestCreationController.getDraft);

/** GET ALL TESTS */
router.get("/", TestCreationController.getAll);

/** TEST FEEDBACK ROUTING */
router.get("/feedback", TestCreationController.getFeedback);
router.post("/feedback", TestCreationController.submitFeedback);

/** GET SINGLE TEST */
router.get("/:id", TestCreationController.getOne);

/** GET QUESTION PAPER PDF (post-exam) */
router.get("/:id/question-paper", TestCreationController.getQuestionPaper);

/** GET ANSWER KEY PDF (post-exam) */
router.get("/:id/answer-key", TestCreationController.getAnswerKey);

/** CREATE TEST */
router.post("/", TestCreationController.create);

/** UPDATE TEST */
router.put("/:id", TestCreationController.update);

/** PUBLISH TEST */
router.patch("/:id/publish", TestCreationController.publish);

/** UNPUBLISH TEST */
router.patch("/:id/unpublish", TestCreationController.unpublish);

/** DELETE TEST (SOFT DELETE) */
router.delete("/:id", TestCreationController.delete);

export default router;
// Trigger build change 1