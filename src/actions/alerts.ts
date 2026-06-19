'use server';

import { eq, and, or, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { alerts, branches } from '@/db/schema';
import { getCurrentUserSession } from '@/lib/auth-session';
import { revalidatePath } from 'next/cache';

export type AlertRow = typeof alerts.$inferSelect;

export async function fetchAlerts(): Promise<AlertRow[]> {
  const session = await getCurrentUserSession();

  // CASHIER y BAKER: solo ven alertas de su tenant que sean:
  //   - globales (targetBranchId IS NULL), O
  //   - específicas de su sucursal (targetBranchId = session.branchId)
  if (session.role === 'CASHIER' || session.role === 'BAKER') {
    return db.select().from(alerts).where(
      and(
        eq(alerts.tenantId, session.tenantId),
        or(
          isNull(alerts.targetBranchId),
          session.branchId
            ? eq(alerts.targetBranchId, session.branchId)
            : isNull(alerts.targetBranchId)
        )
      )
    );
  }

  // ADMIN, SUPERVISOR, SUPER_ADMIN: ven todas las alertas del tenant
  return db.select().from(alerts).where(eq(alerts.tenantId, session.tenantId));
}

export async function createAlert(
  message: string,
  type: 'LOW_STOCK' | 'SYSTEM',
  targetBranchId?: string | null
): Promise<AlertRow> {
  const session = await getCurrentUserSession();

  // Solo ADMIN y SUPERVISOR pueden crear alertas manualmente
  if (session.role !== 'ADMIN' && session.role !== 'SUPERVISOR' && session.role !== 'SUPER_ADMIN') {
    throw new Error('Sin permisos para crear alertas. Se requiere rol ADMIN o SUPERVISOR.');
  }

  // Validar que la sucursal objetivo pertenece al mismo tenant (Zero-Trust)
  if (targetBranchId) {
    const [branch] = await db.select().from(branches).where(
      and(
        eq(branches.id, targetBranchId),
        eq(branches.tenantId, session.tenantId)
      )
    );
    if (!branch) {
      throw new Error('Sucursal no encontrada o no pertenece a su organización.');
    }
  }

  const [alert] = await db.insert(alerts).values({
    tenantId: session.tenantId, // SIEMPRE de la sesión, nunca del cliente
    targetBranchId: targetBranchId ?? null,
    type,
    message,
    isRead: false,
  }).returning();

  revalidatePath('/admin');
  revalidatePath('/pos');
  revalidatePath('/baker');

  return alert;
}

export async function markAlertAsRead(alertId: string): Promise<void> {
  const session = await getCurrentUserSession();

  // Verificar que la alerta pertenece al tenant (Zero-Trust)
  await db.update(alerts)
    .set({ isRead: true })
    .where(
      and(
        eq(alerts.id, alertId),
        eq(alerts.tenantId, session.tenantId)
      )
    );

  revalidatePath('/pos');
  revalidatePath('/baker');
}
