import { Recipe, BakeOrder, BakeStatus } from './entities';
import { DrizzleTransaction } from '@/modules/shared/infrastructure/transaction';

export interface CreateRecipeInput {
  tenantId: string;
  productId: string;
  name: string;
  yieldUnits: number;
  unitsPerTray?: number;
  estimatedMinutes?: number;
  instructions?: string | null;
}

export interface CreateRecipeIngredientInput {
  ingredientProductId: string;
  quantityRequired: number;
  unit?: string;
  wastePercentage?: number;
}

export interface EnqueueBakeOrderInput {
  tenantId: string;
  branchId?: string | null;
  productId: string;
  recipeId?: string | null;
  quantityNeeded: number;
  priority?: number;
  notes?: string | null;
}

export interface IRecipeRepository {
  createRecipe(
    data: CreateRecipeInput, 
    ingredients: CreateRecipeIngredientInput[], 
    tx?: DrizzleTransaction
  ): Promise<Recipe>;

  findRecipeById(
    tenantId: string, 
    recipeId: string, 
    tx?: DrizzleTransaction
  ): Promise<Recipe | null>;

  findActiveRecipeByProduct(
    tenantId: string, 
    productId: string, 
    tx?: DrizzleTransaction
  ): Promise<Recipe | null>;

  listRecipesByTenant(
    tenantId: string, 
    tx?: DrizzleTransaction
  ): Promise<Recipe[]>;
}

export interface IBakeQueueRepository {
  fetchQueue(
    tenantId: string, 
    branchId?: string | null, 
    tx?: DrizzleTransaction
  ): Promise<BakeOrder[]>;

  findOrderById(
    tenantId: string, 
    orderId: string, 
    tx?: DrizzleTransaction
  ): Promise<BakeOrder | null>;

  findExistingActiveOrder(
    tenantId: string, 
    productId: string, 
    tx?: DrizzleTransaction
  ): Promise<BakeOrder | null>;

  enqueueOrder(
    data: EnqueueBakeOrderInput, 
    tx?: DrizzleTransaction
  ): Promise<BakeOrder>;

  updateStatus(
    tenantId: string, 
    orderId: string, 
    status: BakeStatus, 
    startedAt?: Date, 
    completedAt?: Date, 
    tx?: DrizzleTransaction
  ): Promise<void>;

  completeOrderAndDeduct(
    tenantId: string,
    orderId: string,
    completedAt: Date,
    tx?: DrizzleTransaction
  ): Promise<void>;

  deductStock(
    tenantId: string, 
    productId: string, 
    quantity: number, 
    tx?: DrizzleTransaction
  ): Promise<void>;

  addStock(
    tenantId: string, 
    productId: string, 
    quantity: number, 
    tx?: DrizzleTransaction
  ): Promise<void>;
}
