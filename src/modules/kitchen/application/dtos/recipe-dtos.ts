import { z } from 'zod';

export const RecipeIngredientDtoSchema = z.object({
  ingredientProductId: z.string().min(1, 'El ID de la materia prima es requerido'),
  quantityRequired: z.number().positive('La cantidad requerida debe ser positiva'),
  unit: z.string().default('KG'),
  wastePercentage: z.number().min(0).max(100).default(0),
});

export const CreateRecipeDtoSchema = z.object({
  productId: z.string().min(1, 'El ID del producto terminado es requerido'),
  name: z.string().min(2, 'El nombre de la receta debe tener al menos 2 caracteres'),
  yieldUnits: z.number().positive('El rendimiento debe ser mayor a 0').default(1),
  unitsPerTray: z.number().int().positive().default(24).optional(),
  estimatedMinutes: z.number().int().positive().default(45),
  instructions: z.string().optional().nullable(),
  ingredients: z.array(RecipeIngredientDtoSchema).min(1, 'La receta debe tener al menos un ingrediente / insumo'),
});

export type RecipeIngredientDto = z.infer<typeof RecipeIngredientDtoSchema>;
export type CreateRecipeDto = z.infer<typeof CreateRecipeDtoSchema>;
