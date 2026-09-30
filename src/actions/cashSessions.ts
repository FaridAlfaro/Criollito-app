'use server';

import { getCurrentUserSession } from '@/lib/auth-session';
import { 
  openCashSessionUseCase, 
  registerCashMovementUseCase, 
  closeCashSessionUseCase, 
  getBranchWorkersUseCase, 
  getSessionHistoryUseCase 
} from '@/modules/sales';
import { revalidatePath } from 'next/cache';

/**
 * Server Action Thin Controller: Abre una sesión de caja.
 */
export async function openSession(initialAmount: number) {
  const session = await getCurrentUserSession();

  const newOrActiveSession = await openCashSessionUseCase.execute(
    { initialAmount },
    {
      tenantId: session.tenantId,
      branchId: session.branchId,
      userId: session.id,
      role: session.role,
      name: session.name,
    }
  );

  revalidatePath('/pos');
  return newOrActiveSession;
}

/**
 * Server Action Thin Controller: Registra un movimiento de caja.
 */
export async function registerMovement(
  sessionId: string,
  type: 'INGRESO' | 'EGRESO_PROVEEDOR' | 'EGRESO_SUELDO' | 'EGRESO_VARIOS',
  amount: number,
  description: string
) {
  const session = await getCurrentUserSession();

  const movement = await registerCashMovementUseCase.execute(
    {
      sessionId,
      type,
      amount,
      description,
    },
    {
      tenantId: session.tenantId,
      branchId: session.branchId,
      userId: session.id,
      role: session.role,
      name: session.name,
    }
  );

  revalidatePath('/pos');
  return movement;
}

/**
 * Server Action Thin Controller: Cierra la sesión de caja y calcula arqueo.
 */
export async function closeSession(sessionId: string, countedCash: number) {
  const session = await getCurrentUserSession();

  const result = await closeCashSessionUseCase.execute(
    {
      sessionId,
      countedCash,
    },
    {
      tenantId: session.tenantId,
      branchId: session.branchId,
      userId: session.id,
      role: session.role,
      name: session.name,
    }
  );

  revalidatePath('/pos');
  revalidatePath('/admin');

  return result;
}

/**
 * Server Action Thin Controller: Obtiene los trabajadores asignados a la sucursal.
 */
export async function getBranchWorkers() {
  const session = await getCurrentUserSession();

  return getBranchWorkersUseCase.execute({
    tenantId: session.tenantId,
    branchId: session.branchId,
    userId: session.id,
    role: session.role,
    name: session.name,
  });
}

/**
 * Server Action Thin Controller: Obtiene el historial de movimientos y ventas de una sesión.
 */
export async function getSessionHistory(sessionId: string) {
  const session = await getCurrentUserSession();

  return getSessionHistoryUseCase.execute(sessionId, {
    tenantId: session.tenantId,
    branchId: session.branchId,
    userId: session.id,
    role: session.role,
    name: session.name,
  });
}
