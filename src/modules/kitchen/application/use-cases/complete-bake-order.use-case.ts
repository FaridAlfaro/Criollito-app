import { IBakeQueueRepository, IRecipeRepository } from '../../domain/repositories';
import { TenantContext } from '@/modules/shared/domain/tenant-context';
import { runInTransaction } from '@/modules/shared/infrastructure/transaction';
import { NotFoundError, InfrastructureError, DomainError } from '@/modules/shared/domain/errors';
import { Result } from '@/modules/shared/domain/result';

export interface CompleteBakeOrderData {
  success: boolean;
  deductedIngredients: boolean;
  stockAdded: number;
}

export type CompleteBakeOrderResult = Result<CompleteBakeOrderData, DomainError | InfrastructureError> & CompleteBakeOrderData;

export class CompleteBakeOrderUseCase {
  constructor(
    private readonly bakeQueueRepo: IBakeQueueRepository,
    private readonly recipeRepo: IRecipeRepository
  ) {}

  async execute(orderId: string, context: TenantContext): Promise<CompleteBakeOrderResult> {
    const { tenantId } = context;

    try {
      const data = await runInTransaction(async (tx) => {
        // 1. Obtener la orden de horneado en curso
        const order = await this.bakeQueueRepo.findOrderById(tenantId, orderId, tx);
        if (!order) {
          throw new NotFoundError('Orden de horneado', orderId);
        }

        // Si ya fue completada y se dedujeron insumos, retornar de forma idempotente
        if (order.status === 'COMPLETED' && order.deductedIngredients) {
          return {
            success: true,
            deductedIngredients: true,
            stockAdded: 0,
          };
        }

        let ingredientsDeducted = false;

        // 2. Buscar la receta (escandallo BOM) asociada o activa para el producto
        let recipe = order.recipeId 
          ? await this.recipeRepo.findRecipeById(tenantId, order.recipeId, tx)
          : null;

        if (!recipe) {
          recipe = await this.recipeRepo.findActiveRecipeByProduct(tenantId, order.productId, tx);
        }

        // 3. Caso con Receta: Deducción atómica de Materias Primas según escandallo (BOM)
        if (recipe && recipe.ingredients && recipe.ingredients.length > 0) {
          const yieldUnits = recipe.yieldUnits > 0 ? recipe.yieldUnits : 1;
          const batchMultiplier = order.quantityNeeded / yieldUnits;

          for (const ingredient of recipe.ingredients) {
            const wasteFactor = 1 + ((ingredient.wastePercentage || 0) / 100);
            const totalDeduct = ingredient.quantityRequired * batchMultiplier * wasteFactor;

            await this.bakeQueueRepo.deductStock(
              tenantId,
              ingredient.ingredientProductId,
              totalDeduct,
              tx
            );
          }
          ingredientsDeducted = true;
        }

        // 4. Ingreso de Producto Elaborado al stock final (tanto con receta como sin receta)
        await this.bakeQueueRepo.addStock(
          tenantId,
          order.productId,
          order.quantityNeeded,
          tx
        );

        // 5. Marcar orden como COMPLETED con completed_at = now()
        await this.bakeQueueRepo.completeOrderAndDeduct(
          tenantId,
          orderId,
          new Date(),
          tx
        );

        return {
          success: true,
          deductedIngredients: ingredientsDeducted,
          stockAdded: order.quantityNeeded,
        };
      });

      return Object.assign(Result.ok(data), data) as CompleteBakeOrderResult;
    } catch (err: any) {
      const error = err instanceof DomainError
        ? err
        : new InfrastructureError(err?.message || 'Error en base de datos al completar orden de horneado', err);

      return Object.assign(Result.err(error), {
        success: false,
        deductedIngredients: false,
        stockAdded: 0,
        error: error.message,
      }) as CompleteBakeOrderResult;
    }
  }
}
