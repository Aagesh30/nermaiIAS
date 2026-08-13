import { AnnouncementRepository } from './repository';
import { IAnnouncement } from './types';
import { AppError } from '../../core/errors/AppError';
import { NotificationService } from '../notifications/service';

const notificationService = new NotificationService();

export class AnnouncementService {
  private repo = new AnnouncementRepository();

  async create(data: Partial<IAnnouncement>): Promise<IAnnouncement> {
    if (!data.title || !data.content || !data.visibility) {
      throw new AppError('Title, content, and visibility are required', 400);
    }
    const now = new Date().toISOString();
    const announcement: IAnnouncement = {
      tenantId: data.tenantId!,
      title: data.title,
      content: data.content,
      visibility: data.visibility as any,
      targetBatchIds: data.targetBatchIds || [],
      targetCourseIds: data.targetCourseIds || [],
      targetTopicIds: data.targetTopicIds || [],
      authorId: data.authorId!,
      authorName: data.authorName || 'Admin',
      priority: data.priority || 'normal',
      status: data.status || 'draft',
      pushDelivered: false,
      createdAt: now,
      updatedAt: now,
      createdBy: data.authorId!,
      updatedBy: data.authorId!,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null
    };

    if (announcement.status === 'published') {
      announcement.publishedAt = new Date().toISOString();
    }

    const created = await this.repo.create(announcement);
    
    // Automatically dispatch push if published
    if (created.status === 'published') {
      this.dispatchPushNotifications(created).catch(err => {
        console.error('Failed to dispatch push notifications for announcement', err);
      });
    }
    
    return created;
  }

  async list(tenantId: string, role: string, studentContext?: { batchIds: string[], courseIds: string[] }): Promise<IAnnouncement[]> {
    if (role === 'admin' || role === 'super_admin') {
      return this.repo.listForTenant(tenantId);
    }
    
    if (role === 'student' && studentContext) {
      return this.repo.listForStudent(tenantId, studentContext.batchIds, studentContext.courseIds);
    }

    return [];
  }

  async update(id: string, updates: Partial<IAnnouncement>, tenantId: string): Promise<IAnnouncement> {
    const existing = await this.repo.findById(id);
    if (!existing || existing.tenantId !== tenantId) {
      throw new AppError('Announcement not found', 404);
    }

    if (updates.status === 'published' && existing.status === 'draft') {
      updates.publishedAt = new Date().toISOString();
    }

    await this.repo.update(id, updates);
    const updated = await this.repo.findById(id);

    // If newly published, dispatch push
    if (updates.status === 'published' && existing.status === 'draft') {
      this.dispatchPushNotifications(updated!).catch(err => {
        console.error('Failed to dispatch push notifications', err);
      });
    }

    return updated!;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing || existing.tenantId !== tenantId) {
      throw new AppError('Announcement not found', 404);
    }
    await this.repo.delete(id);
  }

  /**
   * Internal function to send push notifications via NotificationCenter (BullMQ)
   */
  private async dispatchPushNotifications(announcement: IAnnouncement): Promise<void> {
    await notificationService.dispatchNotification({
      tenantId: announcement.tenantId,
      title: 'New Announcement',
      body: announcement.title,
      visibility: announcement.visibility as any,
      targetBatchIds: announcement.targetBatchIds,
      targetCourseIds: announcement.targetCourseIds,
      metadata: { type: 'announcement', id: announcement.id! },
      announcementId: announcement.id
    });
  }
}
