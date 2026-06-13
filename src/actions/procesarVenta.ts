'use server';

import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { 
  products, 
  sales, 
  saleItems, 
  bakeQueue, 
  alerts 
} from '@/db/schema';
import { emitirFacturaARCA } from './arca';
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
  paymentMethod: 'CASH' | 'DEBIT' | 'CREDIT' | 'QR',
  cashSessionId?: string,
  customerDoc?: string,
  comprobanteTipo?: 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C' | null,
  cae?: string,
  caeExpiration?: Date,
  numeroComprobante?: number,
  qrCodeData?: string
) {
  try {
    // Start a transaction
    await db.transaction(async (tx) => {
      // 1. Calculate total amount
      const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

      let finalCae = cae;
      let finalCaeExpiration = caeExpiration;
      let finalNumeroComprobante = numeroComprobante;
      let finalQrCodeData = qrCodeData;

      if (comprobanteTipo && !finalCae) {
        // Emitir factura ARCA
        const netAmount = totalAmount / 1.21;
        const ivaAmount = totalAmount - netAmount;
        const docType = customerDoc ? (customerDoc.length > 8 ? 'CUIT' as const : 'DNI' as const) : 'CONSUMIDOR_FINAL' as const;
        
        const arcaRes = await emitirFacturaARCA({
          totalAmount,
          netAmount,
          ivaAmount,
          docType,
          docNumber: customerDoc || undefined,
          comprobanteTipo,
          puntoVenta: 1,
        });

        if (arcaRes.success) {
          finalCae = arcaRes.cae;
          finalCaeExpiration = arcaRes.caeExpiration;
          finalNumeroComprobante = arcaRes.numeroComprobante;
          finalQrCodeData = arcaRes.qrCodeData;
        } else {
          throw new Error(arcaRes.errorMessage || 'ARCA invoicing failed.');
        }
      }

      // 2. Create Sale Record
      const [sale] = await tx.insert(sales).values({
        tenantId,
        cashierId,
        cashSessionId: cashSessionId || null,
        totalAmount: totalAmount.toString(),
        paymentMethod,
        clienteDocumento: customerDoc || null,
        clienteTipoDocumento: customerDoc ? (customerDoc.length > 8 ? 'CUIT' : 'DNI') : 'CONSUMIDOR_FINAL',
        comprobanteTipo: comprobanteTipo || null,
        cae: finalCae || null,
        caeExpiration: finalCaeExpiration || null,
        numeroComprobante: finalNumeroComprobante || null,
        qrCodeData: finalQrCodeData || null,
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
  } catch (err) {
    console.error('[DB Error] procesarVenta falló:', err);
    throw new Error('Database transaction failed: ' + (err instanceof Error ? err.message : String(err)));
  }

  revalidatePath('/pos');
  revalidatePath('/baker');
  revalidatePath('/supervisor');
}
