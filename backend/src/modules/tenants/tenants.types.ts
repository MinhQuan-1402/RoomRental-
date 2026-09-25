import { z } from "zod";

// ------------------------------------------------------
// Zod schemas (request validation)
// ------------------------------------------------------

export const createTenantSchema = z.object({
  fullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự").max(100),
  phone: z
    .string()
    .min(9, "Số điện thoại tối thiểu 9 ký tự")
    .max(20, "Số điện thoại tối đa 20 ký tự")
    .regex(/^[0-9+\-\s()]+$/, "Số điện thoại không hợp lệ"),
  email: z.string().email("Email không hợp lệ").max(255).optional().nullable(),
  identityNumber: z.string().max(50).optional().nullable(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày sinh phải có định dạng YYYY-MM-DD")
    .optional()
    .nullable(),
  address: z.string().max(500).optional().nullable(),
});

export const updateTenantSchema = createTenantSchema.partial();

export const listTenantsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ALL"]).default("ACTIVE"),
  sortBy: z
    .enum(["fullName", "phone", "createdAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const tenantIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ------------------------------------------------------
// Inferred types
// ------------------------------------------------------

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type ListTenantsQuery = z.infer<typeof listTenantsQuerySchema>;

// ------------------------------------------------------
// Response shapes
// ------------------------------------------------------

export interface TenantResponse {
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

export interface TenantListResponse {
  data: TenantResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
