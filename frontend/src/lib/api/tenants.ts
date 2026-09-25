import { api } from "@/lib/api-client";

// ─── Types ──────────────────────────────────────────────────────────────────────
export interface Tenant {
  id: number;
  fullName: string;
  phone: string;
  email: string | null;
  identityNumber: string | null;
  dateOfBirth: string | null;
  address: string | null;
  hasActiveContract: boolean;
  activeContractId: number | null;
  activeRoomId: number | null;
  activeRoomNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantListData {
  data: Tenant[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TenantQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "INACTIVE" | "ALL";
  sortBy?: "fullName" | "phone" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface CreateTenantDto {
  fullName: string;
  phone: string;
  email?: string | null;
  identityNumber?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
}

export type UpdateTenantDto = Partial<CreateTenantDto>;

// ─── API calls ─────────────────────────────────────────────────────────────────
function qs(params: TenantQuery): string {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.search) sp.set("search", params.search);
  if (params.status && params.status !== "ALL") sp.set("status", params.status);
  if (params.sortBy) sp.set("sortBy", params.sortBy);
  if (params.sortOrder) sp.set("sortOrder", params.sortOrder);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const tenantsApi = {
  list(query: TenantQuery = {}) {
    return api.get<TenantListData>(`/tenants${qs(query)}`);
  },

  get(id: number) {
    return api.get<{ data: Tenant }>(`/tenants/${id}`);
  },

  create(payload: CreateTenantDto) {
    return api.post<{ data: Tenant }>(`/tenants`, payload);
  },

  update(id: number, payload: UpdateTenantDto) {
    return api.patch<{ data: Tenant }>(`/tenants/${id}`, payload);
  },

  remove(id: number) {
    return api.delete<unknown>(`/tenants/${id}`);
  },
};
