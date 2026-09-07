"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiRequest, clearAuthToken, getAuthToken, saveAuthToken } from "./api-client";

export type User = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
};

type AuthResponse = {
  access_token: string;
  token_type: "bearer";
  user: User;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { full_name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    if (!getAuthToken()) {
      setLoading(false);
      return;
    }

    try {
      setUser(await apiRequest<User>("/auth/me"));
    } catch {
      clearAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  async function authenticate(path: string, data: object): Promise<void> {
    const response = await apiRequest<AuthResponse>(path, {
      method: "POST",
      body: JSON.stringify(data),
    });
    saveAuthToken(response.access_token);
    setUser(response.user);
  }

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    login: (email, password) => authenticate("/auth/login", { email, password }),
    register: (data) => authenticate("/auth/register", data),
    logout: () => {
      clearAuthToken();
      setUser(null);
    },
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
