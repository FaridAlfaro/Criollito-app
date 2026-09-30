import { ICashSessionRepository } from '../../domain/repositories';
import { TenantContext } from '@/modules/shared/domain/tenant-context';

export class GetBranchWorkersUseCase {
  constructor(private readonly cashSessionRepo: ICashSessionRepository) {}

  async execute(context: TenantContext): Promise<{ id: string; name: string; role: string }[]> {
    return this.cashSessionRepo.findBranchWorkers(context.tenantId, context.branchId);
  }
}
