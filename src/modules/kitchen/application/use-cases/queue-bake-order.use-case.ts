import { IBakeQueueRepository, IRecipeRepository } from '../../domain/repositories';
import { QueueBakeOrderDto, QueueBakeOrderDtoSchema } from '../dtos/bake-order-dtos';
import { TenantContext } from '@/modules/shared/domain/tenant-context';
import { ValidationError } from '@/modules/shared/domain/errors';
import { BakeOrder } from '../../domain/entities';

export class QueueBakeOrderUseCase {
  constructor(
    private readonly bakeQueueRepo: IBakeQueueRepository,
    private readonly recipeRepo: IRecipeRepository
  ) {}

  async execute(input: QueueBakeOrderDto, context: TenantContext): Promise<BakeOrder | null> {
    const validation = QueueBakeOrderDtoSchema.safeParse(input);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(i => i.message).join(', ');
      throw new ValidationError(`Error al encolar orden de horneado: ${errorMsg}`);
    }

    const { productId, quantityNeeded, priority, notes } = validation.data;
    const { tenantId, branchId } = context;

    // 1. Evitar duplicar si ya existe tanda en cola o en horneado
    const existing = await this.bakeQueueRepo.findExistingActiveOrder(tenantId, productId);
    if (existing) {
      return existing; // Ya está activa en la cola
    }

    // 2. Asociar receta si no vino provista
    let recipeId = validation.data.recipeId;
    if (!recipeId) {
      const activeRecipe = await this.recipeRepo.findActiveRecipeByProduct(tenantId, productId);
      if (activeRecipe) {
        recipeId = activeRecipe.id;
      }
    }

    // 3. Insertar en cola de horneado
    return this.bakeQueueRepo.enqueueOrder({
      tenantId,
      branchId,
      productId,
      recipeId,
      quantityNeeded,
      priority,
      notes,
    });
  }
}
