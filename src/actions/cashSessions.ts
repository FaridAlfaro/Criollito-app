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
 * Maneja excepciones con severidad ERROR estructurado y código identificable.
 */
export async function openSession(initialAmount: number) {
  try {
    const session = await getCurrentUserSession();

    const result = await openCashSessionUseCase.execute(
      { initialAmount },
      {
        tenantId: session.tenantId,
        branchId: session.branchId,
        userId: session.id,
        role: session.role,
        name: session.name,
      }
    );

    if (!result.success) {
      const errObj = 'error' in result ? result.error : null;
      const errorCode = (errObj as any)?.code || 'INFRASTRUCTURE_ERROR';
      const errorMessage = typeof errObj === 'string' ? errObj : (errObj as any)?.message || 'Error al abrir sesión de caja';

      console.error(JSON.stringify({
        severity: 'ERROR',
        event: 'OPEN_CASH_SESSION_FAILED',
        code: errorCode,
        message: errorMessage,
        tenantId: session.tenantId,
        branchId: session.branchId,
        userId: session.id,
        timestamp: new Date().toISOString(),
      }));

      return {
        success: false,
        code: errorCode,
        error: errorMessage,
      };
    }

    revalidatePath('/pos');
    // Mantiene compatibilidad: retorna la entidad de sesión (con data y propiedades directas)
    const sessionData = result.data || result;
    return {
      success: true,
      ...sessionData,
    };
  } catch (err: any) {
    const errorCode = err?.code || 'UNHANDLED_EXCEPTION';
    const errorMessage = err instanceof Error ? err.message : String(err);

    console.error(JSON.stringify({
      severity: 'ERROR',
      event: 'OPEN_CASH_SESSION_CRITICAL_EXCEPTION',
      code: errorCode,
      message: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
      timestamp: new Date().toISOString(),
    }));

    return {
      success: false,
      code: errorCode,
      error: errorMessage,
    };
  }
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
  try {
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
  } catch (err: any) {
    console.error(JSON.stringify({
      severity: 'ERROR',
      event: 'REGISTER_MOVEMENT_FAILED',
      message: err?.message || String(err),
      sessionId,
      type,
      amount,
      timestamp: new Date().toISOString(),
    }));
    throw err;
  }
}

/**
 * Server Action Thin Controller: Cierra la sesión de caja y calcula arqueo.
 */
export async function closeSession(sessionId: string, countedCash: number) {
  try {
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
  } catch (err: any) {
    console.error(JSON.stringify({
      severity: 'ERROR',
      event: 'CLOSE_SESSION_FAILED',
      message: err?.message || String(err),
      sessionId,
      countedCash,
      timestamp: new Date().toISOString(),
    }));
    throw err;
  }
}

/**
 * Server Action Thin Controller: Obtiene los trabajadores asignados a la sucursal.
 */
export async function getBranchWorkers() {
  try {
    const session = await getCurrentUserSession();

    return await getBranchWorkersUseCase.execute({
      tenantId: session.tenantId,
      branchId: session.branchId,
      userId: session.id,
      role: session.role,
      name: session.name,
    });
  } catch (err: any) {
    console.error('[Action Error] getBranchWorkers falló:', err?.message || err);
    return [];
  }
}

/**
 * Server Action Thin Controller: Obtiene el historial de movimientos y ventas de una sesión.
 */
export async function getSessionHistory(sessionId: string) {
  try {
    const session = await getCurrentUserSession();

    return await getSessionHistoryUseCase.execute(sessionId, {
      tenantId: session.tenantId,
      branchId: session.branchId,
      userId: session.id,
      role: session.role,
      name: session.name,
    });
  } catch (err: any) {
    console.error('[Action Error] getSessionHistory falló:', err?.message || err);
    return { sales: [], movements: [] };
  }
}
