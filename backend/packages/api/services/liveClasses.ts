import { getApiClient } from '../client';

export const LiveClassesApi = {
  // Admin endpoints
  createSession: (payload: any) => getApiClient().post('/live-classes/admin/create', payload),
  updateSession: (id: string, payload: any) => getApiClient().put(`/live-classes/admin/update/${id}`, payload),
  deleteSession: (id: string) => getApiClient().delete(`/live-classes/admin/delete/${id}`),
  listClassSessions: (classId: string) => getApiClient().get(`/live-classes/admin/class/${classId}`),
  startLiveClass: (id: string) => getApiClient().post(`/live-classes/admin/${id}/start`),
  endLiveClass: (id: string) => getApiClient().post(`/live-classes/admin/${id}/end`),

  // Student endpoints
  getLiveAccess: (id: string) => getApiClient().get(`/live-classes/${id}/access`),
};
