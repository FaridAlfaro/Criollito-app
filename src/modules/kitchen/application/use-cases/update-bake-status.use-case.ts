import { IBakeQueueRepository } from '../../domain/repositories';
import { CompleteBakeOrderUseCase } from './complete-bake-order.use-case';
import { UpdateBakeStatusDto, UpdateBakeStatusDtoSchema } from '../dtos/bake-order-dtos';
import { TenantContext } from '@/modules/shared/domain/tenant-context';
import { ValidationError } from '@/modules/shared/domain/errors';

export class UpdateBakeStatusUseCase {
  constructor(
    private readonly bakeQueueRepo: IBakeQueueRepository,
    private readonly completeBakeOrderUseCase: CompleteBakeOrderUseCase
  ) {}

  async execute(input: UpdateBakeStatusDto, context: TenantContext): Promise<void> {
    const validation = UpdateBakeStatusDtoSchema.safeParse(input);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(i => i.message).join(', ');
      throw new ValidationError(`Error al actualizar estado de horneado: ${errorMsg}`);
    }

    const { taskId, status, startedAt } = validation.data;
    const { tenantId } = context;

    if (status === 'COMPLETED') {
      // Completar orden disparando cálculo de BOM y stock elaborado
      await this.completeBakeOrderUseCase.execute(taskId, context);
      return;
    }

    // Actualizar estado intermedio (ej. BAKING o PENDING)
    await this.bakeQueueRepo.updateStatus(
      tenantId,
      taskId,
      status,
      startedAt
    );
  }
}
