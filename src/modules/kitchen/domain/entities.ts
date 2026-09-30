export type BakeStatus = 'PENDING' | 'BAKING' | 'COMPLETED';

export interface RecipeIngredient {
  id: string;
  tenantId: string;
  recipeId: string;
  ingredientProductId: string;
  ingredientProductName?: string;
  quantityRequired: number; // Cantidad requerida para el lote base de la receta
  unit: string;             // KG, G, L, ML, UNIDAD
  wastePercentage: number;  // Merma técnica de producción (%)
  createdAt: Date;
}

export interface Recipe {
  id: string;
  tenantId: string;
  productId: string;        // Producto final elaborado
  productName?: string;
  name: string;             // Nombre del escandallo / fórmula
  yieldUnits: number;       // Unidades o kilogramos que produce la tanda base
  unitsPerTray?: number;    // Capacidad estándar de piezas por bandeja (default 24)
  estimatedMinutes: number; // Tiempo estimado de horneado/preparación
  instructions: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  ingredients?: RecipeIngredient[];
}

export interface BakeOrder {
  id: string;
  tenantId: string;
  branchId: string | null;
  productId: string;
  productName?: string;
  productType?: string;
  recipeId: string | null;
  quantityNeeded: number;
  status: BakeStatus;
  priority: number;
  notes: string | null;
  deductedIngredients: boolean;
  requestedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}
