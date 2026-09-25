// ─── Shared API client ─────────────────────────────────────────────────────────
// Wraps fetch with the access token + base URL + error handling.

import { getAccessToken } from "./auth-context";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export interface ApiError {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    // non-JSON response — surface a generic error
    if (!res.ok) {
      throw {
        statusCode: res.status,
        code: "NETWORK_ERROR",
        message: `HTTP ${res.status}`,
      } as ApiError;
    }
    throw {
      statusCode: 500,
      code: "INVALID_RESPONSE",
      message: "Phản hồi không hợp lệ từ máy chủ",
    } as ApiError;
  }

  if (!res.ok || !json.success) {
    const errJson = json as unknown as { code?: string; message?: string };
    throw {
      statusCode: res.status,
      code: errJson?.code ?? "UNKNOWN_ERROR",
      message: errJson?.message ?? "Có lỗi xảy ra",
    } as ApiError;
  }

  return json.data;
}
