import { Router } from "express";
import { GuestPostersController } from "./controller";
import { requireAuth, requireRole } from "../../../core/middleware/auth.middleware";

const router = Router();
const adminRoles = ["super_admin", "admin", "staff"];

// Public: guests and students can read posters
router.get("/", GuestPostersController.getAll);

// Admin only: create / delete posters
router.post("/", requireAuth, requireRole(adminRoles), GuestPostersController.create);
router.delete("/:id", requireAuth, requireRole(adminRoles), GuestPostersController.delete);

export default router;
