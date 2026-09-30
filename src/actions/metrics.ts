'use server';

import { eq, and, gte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { sales, products, bakeQueue, branches, cashSessions } from '@/db/schema';
import { getCurrentUserSession } from '@/lib/auth-session';

export interface BranchMetrics {
  branchId: string | null;
  branchName: string;
  totalSalesToday: number;
  totalSalesCount: number;
}

export interface TenantMetrics {
  totalSalesToday: number;
  totalSalesCount: number;
  lowStockProductsCount: number;
  activeBakeQueueCount: number;
  totalBranches: number;
  activeCashSessions: number;
  byBranch: BranchMetrics[];
}

export async function getTenantMetrics(): Promise<TenantMetrics> {
  const session = await getCurrentUserSession();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // 1. Ventas de hoy filtradas por tenant (aislado)
  let todaySales: (typeof sales.$inferSelect)[] = [];
  try {
    todaySales = await db.select().from(sales).where(
      and(
        eq(sales.tenantId, session.tenantId),
        gte(sales.createdAt, todayStart)
      )
    );
  } catch (err: any) {
    console.error('[Metrics] Error consultando sales:', err?.message || err);
  }

  const totalSalesToday = todaySales.reduce((sum, s) => sum + parseFloat(s.totalAmount || '0'), 0);
  const totalSalesCount = todaySales.length;

  // 2. Productos con stock bajo (aislado)
  let lowStockProductsCount = 0;
  try {
    const allProducts = await db.select().from(products).where(eq(products.tenantId, session.tenantId));
    lowStockProductsCount = allProducts.filter(
      p => parseFloat(p.currentStock || '0') < parseFloat(p.minDailyStock || '0')
    ).length;
  } catch (err: any) {
    console.error('[Metrics] Error consultando products:', err?.message || err);
  }

  // 3. Cola de horneado activa (aislado)
  let activeBakeQueueCount = 0;
  try {
    const activeBakeQueue = await db.select().from(bakeQueue).where(
      and(
        eq(bakeQueue.tenantId, session.tenantId),
        sql`${bakeQueue.status} IN ('PENDING', 'BAKING')`
      )
    );
    activeBakeQueueCount = activeBakeQueue.length;
  } catch (err: any) {
    console.error('[Metrics] Error consultando bakeQueue:', err?.message || err);
  }

  // 4. Sucursales activas (aislado)
  let allBranches: (typeof branches.$inferSelect)[] = [];
  try {
    allBranches = await db.select().from(branches).where(
      and(eq(branches.tenantId, session.tenantId), eq(branches.isActive, true))
    );
  } catch (err: any) {
    console.error('[Metrics] Error consultando branches:', err?.message || err);
  }

  // 5. Sesiones de caja abiertas (aislado con tolerancia a fallo de esquema)
  let activeCashSessions = 0;
  try {
    const openSessions = await db.query.cashSessions.findMany({
      where: (cs, { and, eq, isNull }) => and(
        eq(cs.tenantId, session.tenantId),
        isNull(cs.closedAt)
      )
    });
    activeCashSessions = openSessions.length;
  } catch (err: any) {
    console.error('[Metrics] Error consultando cashSessions (modo degradado):', err?.message || err);
  }

  // Métricas agrupadas por sucursal
  const byBranch: BranchMetrics[] = allBranches.map(branch => {
    const branchSales = todaySales.filter(s => s.branchId === branch.id);
    return {
      branchId: branch.id,
      branchName: branch.name,
      totalSalesToday: branchSales.reduce((sum, s) => sum + parseFloat(s.totalAmount || '0'), 0),
      totalSalesCount: branchSales.length,
    };
  });

  // Ventas sin sucursal asignada
  const unassignedSales = todaySales.filter(s => !s.branchId);
  if (unassignedSales.length > 0) {
    byBranch.push({
      branchId: null,
      branchName: 'Sin sucursal',
      totalSalesToday: unassignedSales.reduce((sum, s) => sum + parseFloat(s.totalAmount || '0'), 0),
      totalSalesCount: unassignedSales.length,
    });
  }

  return {
    totalSalesToday,
    totalSalesCount,
    lowStockProductsCount,
    activeBakeQueueCount,
    totalBranches: allBranches.length,
    activeCashSessions,
    byBranch,
  };
}
