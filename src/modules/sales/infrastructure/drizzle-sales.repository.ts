import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/db';
import { sales, saleItems, products, alerts, bakeQueue } from '@/db/schema';
import { 
  ISalesRepository, 
  CreateSaleInput, 
  CreateSaleItemInput, 
  SaleWithDetails 
} from '../domain/repositories';
import { Sale, SaleItem } from '../domain/entities';
import { DrizzleTransaction, DbOrTx } from '@/modules/shared/infrastructure/transaction';

export class DrizzleSalesRepository implements ISalesRepository {
  private getClient(tx?: DrizzleTransaction): DbOrTx {
    return tx || db;
  }

  async findByIdempotencyKey(
    tenantId: string, 
    idempotencyKey: string, 
    tx?: DrizzleTransaction
  ): Promise<Sale | null> {
    const client = this.getClient(tx);
    const [existing] = await client
      .select()
      .from(sales)
      .where(and(eq(sales.tenantId, tenantId), eq(sales.idempotencyKey, idempotencyKey)));

    if (!existing) return null;

    const items = await client
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, existing.id));

    return {
      id: existing.id,
      tenantId: existing.tenantId,
      branchId: existing.branchId,
      cashSessionId: existing.cashSessionId,
      cashierId: existing.cashierId,
      employeeId: existing.employeeId,
      idempotencyKey: existing.idempotencyKey,
      totalAmount: parseFloat(existing.totalAmount),
      paymentMethod: existing.paymentMethod as Sale['paymentMethod'],
      clienteTipoDocumento: existing.clienteTipoDocumento as Sale['clienteTipoDocumento'],
      clienteDocumento: existing.clienteDocumento,
      comprobanteTipo: existing.comprobanteTipo as Sale['comprobanteTipo'],
      puntoVenta: existing.puntoVenta,
      numeroComprobante: existing.numeroComprobante,
      ivaContenido: existing.ivaContenido ? parseFloat(existing.ivaContenido) : null,
      cae: existing.cae,
      caeExpiration: existing.caeExpiration,
      qrCodeData: existing.qrCodeData,
      createdAt: existing.createdAt,
      items: items.map(i => ({
        id: i.id,
        saleId: i.saleId,
        productId: i.productId,
        quantity: parseFloat(i.quantity),
        unitPrice: parseFloat(i.unitPrice),
        subtotal: parseFloat(i.subtotal),
      })),
    };
  }

  async createSale(
    saleData: CreateSaleInput, 
    items: CreateSaleItemInput[], 
    tx?: DrizzleTransaction
  ): Promise<Sale> {
    const client = this.getClient(tx);

    const [createdSale] = await client.insert(sales).values({
      tenantId: saleData.tenantId,
      branchId: saleData.branchId || null,
      cashierId: saleData.cashierId,
      employeeId: saleData.employeeId || null,
      cashSessionId: saleData.cashSessionId || null,
      idempotencyKey: saleData.idempotencyKey || null,
      totalAmount: saleData.totalAmount.toString(),
      paymentMethod: saleData.paymentMethod,
      clienteTipoDocumento: saleData.clienteTipoDocumento || 'CONSUMIDOR_FINAL',
      clienteDocumento: saleData.clienteDocumento || null,
      comprobanteTipo: saleData.comprobanteTipo || null,
      puntoVenta: saleData.puntoVenta || null,
      numeroComprobante: saleData.numeroComprobante || null,
      ivaContenido: saleData.ivaContenido ? saleData.ivaContenido.toString() : null,
      cae: saleData.cae || null,
      caeExpiration: saleData.caeExpiration || null,
      qrCodeData: saleData.qrCodeData || null,
    }).returning();

    const createdItems: SaleItem[] = [];

    for (const item of items) {
      const [insertedItem] = await client.insert(saleItems).values({
        saleId: createdSale.id,
        productId: item.productId,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        subtotal: item.subtotal.toString(),
      }).returning();

      createdItems.push({
        id: insertedItem.id,
        saleId: insertedItem.saleId,
        productId: insertedItem.productId,
        quantity: parseFloat(insertedItem.quantity),
        unitPrice: parseFloat(insertedItem.unitPrice),
        subtotal: parseFloat(insertedItem.subtotal),
      });
    }

    return {
      id: createdSale.id,
      tenantId: createdSale.tenantId,
      branchId: createdSale.branchId,
      cashSessionId: createdSale.cashSessionId,
      cashierId: createdSale.cashierId,
      employeeId: createdSale.employeeId,
      idempotencyKey: createdSale.idempotencyKey,
      totalAmount: parseFloat(createdSale.totalAmount),
      paymentMethod: createdSale.paymentMethod as Sale['paymentMethod'],
      clienteTipoDocumento: createdSale.clienteTipoDocumento as Sale['clienteTipoDocumento'],
      clienteDocumento: createdSale.clienteDocumento,
      comprobanteTipo: createdSale.comprobanteTipo as Sale['comprobanteTipo'],
      puntoVenta: createdSale.puntoVenta,
      numeroComprobante: createdSale.numeroComprobante,
      ivaContenido: createdSale.ivaContenido ? parseFloat(createdSale.ivaContenido) : null,
      cae: createdSale.cae,
      caeExpiration: createdSale.caeExpiration,
      qrCodeData: createdSale.qrCodeData,
      createdAt: createdSale.createdAt,
      items: createdItems,
    };
  }

  async deductProductStock(
    tenantId: string,
    productId: string,
    quantity: number,
    tx?: DrizzleTransaction
  ): Promise<{ id: string; name: string; currentStock: number; minDailyStock: number; optimalBatchSize: number } | null> {
    const client = this.getClient(tx);

    const [updatedProduct] = await client.update(products)
      .set({
        currentStock: sql`${products.currentStock} - ${quantity}`,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(products.id, productId),
          eq(products.tenantId, tenantId)
        )
      )
      .returning();

    if (!updatedProduct) return null;

    return {
      id: updatedProduct.id,
      name: updatedProduct.name,
      currentStock: parseFloat(updatedProduct.currentStock),
      minDailyStock: parseFloat(updatedProduct.minDailyStock),
      optimalBatchSize: parseFloat(updatedProduct.optimalBatchSize),
    };
  }

  async createLowStockAlert(
    tenantId: string,
    branchId: string | null,
    message: string,
    tx?: DrizzleTransaction
  ): Promise<void> {
    const client = this.getClient(tx);
    await client.insert(alerts).values({
      tenantId,
      targetBranchId: branchId,
      type: 'LOW_STOCK',
      message,
    });
  }

  async enqueueBakeTaskIfNotPresent(
    tenantId: string,
    branchId: string | null,
    productId: string,
    quantityNeeded: number,
    tx?: DrizzleTransaction
  ): Promise<void> {
    const client = this.getClient(tx);

    const existingQueue = await client.query.bakeQueue.findFirst({
      where: (bq, { eq, and, or }) => and(
        eq(bq.productId, productId),
        eq(bq.tenantId, tenantId),
        or(eq(bq.status, 'PENDING'), eq(bq.status, 'BAKING'))
      )
    });

    if (!existingQueue) {
      await client.insert(bakeQueue).values({
        tenantId,
        branchId,
        productId,
        quantityNeeded: quantityNeeded.toString(),
        status: 'PENDING',
      });
    }
  }

  async findSalesBySession(
    tenantId: string, 
    sessionId: string, 
    tx?: DrizzleTransaction
  ): Promise<SaleWithDetails[]> {
    const client = this.getClient(tx);

    const dbSales = await client
      .select()
      .from(sales)
      .where(and(eq(sales.tenantId, tenantId), eq(sales.cashSessionId, sessionId)));

    const result: SaleWithDetails[] = [];

    for (const s of dbSales) {
      const items = await client
        .select({
          item: saleItems,
          productName: products.name,
        })
        .from(saleItems)
        .leftJoin(products, eq(saleItems.productId, products.id))
        .where(eq(saleItems.saleId, s.id));

      result.push({
        id: s.id,
        tenantId: s.tenantId,
        branchId: s.branchId,
        cashSessionId: s.cashSessionId,
        cashierId: s.cashierId,
        employeeId: s.employeeId,
        idempotencyKey: s.idempotencyKey,
        totalAmount: parseFloat(s.totalAmount),
        paymentMethod: s.paymentMethod as Sale['paymentMethod'],
        clienteTipoDocumento: s.clienteTipoDocumento as Sale['clienteTipoDocumento'],
        clienteDocumento: s.clienteDocumento,
        comprobanteTipo: s.comprobanteTipo as Sale['comprobanteTipo'],
        puntoVenta: s.puntoVenta,
        numeroComprobante: s.numeroComprobante,
        ivaContenido: s.ivaContenido ? parseFloat(s.ivaContenido) : null,
        cae: s.cae,
        caeExpiration: s.caeExpiration,
        qrCodeData: s.qrCodeData,
        createdAt: s.createdAt,
        items: items.map(i => ({
          id: i.item.id,
          saleId: i.item.saleId,
          productId: i.item.productId,
          productName: i.productName || 'Producto no encontrado',
          quantity: parseFloat(i.item.quantity),
          unitPrice: parseFloat(i.item.unitPrice),
          subtotal: parseFloat(i.item.subtotal),
        })),
      });
    }

    return result;
  }
}
