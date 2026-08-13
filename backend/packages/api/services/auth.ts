import { getApiClient } from '../client';

export const AuthApi = {
  login: (data: any, isAdmin = false) => {
    // If you need specific URLs based on role, adjust here. 
    // Currently backend handles both under /api/v1/auth/login or similar, but
    // web logic used /auth/login.
    return getApiClient().post('/auth/login', data);
  },
  register: (data: any) => getApiClient().post('/auth/register', data),
  getDebugInfo: () => getApiClient().get('/auth/debug'),
};
