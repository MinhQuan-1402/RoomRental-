import { prisma } from '../../config/prisma';

export class ContractsRepository {
  /**
   * Look up the Tenant record that is linked to a user account (via Tenant.userId).
   * Returns null if the user is not yet a tenant (no link).
   */
  async findTenantByUserId(userId: number) {
    return prisma.tenant.findFirst({
      where: { userId },
      orderBy: { id: 'desc' },
    });
  }

  /**
   * Find the most recent ACTIVE contract for a tenant.
   * "Most recent" so the UI always shows the contract they're currently bound to.
   */
  async findActiveContractByUserId(userId: number) {
    return prisma.contract.findFirst({
      where: { tenant: { userId }, status: 'ACTIVE' },
      include: {
        room: {
          select: {
            id: true,
            roomNumber: true,
            floor: true,
            area: true,
            description: true,
            address: true,
            status: true,
          },
        },
        tenant: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * Find a single contract by id with full landlord / tenant / room context.
   * Used for ownership checks on file upload / download.
   */
  async findContractById(contractId: number) {
    return prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        room: { select: { id: true, roomNumber: true } },
        tenant: { select: { id: true, userId: true, fullName: true } },
      },
    });
  }

  /**
   * Update the file metadata on a contract after a successful upload.
   * Version is incremented atomically by the caller.
   */
  async updateContractFile(
    contractId: number,
    data: {
      fileName: string;
      fileMimeType: string;
      fileSize: number;
      fileVersion: number;
      fileUploadedAt: Date;
    }
  ) {
    return prisma.contract.update({
      where: { id: contractId },
      data,
      select: {
        id: true,
        fileName: true,
        fileMimeType: true,
        fileSize: true,
        fileVersion: true,
        fileUploadedAt: true,
      },
    });
  }

  /**
   * List all contracts owned by a landlord, with related room and tenant.
   * Includes file metadata so the UI can show "has file / v1 / v2 ...".
   */
  async listContractsForLandlord(landlordId: number) {
    return prisma.contract.findMany({
      where: { landlordId },
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
      include: {
        room: { select: { id: true, roomNumber: true, address: true } },
        tenant: {
          select: { id: true, fullName: true, phone: true },
        },
      },
    });
  }
}

export const contractsRepository = new ContractsRepository();
