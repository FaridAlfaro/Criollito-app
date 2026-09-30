import { IBakeQueueRepository, IRecipeRepository } from '../../domain/repositories';
import { TenantContext } from '@/modules/shared/domain/tenant-context';
import { runInTransaction } from '@/modules/shared/infrastructure/transaction';
import { NotFoundError } from '@/modules/shared/domain/errors';

export class CompleteBakeOrderUseCase {
  constructor(
    private readonly bakeQueueRepo: IBakeQueueRepository,
    private readonly recipeRepo: IRecipeRepository
  ) {}

  async execute(orderId: string, context: TenantContext): Promise<{ success: boolean; deductedIngredients: boolean; stockAdded: number }> {
    const { tenantId } = context;

    return runInTransaction(async (tx) => {
      // 1. Obtener la orden de horneado
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

      // 2. Buscar la receta (escandallo BOM)
      let recipe = order.recipeId 
        ? await this.recipeRepo.findRecipeById(tenantId, order.recipeId, tx)
        : null;

      if (!recipe) {
        recipe = await this.recipeRepo.findActiveRecipeByProduct(tenantId, order.productId, tx);
      }

      // 3. Deducción de Materias Primas según escandallo (BOM)
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

      // 4. Ingreso de Producto Elaborado al stock final
      await this.bakeQueueRepo.addStock(
        tenantId,
        order.productId,
        order.quantityNeeded,
        tx
      );

      // 5. Marcar orden como COMPLETED y setear deductedIngredients = true
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
  }
}
