'use server';

import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { products } from '@/db/schema';
import { getCurrentUserSession } from '@/lib/auth-session';

export async function fetchProducts() {
  const session = await getCurrentUserSession();

  // Si hay branchId en la sesión, devolver productos de esa sucursal Y productos sin sucursal asignada (globales del tenant)
  // Si no hay branchId, devolver todos los productos del tenant
  const rows = session.branchId
    ? await db.select().from(products).where(
        and(
          eq(products.tenantId, session.tenantId),
          eq(products.branchId, session.branchId)
        )
      )
    : await db.select().from(products).where(eq(products.tenantId, session.tenantId));

  return rows.map(p => ({
    id: p.id,
    name: p.name,
    type: p.type as 'UNIT' | 'WEIGHT',
    price: parseFloat(p.price),
    currentStock: parseFloat(p.currentStock),
    minDailyStock: parseFloat(p.minDailyStock),
    optimalBatchSize: parseFloat(p.optimalBatchSize),
    barcode: p.barcode ?? undefined,
    branchId: p.branchId ?? undefined,
  }));
}
