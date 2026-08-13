import { Request, Response } from 'express';
import { AnnouncementService } from './service';

const announcementService = new AnnouncementService();

export class AnnouncementController {
  async createAnnouncement(req: Request, res: Response) {
    const data = {
      ...req.body,
      tenantId: req.user?.tenantId,
      authorId: req.user?.userId,  // Fixed: was req.user?.uid
    };
    
    const announcement = await announcementService.create(data);
    res.status(201).json({ success: true, data: announcement });
  }

  async listAnnouncements(req: Request, res: Response) {
    const tenantId = req.user?.tenantId;
    const role = req.user?.role;
    const studentContext = req.user?.accessContext ? {
      batchIds: req.user.accessContext.batchIds || [],
      courseIds: [] // Expand this if you want to pull course enrollments from context
    } : undefined;

    const announcements = await announcementService.list(tenantId!, role!, studentContext);
    res.status(200).json({ success: true, data: announcements });
  }

  async updateAnnouncement(req: Request, res: Response) {
    const id = req.params.id as string;
    const tenantId = req.user?.tenantId;
    
    const updated = await announcementService.update(id, req.body, tenantId!);
    res.status(200).json({ success: true, data: updated });
  }

  async deleteAnnouncement(req: Request, res: Response) {
    const id = req.params.id as string;
    const tenantId = req.user?.tenantId;
    
    await announcementService.delete(id, tenantId!);
    res.status(200).json({ success: true, message: 'Announcement deleted' });
  }
}
