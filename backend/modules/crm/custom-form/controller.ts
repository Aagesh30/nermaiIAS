import { Request, Response } from "express";
import { CustomFormService } from "./service";

export class CustomFormController {
  /**
   * Public: Get active form schema for Guests
   * GET /api/crm/custom-form/active
   */
  static async getActive(req: Request, res: Response) {
    try {
      const form = await CustomFormService.getActiveForm();
      return res.status(200).json({
        success: true,
        data: form
      });
    } catch (error: any) {
      console.error("[CustomFormController.getActive] Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch active application form",
        error: error.message
      });
    }
  }

  /**
   * Admin: Get form schema by ID
   * GET /api/crm/custom-form/:id?
   */
  static async getForm(req: Request, res: Response) {
    try {
      const formId = req.params.id || "mock_test_app";
      const form = await CustomFormService.getFormById(formId);
      return res.status(200).json({
        success: true,
        data: form
      });
    } catch (error: any) {
      console.error("[CustomFormController.getForm] Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve form schema",
        error: error.message
      });
    }
  }

  /**
   * Admin: Save form configuration
   * POST /api/crm/custom-form
   */
  static async saveForm(req: Request, res: Response) {
    try {
      const { title, subtitle, bannerText, isActive, defaultFields, customFields, id } = req.body;

      if (!title || typeof title !== "string") {
        return res.status(400).json({
          success: false,
          message: "Form title is required"
        });
      }

      const saved = await CustomFormService.saveForm({
        id: id || "mock_test_app",
        title,
        subtitle: subtitle || "",
        bannerText: bannerText || "",
        isActive: isActive !== false,
        defaultFields: defaultFields || {
          name: { label: "Full Name", required: true, enabled: true },
          phone: { label: "Phone Number", required: true, enabled: true },
          email: { label: "Email", required: false, enabled: true },
          city: { label: "City", required: false, enabled: true },
          mode: { label: "Preferred Mode", required: true, enabled: true, options: ["Offline", "Online", "Recorded"] }
        },
        customFields: Array.isArray(customFields) ? customFields : []
      });

      return res.status(200).json({
        success: true,
        message: "Application form schema saved successfully",
        data: saved
      });
    } catch (error: any) {
      console.error("[CustomFormController.saveForm] Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to save form schema",
        error: error.message
      });
    }
  }
}
