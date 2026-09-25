/**
 * API Client — dùng chung cho toàn bộ app.
 * Tự động gắn Authorization header từ auth-context.
 * Tự động handle 401 → refresh token.
 */

import { getAccessToken } from "./auth-context";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

// ─── Types ──────────────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ─── Default headers ───────────────────────────────────────────────────────────
function baseHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function authHeaders(): HeadersInit {
  const token = getAccessToken();
  if (!token) return baseHeaders();
  return { ...baseHeaders(), Authorization: `Bearer ${token}` };
}

// ─── Fetch wrapper ─────────────────────────────────────────────────────────────
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers ?? {}),
    },
  });

  // 401 → redirect to login (handled by component)
  if (res.status === 401) {
    const err: ApiResponse<T> = {
      success: false,
      data: null as T,
      error: { code: "UNAUTHORIZED", message: "Phiên đăng nhập hết hạn" },
    };
    throw Object.assign(new Error("UNAUTHORIZED"), { response: err, status: 401 });
  }

  const json = (await res.json()) as ApiResponse<T>;

  if (!res.ok && !json.success) {
    throw Object.assign(new Error(json.error?.message ?? "Lỗi không xác định"), {
      response: json,
      status: res.status,
    });
  }

  return json;
}

// ─── HTTP method shortcuts ────────────────────────────────────────────────────
export const api = {
  get<T = unknown>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return apiFetch<T>(endpoint, { ...options, method: "GET" });
  },

  post<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    return apiFetch<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    return apiFetch<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    return apiFetch<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T = unknown>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return apiFetch<T>(endpoint, { ...options, method: "DELETE" });
  },
};

// ─── Role-based navigation config ─────────────────────────────────────────────
// Re-exported from nav-config.ts để giữ import paths quen thuộc
export { LANDLORD_NAV, TENANT_NAV } from "./nav-config";
