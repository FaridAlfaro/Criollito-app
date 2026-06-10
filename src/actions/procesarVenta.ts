'use server';

import { eq, sql } from 'drizzle-orm';
import { db } from '@/db'; // Assuming a db connection instance exists
import { 
  products, 
  sales, 
  saleItems, 
  bakeQueue, 
  alerts, 
  paymentMethodEnum 
} from '@/db/schema';
import { revalidatePath } from 'next/cache';

type SaleItemInput = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export async function procesarVenta(
  tenantId: string, 
  cashierId: string, 
  items: SaleItemInput[], 
  paymentMethod: 'CASH' | 'DEBIT' | 'CREDIT'
) {
  // Start a transaction
  await db.transaction(async (tx) => {
    // 1. Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    // 2. Create Sale Record
    const [sale] = await tx.insert(sales).values({
      tenantId,
      cashierId,
      totalAmount: totalAmount.toString(),
      paymentMethod,
    }).returning();

    // 3. Process each item
    for (const item of items) {
      // Add sale item
      await tx.insert(saleItems).values({
        saleId: sale.id,
        productId: item.productId,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        subtotal: (item.quantity * item.unitPrice).toString(),
      });

      // Update Stock
      const [updatedProduct] = await tx.update(products)
        .set({
          currentStock: sql`${products.currentStock} - ${item.quantity}`,
          updatedAt: new Date()
        })
        .where(eq(products.id, item.productId))
        .returning();

      // Check minimum stock threshold
      const currentStockNum = parseFloat(updatedProduct.currentStock as string);
      const minStockNum = parseFloat(updatedProduct.minDailyStock as string);
      
      if (currentStockNum < minStockNum) {
        // Create an alert
        await tx.insert(alerts).values({
          tenantId,
          type: 'LOW_STOCK',
          message: `Stock bajo para ${updatedProduct.name}: ${currentStockNum} restante.`,
        });

        // Add to bake queue
        // Check if already in pending/baking status to avoid duplicates
        const existingQueue = await tx.query.bakeQueue.findFirst({
          where: (bq, { eq, and, or }) => and(
            eq(bq.productId, updatedProduct.id),
            or(eq(bq.status, 'PENDING'), eq(bq.status, 'BAKING'))
          )
        });

        if (!existingQueue) {
          await tx.insert(bakeQueue).values({
            tenantId,
            productId: updatedProduct.id,
            quantityNeeded: updatedProduct.optimalBatchSize,
            status: 'PENDING'
          });
        }
      }
    }
  });

  revalidatePath('/pos');
  revalidatePath('/baker');
  revalidatePath('/supervisor');
}
