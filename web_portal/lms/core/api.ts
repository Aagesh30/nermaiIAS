/**
 * LMS API Client — bridges Folder 1's auth with the backend LMS API.
 *
 * Folder 1 stores the authenticated user in localStorage key "nermai_auth_user"
 * as { token, role, userId, tenantId, ... }
 *
 * This client reads that token and attaches it to all LMS API calls,
 * pointing to the same backend at port 5000.
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// Dynamic Base URL Resolution (same as App.tsx)
const DEFAULT_HOST_IP = "192.168.31.18";
const getBaseUrl = (): string => {
  if (typeof process !== 'undefined' && (process.env as any).EXPO_PUBLIC_API_URL) {
    return (process.env as any).EXPO_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.") || hostname.startsWith("10.") || hostname.startsWith("172.")) {
      return `http://${hostname}:5000/api`;
    }
    return `https://${hostname}/api`;
  }
  return `http://${DEFAULT_HOST_IP}:5000/api`;
};

const BASE_URL = getBaseUrl();

/**
 * Get the JWT token from Folder 1's localStorage auth store.
 */
function getTokenFromFolder1Auth(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('nermai_auth_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Folder 1 stores token as parsed.token
    return parsed?.token || parsed?.accessToken || null;
  } catch {
    return null;
  }
}

/**
 * Get role from Folder 1's auth store.
 */
export function getRoleFromAuth(): string {
  try {
    if (typeof localStorage === 'undefined') return 'student';
    const raw = localStorage.getItem('nermai_auth_user');
    if (!raw) return 'student';
    const parsed = JSON.parse(raw);
    return parsed?.role || 'student';
  } catch {
    return 'student';
  }
}

/**
 * Get user info from Folder 1's auth store.
 */
export function getUserFromAuth(): { userId: string; tenantId: string; role: string; name: string } | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('nermai_auth_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed) return null;
    return {
      userId: parsed.userId || parsed.uid || parsed.id || '',
      tenantId: parsed.tenantId || parsed.tenant_id || 'default',
      role: parsed.role || 'student',
      name: parsed.name || parsed.fullName || '',
    };
  } catch {
    return null;
  }
}

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getTokenFromFolder1Auth();
  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired — clear auth and reload
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('nermai_auth_user');
      }
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

export function getApiClient() {
  return api;
}

export default api;
