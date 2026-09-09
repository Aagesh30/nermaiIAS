import { Request, Response } from "express";
import { CustomLeadsService } from "./service";

export class CustomLeadsController {
  /**
   * Public: Guest submits application form
   * POST /api/crm/custom-leads
   */
  static async submit(req: Request, res: Response) {
    try {
      const { name, phone, email, city, mode, customData, formId, formTitle } = req.body;

      if (!name || !phone) {
        return res.status(400).json({
          success: false,
          message: "Full Name and Phone Number are required"
        });
      }

      const lead = await CustomLeadsService.submitLead({
        name,
        phone,
        email,
        city,
        mode,
        customData,
        formId,
        formTitle
      });

      return res.status(201).json({
        success: true,
        message: "Application submitted successfully! Our team will contact you soon.",
        data: lead
      });
    } catch (error: any) {
      console.error("[CustomLeadsController.submit] Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to submit application",
        error: error.message
      });
    }
  }

  /**
   * Admin: List custom application leads
   * GET /api/crm/custom-leads
   */
  static async getAll(req: Request, res: Response) {
    try {
      const { formId, status, mode, search, limit } = req.query;

      const leads = await CustomLeadsService.getLeads({
        formId: formId ? String(formId) : undefined,
        status: status ? String(status) : undefined,
        mode: mode ? String(mode) : undefined,
        search: search ? String(search) : undefined,
        limit: limit ? parseInt(String(limit), 10) : undefined
      });

      return res.status(200).json({
        success: true,
        data: leads
      });
    } catch (error: any) {
      console.error("[CustomLeadsController.getAll] Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve custom leads",
        error: error.message
      });
    }
  }

  /**
   * Admin: Update custom lead status or notes
   * PATCH /api/crm/custom-leads/:id
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const updated = await CustomLeadsService.updateLead(id, { status, notes });

      return res.status(200).json({
        success: true,
        message: "Lead updated successfully",
        data: updated
      });
    } catch (error: any) {
      console.error("[CustomLeadsController.update] Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update custom lead",
        error: error.message
      });
    }
  }

  /**
   * Admin: Delete custom lead
   * DELETE /api/crm/custom-leads/:id
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await CustomLeadsService.deleteLead(id);

      return res.status(200).json({
        success: true,
        message: "Custom lead deleted successfully"
      });
    } catch (error: any) {
      console.error("[CustomLeadsController.delete] Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete custom lead",
        error: error.message
      });
    }
  }
}
