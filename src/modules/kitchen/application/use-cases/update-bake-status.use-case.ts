import { IBakeQueueRepository } from '../../domain/repositories';
import { CompleteBakeOrderUseCase } from './complete-bake-order.use-case';
import { UpdateBakeStatusDto, UpdateBakeStatusDtoSchema } from '../dtos/bake-order-dtos';
import { TenantContext } from '@/modules/shared/domain/tenant-context';
import { ValidationError, InfrastructureError, DomainError } from '@/modules/shared/domain/errors';
import { Result } from '@/modules/shared/domain/result';
import { BakeStatus } from '../../domain/entities';

export interface UpdateBakeStatusData {
  success: boolean;
  status: BakeStatus;
  deductedIngredients?: boolean;
  stockAdded?: number;
}

export type UpdateBakeStatusResult = Result<UpdateBakeStatusData, DomainError | InfrastructureError> & UpdateBakeStatusData;

export class UpdateBakeStatusUseCase {
  constructor(
    private readonly bakeQueueRepo: IBakeQueueRepository,
    private readonly completeBakeOrderUseCase: CompleteBakeOrderUseCase
  ) {}

  async execute(input: UpdateBakeStatusDto, context: TenantContext): Promise<UpdateBakeStatusResult> {
    const validation = UpdateBakeStatusDtoSchema.safeParse(input);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(i => i.message).join(', ');
      const valErr = new ValidationError(`Error al actualizar estado de horneado: ${errorMsg}`);
      return Object.assign(Result.err(valErr), {
        success: false,
        status: input.status,
        error: valErr.message,
      }) as UpdateBakeStatusResult;
    }

    const { taskId, status, startedAt } = validation.data;
    const { tenantId } = context;

    if (status === 'COMPLETED') {
      // Completar orden disparando cálculo de BOM y stock elaborado
      const res = await this.completeBakeOrderUseCase.execute(taskId, context);
      if (!res.success) {
        return Object.assign(Result.err(res.error as DomainError), {
          success: false,
          status: 'COMPLETED' as BakeStatus,
          error: (res as any).error?.message || String((res as any).error),
        }) as UpdateBakeStatusResult;
      }
      const data: UpdateBakeStatusData = {
        success: true,
        status: 'COMPLETED',
        deductedIngredients: res.deductedIngredients,
        stockAdded: res.stockAdded,
      };
      return Object.assign(Result.ok(data), data) as UpdateBakeStatusResult;
    }

    try {
      // Actualizar estado intermedio (ej. BAKING o PENDING)
      await this.bakeQueueRepo.updateStatus(
        tenantId,
        taskId,
        status,
        startedAt
      );
      const data: UpdateBakeStatusData = {
        success: true,
        status,
      };
      return Object.assign(Result.ok(data), data) as UpdateBakeStatusResult;
    } catch (err: any) {
      const error = err instanceof DomainError
        ? err
        : new InfrastructureError(err?.message || 'Error al actualizar estado en bake_queue', err);

      return Object.assign(Result.err(error), {
        success: false,
        status,
        error: error.message,
      }) as UpdateBakeStatusResult;
    }
  }
}
