import { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateTenantInput,
  ListTenantsQuery,
  UpdateTenantInput,
} from "./tenants.types";

const prisma = new PrismaClient();

// Subquery: find active contracts (status=ACTIVE) per tenant
const activeContractSelect = {
  id: true,
  roomId: true,
} as const;

export const tenantsRepository = {
  /**
   * Paginated list with optional search + status filter.
   * "ACTIVE"   = has at least 1 ACTIVE contract
   * "INACTIVE" = has 0 ACTIVE contracts
   * "ALL"      = no filter
   */
  async list(landlordId: number, query: ListTenantsQuery) {
    const { page, limit, search, status, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const lid = Number(landlordId);
    const where: Prisma.TenantWhereInput = { landlordId: lid };

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { identityNumber: { contains: search } },
      ];
    }

    if (status === "ACTIVE") {
      where.contracts = { some: { status: "ACTIVE" } };
    } else if (status === "INACTIVE") {
      where.contracts = { none: { status: "ACTIVE" } };
    }

    const [total, tenants] = await Promise.all([
      prisma.tenant.count({ where }),
      prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          contracts: {
            where: { status: "ACTIVE" },
            orderBy: { startDate: "desc" },
            take: 1,
            select: {
              ...activeContractSelect,
              room: { select: { roomNumber: true } },
            },
          },
        },
      }),
    ]);

    return {
      data: tenants.map((t) => ({
        id: t.id,
        fullName: t.fullName,
        phone: t.phone,
        email: t.email,
        identityNumber: t.identityNumber,
        dateOfBirth: t.dateOfBirth, // keep Date | null — service converts
        address: t.address,
        hasActiveContract: t.contracts.length > 0,
        activeContractId: t.contracts[0]?.id ?? null,
        activeRoomId: t.contracts[0]?.roomId ?? null,
        activeRoomNumber: t.contracts[0]?.room?.roomNumber ?? null,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      total,
    };
  },

  async findById(landlordId: number, id: number) {
    return prisma.tenant.findFirst({
      where: { id, landlordId: Number(landlordId) },
      include: {
        contracts: {
          where: { status: "ACTIVE" },
          orderBy: { startDate: "desc" },
          take: 1,
          select: {
            ...activeContractSelect,
            room: { select: { roomNumber: true } },
          },
        },
      },
    });
  },

  async findByPhoneExcluding(
    landlordId: number,
    phone: string,
    excludeId?: number
  ) {
    return prisma.tenant.findFirst({
      where: {
        landlordId: Number(landlordId),
        phone,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
  },

  async create(landlordId: number, data: CreateTenantInput) {
    return prisma.tenant.create({
      data: {
        landlordId: Number(landlordId),
        fullName: data.fullName,
        phone: data.phone,
        email: data.email ?? null,
        identityNumber: data.identityNumber ?? null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        address: data.address ?? null,
      },
    });
  },

  async update(landlordId: number, id: number, data: UpdateTenantInput) {
    return prisma.tenant.update({
      where: { id },
      data: {
        ...(data.fullName !== undefined && { fullName: data.fullName }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email ?? null }),
        ...(data.identityNumber !== undefined && {
          identityNumber: data.identityNumber ?? null,
        }),
        ...(data.dateOfBirth !== undefined && {
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        }),
        ...(data.address !== undefined && { address: data.address ?? null }),
      },
    });
  },

  /**
   * Block delete if tenant has any contract (active or historical).
   * Returns { ok: true } or { ok: false, reason }.
   */
  async safeDelete(
    landlordId: number,
    id: number
  ): Promise<{ ok: true } | { ok: false; reason: string; contractsCount: number }> {
    const contractsCount = await prisma.contract.count({
      where: { tenantId: id, landlordId: Number(landlordId) },
    });
    if (contractsCount > 0) {
      return {
        ok: false,
        reason: "Không thể xóa người thuê đã có hợp đồng. Hãy xóa hợp đồng trước.",
        contractsCount,
      };
    }
    await prisma.tenant.delete({ where: { id } });
    return { ok: true };
  },
};
