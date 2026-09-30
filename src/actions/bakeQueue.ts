'use server';

import { getCurrentUserSession } from '@/lib/auth-session';
import { 
  fetchBakeQueueUseCase, 
  updateBakeStatusUseCase, 
  queueBakeOrderUseCase,
  recipeRepository,
  BakeOrder,
  Recipe
} from '@/modules/kitchen';
import { revalidatePath } from 'next/cache';
import { bakeQueue } from '@/db/schema';

export type BakeQueueRow = typeof bakeQueue.$inferSelect & { productName: string; productType: string };

/**
 * Server Action Thin Controller: Obtiene las tareas activas de la cola de horneado (KDS).
 */
export async function fetchBakeQueue(): Promise<BakeQueueRow[]> {
  const session = await getCurrentUserSession();

  const orders = await fetchBakeQueueUseCase.execute({
    tenantId: session.tenantId,
    branchId: session.branchId,
    userId: session.id,
    role: session.role,
    name: session.name,
  });

  return orders.map(o => ({
    id: o.id,
    tenantId: o.tenantId,
    branchId: o.branchId,
    productId: o.productId,
    recipeId: o.recipeId,
    quantityNeeded: o.quantityNeeded.toString(),
    status: o.status,
    priority: o.priority,
    notes: o.notes,
    deductedIngredients: o.deductedIngredients,
    requestedAt: o.requestedAt,
    startedAt: o.startedAt,
    completedAt: o.completedAt,
    productName: o.productName ?? 'Producto eliminado',
    productType: o.productType ?? 'UNIT',
  }));
}

/**
 * Server Action Thin Controller: Actualiza el estado de una orden en el KDS.
 * Si status es COMPLETED, deduce automáticamente las materias primas (BOM) e incrementa el producto terminado.
 */
export async function updateBakeTaskStatus(
  taskId: string,
  status: 'BAKING' | 'COMPLETED',
  startedAt?: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getCurrentUserSession();

    const result = await updateBakeStatusUseCase.execute({
      taskId,
      status,
      startedAt,
    }, {
      tenantId: session.tenantId,
      branchId: session.branchId,
      userId: session.id,
      role: session.role,
      name: session.name,
    });

    if (!result.success) {
      const errorMsg = (result as any).error?.message || (result as any).error || 'Error al actualizar estado de la orden';
      console.error('[Action Error] updateBakeTaskStatus falló:', {
        severity: 'ERROR',
        taskId,
        status,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      });
      return { success: false, error: errorMsg };
    }

    console.log(`[BAKE_ACTION_SUCCESS] Orden actualizada: ${taskId} -> ${status}`);

    revalidatePath('/baker');
    revalidatePath('/admin');
    revalidatePath('/pos');
    revalidatePath('/supervisor');

    return { success: true };
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[Action Error] updateBakeTaskStatus excepción no controlada:', {
      severity: 'ERROR',
      taskId,
      status,
      error: errorMsg,
      timestamp: new Date().toISOString(),
    });
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action Thin Controller: Solicita una tarea de horneado (manual o por stock bajo).
 */
export async function requestBakeTask(productId: string, quantityNeeded: number): Promise<void> {
  const session = await getCurrentUserSession();

  await queueBakeOrderUseCase.execute({
    productId,
    quantityNeeded,
  }, {
    tenantId: session.tenantId,
    branchId: session.branchId,
    userId: session.id,
    role: session.role,
    name: session.name,
  });

  revalidatePath('/baker');
  revalidatePath('/admin');
}

/**
 * Server Action Thin Controller: Creación de órdenes de horneado con roles ADMIN / OWNER / SUPER_ADMIN.
 * Admite asignación por bandejas, docenas o unidades directas con prioridad y notas.
 */
export async function createBakeOrderAction(data: {
  productId: string;
  recipeId?: string | null;
  quantityNeeded: number;
  priority?: number;
  notes?: string | null;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const session = await getCurrentUserSession();

    const allowedRoles = ['ADMIN', 'SUPERVISOR', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(session.role) && (session.role as string) !== 'OWNER') {
      return { 
        success: false, 
        error: 'Acceso no autorizado. Se requiere rol ADMIN o DUEÑO para crear órdenes de horneado.' 
      };
    }

    const order = await queueBakeOrderUseCase.execute({
      productId: data.productId,
      recipeId: data.recipeId || null,
      quantityNeeded: data.quantityNeeded,
      priority: data.priority ?? 1,
      notes: data.notes || null,
    }, {
      tenantId: session.tenantId,
      branchId: session.branchId,
      userId: session.id,
      role: session.role,
      name: session.name,
    });

    revalidatePath('/baker');
    revalidatePath('/admin');
    revalidatePath('/supervisor');

    return { success: true, data: order };
  } catch (err: any) {
    console.error('[Action Error] createBakeOrderAction:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Server Action Thin Controller: Lista las recetas activas del tenant con su configuración de unidades por bandeja.
 */
export async function fetchActiveRecipes(): Promise<Recipe[]> {
  const session = await getCurrentUserSession();
  return recipeRepository.listRecipesByTenant(session.tenantId);
}
