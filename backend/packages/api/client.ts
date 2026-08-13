import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

interface ApiClientConfig {
  baseURL: string;
  getAccessToken: (isAdmin?: boolean) => Promise<string | null>;
  refreshAccessToken: (isAdmin?: boolean) => Promise<string | null>;
  onLogout: () => void;
  platform: 'web' | 'mobile';
}

let apiClient: AxiosInstance | null = null;
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const configureApiClient = (config: ApiClientConfig): AxiosInstance => {
  if (apiClient) return apiClient;

  apiClient = axios.create({
    baseURL: config.baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  apiClient.interceptors.request.use(async (reqConfig: InternalAxiosRequestConfig) => {
    // Basic heuristic: if the URL implies admin or if there's a specific header, we check admin token.
    // We could pass an explicit flag if needed, but for now we try admin first then student based on web's logic.
    // We'll rely on the getAccessToken implementation to figure out priority.
    
    // Check if the request explicitly indicates an admin route or has an admin header
    const hasAdminHeader = typeof reqConfig.headers?.get === 'function' 
      ? reqConfig.headers.get('x-is-admin') === 'true' 
      : reqConfig.headers?.['X-Is-Admin'] === 'true' || reqConfig.headers?.['x-is-admin'] === 'true';
      
    let isAdmin = !!reqConfig.url?.match(/\/(admin|staff)\//) || hasAdminHeader;
    
    if (!isAdmin && typeof window !== 'undefined') {
      isAdmin = window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/staff');
    }
    
    const token = await config.getAccessToken(isAdmin);
    
    if (token) {
      reqConfig.headers.Authorization = `Bearer ${token}`;
      console.log(`[API Request] URL: ${reqConfig.url} | isAdmin: ${isAdmin} | Token start: ${token.substring(0, 10)} | Token end: ${token.substring(token.length - 5)}`);
    } else {
      console.warn(`[API Request] NO TOKEN AVAILABLE for URL: ${reqConfig.url} | isAdmin: ${isAdmin}`);
    }
    
    return reqConfig;
  });

  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login') && !originalRequest.url?.includes('/auth/register')) {
        if (isRefreshing) {
          return new Promise(function (resolve, reject) {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = 'Bearer ' + token;
              return apiClient!(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        // Determine whether this is an admin-context request.
        let isAdminRequest = !!originalRequest.url?.includes('/admin/');
        if (!isAdminRequest && typeof window !== 'undefined') {
          isAdminRequest = window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/staff');
        }

        try {
          const newToken = await config.refreshAccessToken(isAdminRequest);

          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            processQueue(null, newToken);
            return apiClient!(originalRequest);
          } else {
            // No new token available. Trigger logout to clear tokens and redirect to login.
            const errMsg = error.response?.data?.message || error.message || 'Unknown 401';
            if (typeof window !== 'undefined' && window.alert) {
               window.alert('Authentication Failed: ' + errMsg + '\nURL: ' + originalRequest.url);
            }
            config.onLogout?.();
            processQueue(null, null);
            throw error;
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
          config.onLogout?.();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );

  return apiClient;
};

export const getApiClient = (): AxiosInstance => {
  if (!apiClient) {
    throw new Error('API client has not been configured. Call configureApiClient first.');
  }
  return apiClient;
};
