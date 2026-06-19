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

  // Ventas de hoy filtradas por tenant
  const todaySales = await db.select().from(sales).where(
    and(
      eq(sales.tenantId, session.tenantId),
      gte(sales.createdAt, todayStart)
    )
  );

  const totalSalesToday = todaySales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);
  const totalSalesCount = todaySales.length;

  // Productos con stock bajo
  const allProducts = await db.select().from(products).where(eq(products.tenantId, session.tenantId));
  const lowStockProductsCount = allProducts.filter(
    p => parseFloat(p.currentStock) < parseFloat(p.minDailyStock)
  ).length;

  // Cola de horneado activa
  const activeBakeQueue = await db.select().from(bakeQueue).where(
    and(
      eq(bakeQueue.tenantId, session.tenantId),
      sql`${bakeQueue.status} IN ('PENDING', 'BAKING')`
    )
  );

  // Sucursales activas
  const allBranches = await db.select().from(branches).where(
    and(eq(branches.tenantId, session.tenantId), eq(branches.isActive, true))
  );

  // Sesiones de caja abiertas
  const openSessions = await db.query.cashSessions.findMany({
    where: (cs, { and, eq, isNull }) => and(
      eq(cs.tenantId, session.tenantId),
      isNull(cs.closedAt)
    )
  });

  // Métricas agrupadas por sucursal
  const byBranch: BranchMetrics[] = allBranches.map(branch => {
    const branchSales = todaySales.filter(s => s.branchId === branch.id);
    return {
      branchId: branch.id,
      branchName: branch.name,
      totalSalesToday: branchSales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0),
      totalSalesCount: branchSales.length,
    };
  });

  // Ventas sin sucursal asignada
  const unassignedSales = todaySales.filter(s => !s.branchId);
  if (unassignedSales.length > 0) {
    byBranch.push({
      branchId: null,
      branchName: 'Sin sucursal',
      totalSalesToday: unassignedSales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0),
      totalSalesCount: unassignedSales.length,
    });
  }

  return {
    totalSalesToday,
    totalSalesCount,
    lowStockProductsCount,
    activeBakeQueueCount: activeBakeQueue.length,
    totalBranches: allBranches.length,
    activeCashSessions: openSessions.length,
    byBranch,
  };
}
