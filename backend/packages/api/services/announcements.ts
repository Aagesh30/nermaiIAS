import { getApiClient } from '../client';
import { ApiResponse } from '../types';

export interface IAnnouncement {
  id?: string;
  tenantId: string;
  title: string;
  content: string;
  visibility: 'global' | 'batch' | 'course' | 'topic';
  targetBatchIds?: string[];
  targetCourseIds?: string[];
  targetTopicIds?: string[];
  authorId: string;
  authorName: string;
  priority: 'low' | 'normal' | 'high';
  expiresAt?: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  pushDelivered?: boolean;
  pushDeliveryCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const AnnouncementApi = {
  // Admin Operations
  createAnnouncement: (data: Partial<IAnnouncement>) => 
    getApiClient().post<ApiResponse<IAnnouncement>>('/announcements/admin', data),
    
  listAnnouncements: () => 
    getApiClient().get<ApiResponse<IAnnouncement[]>>('/announcements/admin'),
    
  updateAnnouncement: (id: string, data: Partial<IAnnouncement>) => 
    getApiClient().patch<ApiResponse<IAnnouncement>>(`/announcements/admin/${id}`, data),
    
  deleteAnnouncement: (id: string) => 
    getApiClient().delete<ApiResponse<void>>(`/announcements/admin/${id}`),

  // Student Operations
  listStudentAnnouncements: () => 
    getApiClient().get<ApiResponse<IAnnouncement[]>>('/announcements'),
};
