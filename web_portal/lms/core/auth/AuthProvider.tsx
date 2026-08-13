import React, { createContext, useContext, useEffect, useState } from 'react';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextType {
  currentUser: AppUser | null;
  role: string | null;
  tenantId: string | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  role: null,
  tenantId: null,
  loading: true,
  logout: async () => {},
  refreshToken: async () => null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const rawUserObj = localStorage.getItem('nermai_auth_user');
      if (rawUserObj) {
        const parsed = JSON.parse(rawUserObj);
        if (parsed) {
          setCurrentUser({
            uid: parsed.userId || parsed.uid || parsed.id || 'unknown',
            email: parsed.email || null,
            displayName: parsed.name || parsed.fullName || 'User',
          });
          setRole(parsed.role || 'student');
          setTenantId(parsed.tenantId || 'default');
        }
      }
    } catch (e) {
      console.error("Failed to load user in AuthProvider bridge:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = async () => {
    localStorage.removeItem('nermai_auth_user');
    setCurrentUser(null);
    setRole(null);
    setTenantId(null);
    window.location.reload();
  };

  const refreshToken = async () => {
    try {
      const rawUserObj = localStorage.getItem('nermai_auth_user');
      if (rawUserObj) {
        const parsed = JSON.parse(rawUserObj);
        return parsed?.token || parsed?.accessToken || null;
      }
    } catch {}
    return null;
  };

  return (
    <AuthContext.Provider value={{ currentUser, role, tenantId, loading, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
