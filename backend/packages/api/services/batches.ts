import { getApiClient } from '../client';

export const BatchApi = {
  listBatches: () => getApiClient().get('/batches'),
  getBatch: (id: string) => getApiClient().get(`/batches/${id}`),
  createBatch: (data: any) => getApiClient().post('/batches', data),
  updateBatch: (id: string, data: any) => getApiClient().put(`/batches/${id}`, data),
  deleteBatch: (id: string) => getApiClient().delete(`/batches/${id}`),
};
