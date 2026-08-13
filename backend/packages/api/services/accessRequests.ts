import { getApiClient } from '../client';

export const AccessRequestApi = {
  // Student: submit a request
  createRequest: (data: {
    requestType: string;
    contentId: string;
    contentName: string;
    reason: string;
    batchId?: string | null;
  }) => getApiClient().post('/access-requests', data),

  // Student: view my requests
  getMyRequests: () => getApiClient().get('/access-requests/my-requests'),

  // Admin: list all pending requests
  listPendingRequests: (filters?: { batchType?: string; requestType?: string }) =>
    getApiClient().get('/access-requests/admin/pending', { params: filters }),

  // Admin: approve a request
  approveRequest: (requestId: string, data: {
    durationHours: number | null;
    ignoreLimit?: boolean;
    partialSelection?: string[];
  }) => getApiClient().post(`/access-requests/admin/${requestId}/approve`, data),

  // Admin: reject a request
  rejectRequest: (requestId: string, data: { reason: string }) =>
    getApiClient().post(`/access-requests/admin/${requestId}/reject`, data),

  // Admin: bulk approve
  bulkApprove: (data: {
    requestIds: string[];
    durationHours: number | null;
    ignoreLimit?: boolean;
  }) => getApiClient().post('/access-requests/admin/bulk-approve', data),

  // Admin: list active temporary grants
  listTemporaryGrants: () => getApiClient().get('/access-requests/admin/temporary-grants'),

  // Admin: extend a grant
  extendGrant: (grantId: string, data: { additionalHours: number }) =>
    getApiClient().post(`/access-requests/admin/grants/${grantId}/extend`, data),

  // Admin: revoke a grant
  revokeGrant: (grantId: string, data: { reason: string }) =>
    getApiClient().post(`/access-requests/admin/grants/${grantId}/revoke`, data),
};
