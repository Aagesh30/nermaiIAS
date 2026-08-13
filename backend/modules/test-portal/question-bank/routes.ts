import { Router } from "express";
import { QuestionBankController } from "./controller";
import { requireAuth, requireRole } from "../../../core/middleware/auth.middleware";

const router = Router();

/**
 * Question Bank Routes
 * SECURITY: All routes require authentication + admin/staff/teacher role.
 * Students must never access the question bank (answer keys are included).
 */
const adminRoles = ['super_admin', 'admin', 'staff', 'teacher'];

router.use(requireAuth);
router.use(requireRole(adminRoles));

router.get("/", QuestionBankController.getAll);
router.get("/search", QuestionBankController.search);
router.get("/:id", QuestionBankController.getOne);
router.post("/", QuestionBankController.create);
router.put("/:id", QuestionBankController.update);
router.delete("/:id", QuestionBankController.delete);

export default router;