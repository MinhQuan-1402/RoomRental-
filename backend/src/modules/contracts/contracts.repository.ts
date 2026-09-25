import { prisma } from '../../config/prisma';
import { MyActiveContract } from './contracts.types';

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
  async findActiveContractByTenantId(tenantId: number) {
    return prisma.contract.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      include: {
        room: {
          select: {
            id: true,
            roomNumber: true,
            floor: true,
            area: true,
            description: true,
            status: true,
          },
        },
        property: {
          select: { id: true, name: true, address: true },
        },
        tenant: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }
}

export const contractsRepository = new ContractsRepository();
