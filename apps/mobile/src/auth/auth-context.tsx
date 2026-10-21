import * as SecureStore from "expo-secure-store";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

import { apiRequest, ApiError } from "@/lib/api-client";

const SESSION_KEY = "ssc.auth.session.v1";

export type UserRole = "SUPER_ADMIN" | "PREACHER";

export type Session = {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: { id: string; fullName: string; email: string };
  membership: {
    id: string;
    role: UserRole;
    organization: { id: string; name: string };
  };
};

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { fullName: string; email: string; password: string }) => Promise<string>;
  logout: () => Promise<void>;
  request: <T>(path: `/${string}`, init?: RequestInit) => Promise<T>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getWebStorage(): Storage | null {
  if (typeof globalThis.localStorage === "undefined") return null;
  return globalThis.localStorage;
}

async function readSession(): Promise<string | null> {
  if (Platform.OS === "web") return getWebStorage()?.getItem(SESSION_KEY) ?? null;
  return SecureStore.getItemAsync(SESSION_KEY);
}

async function persistSession(session: Session | null): Promise<void> {
  if (Platform.OS === "web") {
    const storage = getWebStorage();
    if (session) storage?.setItem(SESSION_KEY, JSON.stringify(session));
    else storage?.removeItem(SESSION_KEY);
    return;
  }
  if (session) await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  else await SecureStore.deleteItemAsync(SESSION_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionRef = useRef<Session | null>(null);

  const saveSession = useCallback(async (next: Session | null) => {
    sessionRef.current = next;
    setSession(next);
    await persistSession(next);
  }, []);

  useEffect(() => {
    let mounted = true;
    void readSession()
      .then((stored) => {
        if (!mounted || !stored) return;
        const restored = JSON.parse(stored) as Session;
        sessionRef.current = restored;
        setSession(restored);
      })
      .catch(() => persistSession(null))
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const next = await apiRequest<Session>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase(), password })
    });
    await saveSession(next);
  }, [saveSession]);

  const register = useCallback(async (input: { fullName: string; email: string; password: string }) => {
    const result = await apiRequest<{ status: string; message: string }>("/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ ...input, email: input.email.trim().toLowerCase(), role: "PREACHER" })
    });
    return result.message;
  }, []);

  const logout = useCallback(async () => {
    const current = sessionRef.current;
    await saveSession(null);
    if (current) {
      await apiRequest<void>("/v1/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken: current.refreshToken })
      }).catch(() => undefined);
    }
  }, [saveSession]);

  const request = useCallback(async <T,>(path: `/${string}`, init: RequestInit = {}): Promise<T> => {
    const current = sessionRef.current;
    if (!current) throw new ApiError("Please sign in again", 401, "AUTH_REQUIRED");

    const authenticatedInit = (token: string): RequestInit => ({
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` }
    });

    try {
      return await apiRequest<T>(path, authenticatedInit(current.accessToken));
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      try {
        const refreshed = await apiRequest<Pick<Session, "accessToken" | "refreshToken" | "expiresIn">>("/v1/auth/refresh", {
          method: "POST",
          body: JSON.stringify({ refreshToken: current.refreshToken })
        });
        const next = { ...current, ...refreshed };
        await saveSession(next);
        return await apiRequest<T>(path, authenticatedInit(next.accessToken));
      } catch (refreshError) {
        await saveSession(null);
        throw refreshError;
      }
    }
  }, [saveSession]);

  const value = useMemo(() => ({ session, isLoading, login, register, logout, request }), [session, isLoading, login, register, logout, request]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
