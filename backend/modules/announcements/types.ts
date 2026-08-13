import { BaseAuditFields } from '../../core/types';

export interface IAnnouncement extends BaseAuditFields {
  id?: string;
  tenantId: string;
  title: string;
  content: string; // HTML or Markdown
  
  // Targeting
  visibility: 'global' | 'batch' | 'course' | 'topic';
  targetBatchIds?: string[];
  targetCourseIds?: string[];
  targetTopicIds?: string[];
  
  // Metadata
  authorId: string;
  authorName: string;
  priority: 'low' | 'normal' | 'high';
  expiresAt?: string; // Optional expiration date for the announcement
  
  // Status
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  
  // Push Notification Delivery
  pushDelivered?: boolean;
  pushDeliveryCount?: number;
}

export interface IAnnouncementReadReceipt {
  id?: string;
  announcementId: string;
  tenantId: string;
  studentId: string;
  readAt: string;
}
