import { getApiClient } from '../client';

export interface ResourceSyncPayload {
  resourceId: string;
  lastPage?: number;
  progress?: number; // 0-100
  timestamp?: number;
}

export const ResourceApi = {
  list: (params: { visibility?: string; courseId?: string; subjectId?: string; topicId?: string; classId?: string; batchId?: string; categoryId?: string; search?: string }) => 
    getApiClient().get('/resources', { params }),
  getCourseHierarchy: (courseId: string) => getApiClient().get(`/resources/course/${courseId}/hierarchy`),
  getResource: (id: string) => getApiClient().get(`/resources/${id}`),
  getAccess: (id: string) => getApiClient().get(`/resources/${id}/access`),
  createResource: (data: FormData | any) => getApiClient().post('/resources', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
  }),
  updateResource: (id: string, data: any) => getApiClient().put(`/resources/${id}`, data),
  uploadNewVersion: (id: string, data: FormData) => getApiClient().post(`/resources/${id}/version`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteResource: (id: string) => getApiClient().delete(`/resources/${id}`),
  
  // New Sync Endpoints
  syncProgress: (payloads: ResourceSyncPayload[]) => getApiClient().post('/resources/sync/progress', { payloads }),
  syncFavorites: (resourceIds: string[]) => getApiClient().post('/resources/sync/favorites', { resourceIds }),
  getFavorites: () => getApiClient().get('/resources/favorites'),
};
