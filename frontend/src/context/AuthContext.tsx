import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi, clearToken, setToken } from '../api/client';
import type { User } from '../types/domain';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (payload: { full_name: string; username: string; password?: string }) => Promise<User>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .me()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await authApi.login(username, password);
    setToken(response.access_token);
    const refreshedUser = await authApi.me();
    setUser(refreshedUser);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (payload: { full_name: string; username: string; password?: string }) => {
    const updatedUser = await authApi.updateMe(payload);
    setUser(updatedUser);
    return updatedUser;
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, updateProfile }),
    [user, loading, login, logout, updateProfile],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
