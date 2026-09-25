import { contractsRepository, ContractsRepository } from './contracts.repository';
import { AppError } from '../../utils/app-error';
import { MyActiveContract } from './contracts.types';

export class ContractsService {
  constructor(private repo: ContractsRepository = contractsRepository) {}

  /**
   * Get the ACTIVE contract for the user that is currently logged in.
   * Returns null if the user has no tenant record or no active contract.
   */
  async getMyActiveContract(userId: number): Promise<MyActiveContract | null> {
    const tenant = await this.repo.findTenantByUserId(userId);
    if (!tenant) return null;

    const contract = await this.repo.findActiveContractByTenantId(tenant.id);
    if (!contract) return null;

    return {
      id: contract.id,
      startDate: contract.startDate,
      endDate: contract.endDate,
      rentPrice: Number(contract.rentPrice),
      deposit: Number(contract.deposit),
      billingDay: contract.billingDay,
      status: contract.status,
      terms: contract.terms,
      room: {
        ...contract.room,
        area: contract.room.area ? Number(contract.room.area) : null,
      },
      property: contract.property,
      tenant: contract.tenant,
    };
  }
}

export const contractsService = new ContractsService();
