import { Router } from "express";
import { CustomLeadsController } from "./controller";
import { requireAuth, requireRole } from "../../../core/middleware/auth.middleware";

const router = Router();
const adminRoles = ["super_admin", "admin", "staff"];

// Public: Guest application form submission
router.post("/", CustomLeadsController.submit);

// Admin: Manage custom application leads
router.get("/", requireAuth, requireRole(adminRoles), CustomLeadsController.getAll);
router.patch("/:id", requireAuth, requireRole(adminRoles), CustomLeadsController.update);
router.delete("/:id", requireAuth, requireRole(adminRoles), CustomLeadsController.delete);

export default router;
