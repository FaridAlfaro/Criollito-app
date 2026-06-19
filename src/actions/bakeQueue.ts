'use server';

import { eq, and, or, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { bakeQueue, products } from '@/db/schema';
import { getCurrentUserSession } from '@/lib/auth-session';
import { revalidatePath } from 'next/cache';

export type BakeQueueRow = typeof bakeQueue.$inferSelect & { productName: string; productType: string };

export async function fetchBakeQueue(): Promise<BakeQueueRow[]> {
  const session = await getCurrentUserSession();

  // Filtrar por sucursal si corresponde, o por tenant completo
  const query = session.branchId
    ? and(
        eq(bakeQueue.tenantId, session.tenantId),
        or(
          eq(bakeQueue.branchId, session.branchId),
          isNull(bakeQueue.branchId)
        ),
        or(
          eq(bakeQueue.status, 'PENDING'),
          eq(bakeQueue.status, 'BAKING')
        )
      )
    : and(
        eq(bakeQueue.tenantId, session.tenantId),
        or(
          eq(bakeQueue.status, 'PENDING'),
          eq(bakeQueue.status, 'BAKING')
        )
      );

  const rows = await db.select({
    bq: bakeQueue,
    productName: products.name,
    productType: products.type,
  })
    .from(bakeQueue)
    .leftJoin(products, eq(bakeQueue.productId, products.id))
    .where(query);

  return rows.map(r => ({
    ...r.bq,
    productName: r.productName ?? 'Producto eliminado',
    productType: r.productType ?? 'UNIT',
  }));
}

export async function updateBakeTaskStatus(
  taskId: string,
  status: 'BAKING' | 'COMPLETED',
  startedAt?: Date
): Promise<void> {
  const session = await getCurrentUserSession();

  const updateData: Record<string, any> = { status };
  if (status === 'BAKING' && startedAt) updateData.startedAt = startedAt;
  if (status === 'COMPLETED') updateData.completedAt = new Date();

  await db.update(bakeQueue)
    .set(updateData)
    .where(
      and(
        eq(bakeQueue.id, taskId),
        eq(bakeQueue.tenantId, session.tenantId)
      )
    );

  revalidatePath('/baker');
  revalidatePath('/admin');
}

export async function requestBakeTask(productId: string, quantityNeeded: number): Promise<void> {
  const session = await getCurrentUserSession();

  // Verificar que el producto pertenece al tenant
  const [product] = await db.select().from(products).where(
    and(eq(products.id, productId), eq(products.tenantId, session.tenantId))
  );
  if (!product) throw new Error('Producto no encontrado.');

  // Evitar duplicados en cola activa
  const existing = await db.query.bakeQueue.findFirst({
    where: (bq, { and, eq, or }) => and(
      eq(bq.productId, productId),
      eq(bq.tenantId, session.tenantId),
      or(eq(bq.status, 'PENDING'), eq(bq.status, 'BAKING'))
    )
  });

  if (existing) return; // Ya está en cola

  await db.insert(bakeQueue).values({
    tenantId: session.tenantId,
    branchId: session.branchId,
    productId,
    quantityNeeded: quantityNeeded.toString(),
    status: 'PENDING',
  });

  revalidatePath('/baker');
  revalidatePath('/admin');
}
