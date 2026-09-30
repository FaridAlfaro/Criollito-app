import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { recipes, recipeIngredients, products } from '@/db/schema';
import { 
  IRecipeRepository, 
  CreateRecipeInput, 
  CreateRecipeIngredientInput 
} from '../domain/repositories';
import { Recipe, RecipeIngredient } from '../domain/entities';
import { DrizzleTransaction, DbOrTx } from '@/modules/shared/infrastructure/transaction';

export class DrizzleRecipeRepository implements IRecipeRepository {
  private getClient(tx?: DrizzleTransaction): DbOrTx {
    return tx || db;
  }

  async createRecipe(
    data: CreateRecipeInput, 
    ingredientsList: CreateRecipeIngredientInput[], 
    tx?: DrizzleTransaction
  ): Promise<Recipe> {
    const client = this.getClient(tx);

    const [createdRecipe] = await client.insert(recipes).values({
      tenantId: data.tenantId,
      productId: data.productId,
      name: data.name,
      yieldUnits: data.yieldUnits.toString(),
      unitsPerTray: data.unitsPerTray ?? 24,
      estimatedMinutes: data.estimatedMinutes || 45,
      instructions: data.instructions || null,
      isActive: true,
    }).returning();

    const createdIngredients: RecipeIngredient[] = [];

    for (const ing of ingredientsList) {
      const [inserted] = await client.insert(recipeIngredients).values({
        tenantId: data.tenantId,
        recipeId: createdRecipe.id,
        ingredientProductId: ing.ingredientProductId,
        quantityRequired: ing.quantityRequired.toString(),
        unit: ing.unit || 'KG',
        wastePercentage: (ing.wastePercentage || 0).toString(),
      }).returning();

      createdIngredients.push({
        id: inserted.id,
        tenantId: inserted.tenantId,
        recipeId: inserted.recipeId,
        ingredientProductId: inserted.ingredientProductId,
        quantityRequired: parseFloat(inserted.quantityRequired),
        unit: inserted.unit,
        wastePercentage: parseFloat(inserted.wastePercentage),
        createdAt: inserted.createdAt,
      });
    }

    return {
      id: createdRecipe.id,
      tenantId: createdRecipe.tenantId,
      productId: createdRecipe.productId,
      name: createdRecipe.name,
      yieldUnits: parseFloat(createdRecipe.yieldUnits),
      unitsPerTray: createdRecipe.unitsPerTray ?? 24,
      estimatedMinutes: createdRecipe.estimatedMinutes || 45,
      instructions: createdRecipe.instructions,
      isActive: createdRecipe.isActive,
      createdAt: createdRecipe.createdAt,
      updatedAt: createdRecipe.updatedAt,
      ingredients: createdIngredients,
    };
  }

  async findRecipeById(
    tenantId: string, 
    recipeId: string, 
    tx?: DrizzleTransaction
  ): Promise<Recipe | null> {
    const client = this.getClient(tx);

    const [recipe] = await client
      .select({
        r: recipes,
        productName: products.name,
      })
      .from(recipes)
      .leftJoin(products, eq(recipes.productId, products.id))
      .where(and(eq(recipes.tenantId, tenantId), eq(recipes.id, recipeId)));

    if (!recipe) return null;

    const dbIngredients = await client
      .select({
        ing: recipeIngredients,
        ingredientName: products.name,
      })
      .from(recipeIngredients)
      .leftJoin(products, eq(recipeIngredients.ingredientProductId, products.id))
      .where(and(eq(recipeIngredients.tenantId, tenantId), eq(recipeIngredients.recipeId, recipeId)));

    return {
      id: recipe.r.id,
      tenantId: recipe.r.tenantId,
      productId: recipe.r.productId,
      productName: recipe.productName || undefined,
      name: recipe.r.name,
      yieldUnits: parseFloat(recipe.r.yieldUnits),
      unitsPerTray: recipe.r.unitsPerTray ?? 24,
      estimatedMinutes: recipe.r.estimatedMinutes || 45,
      instructions: recipe.r.instructions,
      isActive: recipe.r.isActive,
      createdAt: recipe.r.createdAt,
      updatedAt: recipe.r.updatedAt,
      ingredients: dbIngredients.map(i => ({
        id: i.ing.id,
        tenantId: i.ing.tenantId,
        recipeId: i.ing.recipeId,
        ingredientProductId: i.ing.ingredientProductId,
        ingredientProductName: i.ingredientName || undefined,
        quantityRequired: parseFloat(i.ing.quantityRequired),
        unit: i.ing.unit,
        wastePercentage: parseFloat(i.ing.wastePercentage),
        createdAt: i.ing.createdAt,
      })),
    };
  }

  async findActiveRecipeByProduct(
    tenantId: string, 
    productId: string, 
    tx?: DrizzleTransaction
  ): Promise<Recipe | null> {
    const client = this.getClient(tx);

    const [recipe] = await client
      .select({
        r: recipes,
        productName: products.name,
      })
      .from(recipes)
      .leftJoin(products, eq(recipes.productId, products.id))
      .where(and(
        eq(recipes.tenantId, tenantId), 
        eq(recipes.productId, productId),
        eq(recipes.isActive, true)
      ));

    if (!recipe) return null;

    const dbIngredients = await client
      .select({
        ing: recipeIngredients,
        ingredientName: products.name,
      })
      .from(recipeIngredients)
      .leftJoin(products, eq(recipeIngredients.ingredientProductId, products.id))
      .where(and(eq(recipeIngredients.tenantId, tenantId), eq(recipeIngredients.recipeId, recipe.r.id)));

    return {
      id: recipe.r.id,
      tenantId: recipe.r.tenantId,
      productId: recipe.r.productId,
      productName: recipe.productName || undefined,
      name: recipe.r.name,
      yieldUnits: parseFloat(recipe.r.yieldUnits),
      unitsPerTray: recipe.r.unitsPerTray ?? 24,
      estimatedMinutes: recipe.r.estimatedMinutes || 45,
      instructions: recipe.r.instructions,
      isActive: recipe.r.isActive,
      createdAt: recipe.r.createdAt,
      updatedAt: recipe.r.updatedAt,
      ingredients: dbIngredients.map(i => ({
        id: i.ing.id,
        tenantId: i.ing.tenantId,
        recipeId: i.ing.recipeId,
        ingredientProductId: i.ing.ingredientProductId,
        ingredientProductName: i.ingredientName || undefined,
        quantityRequired: parseFloat(i.ing.quantityRequired),
        unit: i.ing.unit,
        wastePercentage: parseFloat(i.ing.wastePercentage),
        createdAt: i.ing.createdAt,
      })),
    };
  }

  async listRecipesByTenant(
    tenantId: string, 
    tx?: DrizzleTransaction
  ): Promise<Recipe[]> {
    const client = this.getClient(tx);

    const rows = await client
      .select({
        r: recipes,
        productName: products.name,
      })
      .from(recipes)
      .leftJoin(products, eq(recipes.productId, products.id))
      .where(and(eq(recipes.tenantId, tenantId), eq(recipes.isActive, true)));

    return rows.map(row => ({
      id: row.r.id,
      tenantId: row.r.tenantId,
      productId: row.r.productId,
      productName: row.productName || undefined,
      name: row.r.name,
      yieldUnits: parseFloat(row.r.yieldUnits),
      unitsPerTray: row.r.unitsPerTray ?? 24,
      estimatedMinutes: row.r.estimatedMinutes || 45,
      instructions: row.r.instructions,
      isActive: row.r.isActive,
      createdAt: row.r.createdAt,
      updatedAt: row.r.updatedAt,
    }));
  }
}
