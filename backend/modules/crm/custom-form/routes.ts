import { Router } from "express";
import { CustomFormController } from "./controller";
import { requireAuth, requireRole } from "../../../core/middleware/auth.middleware";

const router = Router();
const adminRoles = ["super_admin", "admin"];

// Public route for Guest application view
router.get("/active", CustomFormController.getActive);

// Super Admin / Admin configuration routes
router.get("/:id?", requireAuth, requireRole(adminRoles), CustomFormController.getForm);
router.post("/", requireAuth, requireRole(adminRoles), CustomFormController.saveForm);

export default router;
