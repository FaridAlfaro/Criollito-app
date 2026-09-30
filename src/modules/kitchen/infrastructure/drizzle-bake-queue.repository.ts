import { eq, and, or, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { bakeQueue, products } from '@/db/schema';
import { 
  IBakeQueueRepository, 
  EnqueueBakeOrderInput 
} from '../domain/repositories';
import { BakeOrder, BakeStatus } from '../domain/entities';
import { DrizzleTransaction, DbOrTx } from '@/modules/shared/infrastructure/transaction';

export class DrizzleBakeQueueRepository implements IBakeQueueRepository {
  private getClient(tx?: DrizzleTransaction): DbOrTx {
    return tx || db;
  }

  async fetchQueue(
    tenantId: string, 
    branchId?: string | null, 
    tx?: DrizzleTransaction
  ): Promise<BakeOrder[]> {
    const client = this.getClient(tx);

    const branchCondition = branchId
      ? or(eq(bakeQueue.branchId, branchId), isNull(bakeQueue.branchId))
      : undefined;

    const statusCondition = or(
      eq(bakeQueue.status, 'PENDING'),
      eq(bakeQueue.status, 'BAKING')
    );

    const whereClause = branchCondition
      ? and(eq(bakeQueue.tenantId, tenantId), branchCondition, statusCondition)
      : and(eq(bakeQueue.tenantId, tenantId), statusCondition);

    const rows = await client
      .select({
        bq: bakeQueue,
        productName: products.name,
        productType: products.type,
      })
      .from(bakeQueue)
      .leftJoin(products, eq(bakeQueue.productId, products.id))
      .where(whereClause);

    return rows.map(r => ({
      id: r.bq.id,
      tenantId: r.bq.tenantId,
      branchId: r.bq.branchId,
      productId: r.bq.productId,
      productName: r.productName ?? 'Producto eliminado',
      productType: r.productType ?? 'UNIT',
      recipeId: r.bq.recipeId,
      quantityNeeded: parseFloat(r.bq.quantityNeeded),
      status: r.bq.status as BakeStatus,
      priority: r.bq.priority,
      notes: r.bq.notes,
      deductedIngredients: r.bq.deductedIngredients,
      requestedAt: r.bq.requestedAt,
      startedAt: r.bq.startedAt,
      completedAt: r.bq.completedAt,
    }));
  }

  async findOrderById(
    tenantId: string, 
    orderId: string, 
    tx?: DrizzleTransaction
  ): Promise<BakeOrder | null> {
    const client = this.getClient(tx);

    const [row] = await client
      .select({
        bq: bakeQueue,
        productName: products.name,
        productType: products.type,
      })
      .from(bakeQueue)
      .leftJoin(products, eq(bakeQueue.productId, products.id))
      .where(and(eq(bakeQueue.tenantId, tenantId), eq(bakeQueue.id, orderId)));

    if (!row) return null;

    return {
      id: row.bq.id,
      tenantId: row.bq.tenantId,
      branchId: row.bq.branchId,
      productId: row.bq.productId,
      productName: row.productName ?? 'Producto eliminado',
      productType: row.productType ?? 'UNIT',
      recipeId: row.bq.recipeId,
      quantityNeeded: parseFloat(row.bq.quantityNeeded),
      status: row.bq.status as BakeStatus,
      priority: row.bq.priority,
      notes: row.bq.notes,
      deductedIngredients: row.bq.deductedIngredients,
      requestedAt: row.bq.requestedAt,
      startedAt: row.bq.startedAt,
      completedAt: row.bq.completedAt,
    };
  }

  async findExistingActiveOrder(
    tenantId: string, 
    productId: string, 
    tx?: DrizzleTransaction
  ): Promise<BakeOrder | null> {
    const client = this.getClient(tx);

    const existing = await client.query.bakeQueue.findFirst({
      where: (bq, { and, eq, or }) => and(
        eq(bq.productId, productId),
        eq(bq.tenantId, tenantId),
        or(eq(bq.status, 'PENDING'), eq(bq.status, 'BAKING'))
      )
    });

    if (!existing) return null;

    return {
      id: existing.id,
      tenantId: existing.tenantId,
      branchId: existing.branchId,
      productId: existing.productId,
      recipeId: existing.recipeId,
      quantityNeeded: parseFloat(existing.quantityNeeded),
      status: existing.status as BakeStatus,
      priority: existing.priority,
      notes: existing.notes,
      deductedIngredients: existing.deductedIngredients,
      requestedAt: existing.requestedAt,
      startedAt: existing.startedAt,
      completedAt: existing.completedAt,
    };
  }

  async enqueueOrder(
    data: EnqueueBakeOrderInput, 
    tx?: DrizzleTransaction
  ): Promise<BakeOrder> {
    const client = this.getClient(tx);

    const [created] = await client.insert(bakeQueue).values({
      tenantId: data.tenantId,
      branchId: data.branchId || null,
      productId: data.productId,
      recipeId: data.recipeId || null,
      quantityNeeded: data.quantityNeeded.toString(),
      status: 'PENDING',
      priority: data.priority || 1,
      notes: data.notes || null,
      deductedIngredients: false,
    }).returning();

    return {
      id: created.id,
      tenantId: created.tenantId,
      branchId: created.branchId,
      productId: created.productId,
      recipeId: created.recipeId,
      quantityNeeded: parseFloat(created.quantityNeeded),
      status: created.status as BakeStatus,
      priority: created.priority,
      notes: created.notes,
      deductedIngredients: created.deductedIngredients,
      requestedAt: created.requestedAt,
      startedAt: created.startedAt,
      completedAt: created.completedAt,
    };
  }

  async updateStatus(
    tenantId: string, 
    orderId: string, 
    status: BakeStatus, 
    startedAt?: Date, 
    completedAt?: Date, 
    tx?: DrizzleTransaction
  ): Promise<void> {
    const client = this.getClient(tx);

    const updateData: Record<string, unknown> = { status };
    if (status === 'BAKING' && startedAt) updateData.startedAt = startedAt;
    if (status === 'COMPLETED' && completedAt) updateData.completedAt = completedAt;

    const [updated] = await client.update(bakeQueue)
      .set(updateData)
      .where(and(eq(bakeQueue.id, orderId), eq(bakeQueue.tenantId, tenantId)))
      .returning();

    if (!updated) {
      throw new Error(`Orden de horneado con ID "${orderId}" no encontrada en el tenant.`);
    }
  }

  async completeOrderAndDeduct(
    tenantId: string,
    orderId: string,
    completedAt: Date,
    tx?: DrizzleTransaction
  ): Promise<void> {
    const client = this.getClient(tx);

    const [updated] = await client.update(bakeQueue)
      .set({
        status: 'COMPLETED',
        completedAt,
        deductedIngredients: true,
      })
      .where(and(eq(bakeQueue.id, orderId), eq(bakeQueue.tenantId, tenantId)))
      .returning();

    if (!updated) {
      throw new Error(`Orden de horneado con ID "${orderId}" no encontrada para completar.`);
    }
  }

  async deductStock(
    tenantId: string, 
    productId: string, 
    quantity: number, 
    tx?: DrizzleTransaction
  ): Promise<void> {
    const client = this.getClient(tx);

    const [updated] = await client.update(products)
      .set({
        currentStock: sql`COALESCE(${products.currentStock}, 0) - ${quantity}`,
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
      .returning();

    if (!updated) {
      throw new Error(`Insumo con ID "${productId}" no encontrado para descontar stock.`);
    }
  }

  async addStock(
    tenantId: string, 
    productId: string, 
    quantity: number, 
    tx?: DrizzleTransaction
  ): Promise<void> {
    const client = this.getClient(tx);

    const [updated] = await client.update(products)
      .set({
        currentStock: sql`COALESCE(${products.currentStock}, 0) + ${quantity}`,
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
      .returning();

    if (!updated) {
      throw new Error(`Producto elaborado con ID "${productId}" no encontrado para incrementar stock.`);
    }
  }
}
