import { getApiClient } from '../client';

export const AssistantApi = {
  setContext: (data: { activeCourseId?: string, activeTopicId?: string, activeVideoId?: string }) => 
    getApiClient().post('/assistant/context', data),
    
  chat: (query: string, language: string = 'en') => 
    getApiClient().post('/assistant/chat', { query, language })
};
