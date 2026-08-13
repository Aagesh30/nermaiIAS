import { Router } from "express";
import { StudentController } from "./controller";
import { requireAuth, requireRole } from "../../../core/middleware/auth.middleware";
import { requireSelfOrAdmin } from "../../../core/middleware/ownershipGuard";

const router = Router();

const adminRoles = ['super_admin', 'admin', 'staff'];

router.use(requireAuth);

// Get all students (requires admin/staff role)
router.get("/", requireRole(adminRoles), StudentController.getAll);

// Get single student (requires self ownership or admin/staff role)
router.get("/:id", requireSelfOrAdmin(['id']), StudentController.getOne);

// Create student (requires admin/staff role)
router.post("/", requireRole(adminRoles), StudentController.create);

// Update student (requires self ownership or admin/staff role)
router.put("/:id", requireSelfOrAdmin(['id']), StudentController.update);

// Bulk update credentials for batch (super_admin only — highly privileged)
router.post("/bulk/credentials", requireRole(['super_admin']), StudentController.bulkUpdateCredentials);

// Soft delete student (requires admin/staff role)
router.delete("/:id", requireRole(['super_admin', 'admin']), StudentController.delete);

export default router;
