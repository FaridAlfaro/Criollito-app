'use server';

import { eq, sql, and } from 'drizzle-orm';
import { db } from '@/db';
import { 
  products, 
  sales, 
  saleItems, 
  bakeQueue, 
  alerts 
} from '@/db/schema';
import { getCurrentUserSession } from '@/lib/auth-session';
import { emitirFacturaARCA } from './arca';
import { revalidatePath } from 'next/cache';

type SaleItemInput = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export async function procesarVenta(
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
  // Zero-Trust: tenantId y cashierId SIEMPRE de la sesión del servidor
  const session = await getCurrentUserSession();
  const tenantId = session.tenantId;
  const cashierId = session.id;
  const branchId = session.branchId;

  try {
    await db.transaction(async (tx) => {
      const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

      let finalCae = cae;
      let finalCaeExpiration = caeExpiration;
      let finalNumeroComprobante = numeroComprobante;
      let finalQrCodeData = qrCodeData;

      if (comprobanteTipo && !finalCae) {
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

      // Insertar venta
      const [sale] = await tx.insert(sales).values({
        tenantId,
        branchId,
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

      // Procesar cada ítem
      for (const item of items) {
        await tx.insert(saleItems).values({
          saleId: sale.id,
          productId: item.productId,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          subtotal: (item.quantity * item.unitPrice).toString(),
        });

        // Descontar stock
        const [updatedProduct] = await tx.update(products)
          .set({
            currentStock: sql`${products.currentStock} - ${item.quantity}`,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(products.id, item.productId),
              eq(products.tenantId, tenantId) // Seguridad: solo actualiza productos del tenant
            )
          )
          .returning();

        if (!updatedProduct) continue;

        // Verificar stock mínimo
        const currentStockNum = parseFloat(updatedProduct.currentStock as string);
        const minStockNum = parseFloat(updatedProduct.minDailyStock as string);
        
        if (currentStockNum < minStockNum) {
          // Crear alerta de stock bajo
          await tx.insert(alerts).values({
            tenantId,
            targetBranchId: branchId, // Alerta específica de esta sucursal
            type: 'LOW_STOCK',
            message: `Stock bajo para ${updatedProduct.name}: ${currentStockNum.toFixed(2)} restante (mínimo: ${minStockNum.toFixed(2)}).`,
          });

          // Agregar a cola de horneado si no está ya
          const existingQueue = await tx.query.bakeQueue.findFirst({
            where: (bq, { eq, and, or }) => and(
              eq(bq.productId, updatedProduct.id),
              eq(bq.tenantId, tenantId),
              or(eq(bq.status, 'PENDING'), eq(bq.status, 'BAKING'))
            )
          });

          if (!existingQueue) {
            await tx.insert(bakeQueue).values({
              tenantId,
              branchId,
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
    revalidatePath('/admin');
    return { success: true };
  } catch (err) {
    console.error('[DB Error] procesarVenta falló:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
