import { getApiClient } from '../client';

export const StudentApi = {
  listStudents: () => getApiClient().get('/students'),
  getStudent: (id: string) => getApiClient().get(`/students/${id}`),
  updateStudent: (id: string, data: any) => getApiClient().put(`/students/${id}`, data),
  deleteStudent: (id: string) => getApiClient().delete(`/students/${id}`),
  assignRole: (id: string, role: string) => getApiClient().patch(`/students/${id}/role`, { role }),
  assignBatch: (id: string, batchId: string) => getApiClient().post(`/students/${id}/batches`, { batchId }),
  removeBatch: (id: string, batchId: string) => getApiClient().delete(`/students/${id}/batches/${batchId}`),
};
