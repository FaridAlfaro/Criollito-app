import { IRecipeRepository } from '../../domain/repositories';
import { CreateRecipeDto, CreateRecipeDtoSchema } from '../dtos/recipe-dtos';
import { TenantContext } from '@/modules/shared/domain/tenant-context';
import { ValidationError } from '@/modules/shared/domain/errors';
import { Recipe } from '../../domain/entities';

export class CreateRecipeUseCase {
  constructor(private readonly recipeRepo: IRecipeRepository) {}

  async execute(input: CreateRecipeDto, context: TenantContext): Promise<Recipe> {
    const validation = CreateRecipeDtoSchema.safeParse(input);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(i => i.message).join(', ');
      throw new ValidationError(`Error al validar receta: ${errorMsg}`);
    }

    const data = validation.data;
    const { tenantId } = context;

    return this.recipeRepo.createRecipe({
      tenantId,
      productId: data.productId,
      name: data.name,
      yieldUnits: data.yieldUnits,
      unitsPerTray: data.unitsPerTray,
      estimatedMinutes: data.estimatedMinutes,
      instructions: data.instructions,
    }, data.ingredients.map(ing => ({
      ingredientProductId: ing.ingredientProductId,
      quantityRequired: ing.quantityRequired,
      unit: ing.unit,
      wastePercentage: ing.wastePercentage,
    })));
  }
}
