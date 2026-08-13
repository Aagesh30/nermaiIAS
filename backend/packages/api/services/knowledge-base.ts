import { getApiClient } from '../client';

export const KnowledgeBaseApi = {
  // Settings
  getSettings: () => getApiClient().get('/knowledge-base/settings'),
  updateSettings: (data: any) => getApiClient().put('/knowledge-base/settings', data),

  // Quick Actions
  getQuickActions: () => getApiClient().get('/knowledge-base/quick-actions'),
  createQuickAction: (data: any) => getApiClient().post('/knowledge-base/quick-actions', data),
  updateQuickAction: (id: string, data: any) => getApiClient().put(`/knowledge-base/quick-actions/${id}`, data),
  deleteQuickAction: (id: string) => getApiClient().delete(`/knowledge-base/quick-actions/${id}`),

  // Intents
  getIntents: () => getApiClient().get('/knowledge-base/intents'),
  createIntent: (data: any) => getApiClient().post('/knowledge-base/intents', data),
  updateIntent: (id: string, data: any) => getApiClient().put(`/knowledge-base/intents/${id}`, data),
  deleteIntent: (id: string) => getApiClient().delete(`/knowledge-base/intents/${id}`),

  // FAQs
  getFAQs: () => getApiClient().get('/knowledge-base/faqs'),
  createFAQ: (data: any) => getApiClient().post('/knowledge-base/faqs', data),
  updateFAQ: (id: string, data: any) => getApiClient().put(`/knowledge-base/faqs/${id}`, data),
  deleteFAQ: (id: string) => getApiClient().delete(`/knowledge-base/faqs/${id}`)
};
