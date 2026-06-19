'use server';

import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { cashSessions, cashMovements, sales, users, products, saleItems } from '@/db/schema';
import { getCurrentUserSession } from '@/lib/auth-session';
import { revalidatePath } from 'next/cache';

export async function openSession(initialAmount: number) {
  const session = await getCurrentUserSession();

  // Verificar si hay sesión activa (abierta) para este cajero/tenant
  const activeSession = await db.query.cashSessions.findFirst({
    where: (cs, { and, eq, isNull }) => and(
      eq(cs.tenantId, session.tenantId),
      eq(cs.cashierId, session.id),
      isNull(cs.closedAt)
    )
  });

  if (activeSession) {
    return activeSession;
  }

  const [newSession] = await db.insert(cashSessions).values({
    tenantId: session.tenantId,
    branchId: session.branchId,
    cashierId: session.id,
    initialAmount: initialAmount.toString(),
    theoreticalAmount: initialAmount.toString(),
  }).returning();

  revalidatePath('/pos');
  return newSession;
}

export async function registerMovement(
  sessionId: string,
  type: 'INGRESO' | 'EGRESO_PROVEEDOR' | 'EGRESO_SUELDO' | 'EGRESO_VARIOS',
  amount: number,
  description: string
) {
  const session = await getCurrentUserSession();

  const [movement] = await db.insert(cashMovements).values({
    tenantId: session.tenantId,
    branchId: session.branchId,
    cashSessionId: sessionId,
    cashierId: session.id,
    type,
    amount: amount.toString(),
    description,
  }).returning();

  revalidatePath('/pos');
  return movement;
}

export async function closeSession(sessionId: string, countedCash: number) {
  const session = await getCurrentUserSession();

  // 1. Obtener la sesión y verificar pertenece al tenant
  const [cashSession] = await db.select().from(cashSessions).where(
    and(
      eq(cashSessions.id, sessionId),
      eq(cashSessions.tenantId, session.tenantId)
    )
  );

  if (!cashSession) {
    throw new Error('Sesión de caja no encontrada o sin acceso.');
  }

  const initial = parseFloat(cashSession.initialAmount);

  // 2. Obtener ventas por método de pago
  const allSales = await db.select().from(sales).where(eq(sales.cashSessionId, sessionId));

  let totalSalesCash = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  let totalQr = 0;

  for (const s of allSales) {
    const amt = parseFloat(s.totalAmount);
    if (s.paymentMethod === 'CASH') totalSalesCash += amt;
    else if (s.paymentMethod === 'DEBIT') totalDebit += amt;
    else if (s.paymentMethod === 'CREDIT') totalCredit += amt;
    else if (s.paymentMethod === 'QR') totalQr += amt;
  }

  // 3. Obtener movimientos
  const movements = await db.select().from(cashMovements).where(eq(cashMovements.cashSessionId, sessionId));

  let totalIngresos = 0;
  let totalEgresos = 0;

  for (const m of movements) {
    const val = parseFloat(m.amount);
    if (m.type === 'INGRESO') totalIngresos += val;
    else totalEgresos += val;
  }

  // 4. Calcular totales
  const theoreticalTotal = initial + totalSalesCash + totalIngresos - totalEgresos;
  const difference = countedCash - theoreticalTotal;

  // 5. Cerrar la sesión
  const [updatedSession] = await db.update(cashSessions)
    .set({
      closedAt: new Date(),
      finalAmount: countedCash.toString(),
      totalSales: (totalSalesCash + totalDebit + totalCredit + totalQr).toString(),
      totalCash: totalSalesCash.toString(),
      totalDebit: totalDebit.toString(),
      totalCredit: totalCredit.toString(),
      totalQr: totalQr.toString(),
      theoreticalAmount: theoreticalTotal.toString(),
      difference: difference.toString(),
    })
    .where(eq(cashSessions.id, sessionId))
    .returning();

  revalidatePath('/pos');
  revalidatePath('/admin');

  return {
    session: updatedSession,
    summary: {
      initialAmount: initial,
      totalSalesCash,
      totalDebit,
      totalCredit,
      totalQr,
      totalIngresos,
      totalEgresos,
      theoreticalTotal,
      countedCash,
      difference,
    }
  };
}

export async function getBranchWorkers() {
  const session = await getCurrentUserSession();

  const query = session.branchId
    ? and(eq(users.tenantId, session.tenantId), eq(users.branchId, session.branchId))
    : eq(users.tenantId, session.tenantId);

  const workers = await db.select().from(users).where(query);

  return workers.map(w => ({
    id: w.id,
    name: w.name,
    role: w.role,
  }));
}

export async function getSessionHistory(sessionId: string) {
  const session = await getCurrentUserSession();

  // Verificar que la sesión pertenece al tenant
  const [cashSession] = await db.select().from(cashSessions).where(
    and(
      eq(cashSessions.id, sessionId),
      eq(cashSessions.tenantId, session.tenantId)
    )
  );

  if (!cashSession) {
    throw new Error('Sesión no encontrada o sin acceso.');
  }

  const movements = await db.select().from(cashMovements).where(eq(cashMovements.cashSessionId, sessionId));
  const dbSales = await db.select().from(sales).where(eq(sales.cashSessionId, sessionId));

  const salesWithItems = [];
  for (const s of dbSales) {
    const items = await db.select().from(saleItems).where(eq(saleItems.saleId, s.id));
    const itemsWithProduct = [];
    for (const item of items) {
      const [prod] = await db.select().from(products).where(eq(products.id, item.productId));
      itemsWithProduct.push({
        productId: item.productId,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        subtotal: parseFloat(item.subtotal),
        name: prod ? prod.name : 'Producto eliminado',
      });
    }
    salesWithItems.push({
      id: s.id,
      createdAt: s.createdAt,
      totalAmount: parseFloat(s.totalAmount),
      paymentMethod: s.paymentMethod as 'CASH' | 'DEBIT' | 'CREDIT' | 'QR',
      comprobanteTipo: s.comprobanteTipo,
      clienteDocumento: s.clienteDocumento,
      cae: s.cae,
      caeExpiration: s.caeExpiration,
      numeroComprobante: s.numeroComprobante,
      qrCodeData: s.qrCodeData,
      items: itemsWithProduct,
    });
  }

  return {
    movements: movements.map(m => ({
      id: m.id,
      type: m.type as 'INGRESO' | 'EGRESO_PROVEEDOR' | 'EGRESO_SUELDO' | 'EGRESO_VARIOS',
      amount: parseFloat(m.amount),
      description: m.description,
      createdAt: m.createdAt,
    })),
    sales: salesWithItems,
  };
}
