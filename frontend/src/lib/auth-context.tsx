"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

// ─── Types ──────────────────────────────────────────────────────────────────────
export type UserRole = "LANDLORD" | "TENANT";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  createdAt: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: { user: AuthUser; tokens: AuthTokens }) => void;
  logout: () => Promise<void>;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Storage keys ──────────────────────────────────────────────────────────────
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY) ?? sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY) ?? sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

function persistTokens(tokens: AuthTokens, remember: boolean) {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

// ─── API Base ──────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

// ─── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from /auth/me on mount
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetch(`${API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then(async (res) => {
        if (res.status === 401) {
          // Token expired — try refresh
          return tryRefreshToken();
        }
        if (!res.ok) throw new Error("Lỗi khi lấy thông tin người dùng");
        const json = await res.json();
        setUser(json.data);
      })
      .catch(() => {
        clearTokens();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function tryRefreshToken(): Promise<void> {
    const refresh = getRefreshToken();
    if (!refresh) {
      clearTokens();
      setUser(null);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
      });

      if (!res.ok) {
        clearTokens();
        setUser(null);
        return;
      }

      const json = await res.json();
      const newAccessToken = json.data.accessToken;

      // Persist with same storage preference
      const isLocal = localStorage.getItem(ACCESS_TOKEN_KEY) !== null;
      const storage = isLocal ? localStorage : sessionStorage;
      storage.setItem(ACCESS_TOKEN_KEY, newAccessToken);

      // Fetch user with new token
      const meRes = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${newAccessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!meRes.ok) throw new Error();
      const meJson = await meRes.json();
      setUser(meJson.data);
    } catch {
      clearTokens();
      setUser(null);
    }
  }

  const login = useCallback(
    (data: { user: AuthUser; tokens: AuthTokens }, remember = false) => {
      persistTokens(data.tokens, remember);
      setUser(data.user);
    },
    []
  );

  const logout = useCallback(async () => {
    const token = getAccessToken();
    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      } catch {
        // Ignore logout API errors — clear tokens anyway
      }
    }
    clearTokens();
    setUser(null);
  }, []);

  const getToken = useCallback(() => getAccessToken(), []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, login, logout, getToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
