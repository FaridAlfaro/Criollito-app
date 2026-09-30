import { IBakeQueueRepository } from '../../domain/repositories';
import { TenantContext } from '@/modules/shared/domain/tenant-context';
import { BakeOrder } from '../../domain/entities';

export class FetchBakeQueueUseCase {
  constructor(private readonly bakeQueueRepo: IBakeQueueRepository) {}

  async execute(context: TenantContext): Promise<BakeOrder[]> {
    return this.bakeQueueRepo.fetchQueue(context.tenantId, context.branchId);
  }
}
