import { getApiClient } from '../client';

export const AccessRulesApi = {
  // Get evaluated access for an entity
  getAccessStatus: (entityType: string, entityId: string, studentId: string) => 
    getApiClient().get(`/access-rules/evaluate/${entityType}/${entityId}?studentId=${studentId}`),

  // Get effective permission matrix
  getPermissionMatrix: (courseId: string) =>
    getApiClient().get(`/access-rules/matrix/${courseId}`),

  // Set explicit permission on an entity
  setEntityPermission: (entityType: string, entityId: string, data: any) =>
    getApiClient().put(`/access-rules/entity/${entityType}/${entityId}`, data),

  // Access Requests
  submitAccessRequest: (data: any) => getApiClient().post('/access-requests', data),
  listAccessRequests: (filters?: Record<string, any>) => getApiClient().get('/access-requests/admin/pending', { params: filters }),
  approveRequest: (requestId: string, grantExpiresAt?: string) => getApiClient().post(`/access-requests/admin/${requestId}/approve`, { grantExpiresAt }),
  rejectRequest: (requestId: string, reason?: string) => getApiClient().post(`/access-requests/admin/${requestId}/reject`, { reason }),
  bulkApprove: (data: {
    requestIds: string[],
    grantType: 'TEMPORARY' | 'PERMANENT',
    durationHours: number | null,
    consumeMonthlyUnits: boolean,
    respectMonthlyLimit: boolean,
    presetId: string | null,
    overrideLimit: boolean
  }) => getApiClient().post('/access-requests/admin/bulk-approve', data),
  
  // Temporary Grants & Analytics
  listTemporaryGrants: () => getApiClient().get('/access-requests/admin/temporary-grants'),
  extendGrant: (grantId: string, additionalHours: number) => getApiClient().post(`/access-requests/admin/grants/${grantId}/extend`, { additionalHours }),
  revokeGrant: (grantId: string, reason: string) => getApiClient().post(`/access-requests/admin/grants/${grantId}/revoke`, { reason }),
  getAnalytics: () => getApiClient().get('/access-requests/admin/analytics'),
  exportAnalytics: () => getApiClient().post('/access-requests/admin/export'),
  
  // Templates
  listTemplates: () => getApiClient().get('/access-rules/templates'),
  createTemplate: (data: any) => getApiClient().post('/access-rules/templates', data),
  
  // Batches
  getBatchCapabilities: (batchId: string) => getApiClient().get(`/access-rules/batches/${batchId}/capabilities`),
  updateBatchCapabilities: (batchId: string, capabilities: any) => getApiClient().put(`/access-rules/batches/${batchId}/capabilities`, { capabilities }),

  // History (Approved + Rejected requests)
  listAccessHistory: (status?: 'APPROVED' | 'REJECTED') => getApiClient().get('/access-requests/admin/history', { params: status ? { status } : {} }),

  // Permanent Grants
  listPermanentGrants: () => getApiClient().get('/access-requests/admin/permanent-grants'),

  // Convert grant type (Permanent ↔ Temporary)
  convertGrant: (grantId: string, data: { newType: 'TEMPORARY' | 'PERMANENT'; durationHours?: number }) =>
    getApiClient().post(`/access-requests/admin/grants/${grantId}/convert`, data),
};
