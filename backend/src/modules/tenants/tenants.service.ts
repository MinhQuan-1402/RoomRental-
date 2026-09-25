import { tenantsRepository } from "./tenants.repository";
import { AppError } from "../../utils/app-error";
import type {
  CreateTenantInput,
  ListTenantsQuery,
  TenantListResponse,
  TenantResponse,
  UpdateTenantInput,
} from "./tenants.types";

function toResponse(t: any): TenantResponse {
  // Prisma returns Date for dateOfBirth/createdAt/updatedAt. Normalize to ISO strings.
  const dob =
    t.dateOfBirth instanceof Date
      ? t.dateOfBirth.toISOString().slice(0, 10)
      : t.dateOfBirth ?? null;

  return {
    id: t.id,
    fullName: t.fullName,
    phone: t.phone,
    email: t.email,
    identityNumber: t.identityNumber,
    dateOfBirth: dob,
    address: t.address,
    hasActiveContract: (t.contracts?.length ?? 0) > 0,
    activeContractId: t.contracts?.[0]?.id ?? null,
    activeRoomId: t.contracts?.[0]?.roomId ?? null,
    activeRoomNumber: t.contracts?.[0]?.room?.roomNumber ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export const tenantsService = {
  async list(landlordId: number, query: ListTenantsQuery): Promise<TenantListResponse> {
    const { data, total } = await tenantsRepository.list(landlordId, query);
    const totalPages = Math.max(1, Math.ceil(total / query.limit));
    return {
      data: data.map(toResponse),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  },

  async getOne(landlordId: number, id: number): Promise<TenantResponse | null> {
    const tenant = await tenantsRepository.findById(landlordId, id);
    return tenant ? toResponse(tenant) : null;
  },

  async create(landlordId: number, data: CreateTenantInput): Promise<TenantResponse> {
    const dup = await tenantsRepository.findByPhoneExcluding(landlordId, data.phone);
    if (dup) {
      throw new AppError(
        "Số điện thoại đã tồn tại trong danh sách",
        409,
        "PHONE_DUPLICATE"
      );
    }
    const created = await tenantsRepository.create(landlordId, data);
    const full = await tenantsRepository.findById(landlordId, created.id);
    return toResponse(full!);
  },

  async update(
    landlordId: number,
    id: number,
    data: UpdateTenantInput
  ): Promise<TenantResponse | null> {
    const existing = await tenantsRepository.findById(landlordId, id);
    if (!existing) return null;

    if (data.phone && data.phone !== existing.phone) {
      const dup = await tenantsRepository.findByPhoneExcluding(
        landlordId,
        data.phone,
        id
      );
      if (dup) {
        throw new AppError(
          "Số điện thoại đã tồn tại trong danh sách",
          409,
          "PHONE_DUPLICATE"
        );
      }
    }

    await tenantsRepository.update(landlordId, id, data);
    const updated = await tenantsRepository.findById(landlordId, id);
    return toResponse(updated!);
  },

  async remove(landlordId: number, id: number): Promise<{
    ok: boolean;
    reason?: string;
    contractsCount?: number;
  }> {
    const existing = await tenantsRepository.findById(landlordId, id);
    if (!existing) {
      throw new AppError("Không tìm thấy người thuê", 404, "TENANT_NOT_FOUND");
    }
    return tenantsRepository.safeDelete(landlordId, id);
  },
};
