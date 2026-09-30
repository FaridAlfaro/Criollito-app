'use server';

import { getCurrentUserSession } from '@/lib/auth-session';
import { processSaleUseCase } from '@/modules/sales';
import { revalidatePath } from 'next/cache';

export type SaleItemInput = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

/**
 * Server Action Thin Controller: delega la orquestación a ProcessSaleUseCase.
 * Mantiene compatibilidad total con la UI del POS y useStore.
 */
export async function procesarVenta(
  items: SaleItemInput[], 
  paymentMethod: 'CASH' | 'DEBIT' | 'CREDIT' | 'QR',
  cashSessionId?: string,
  customerDoc?: string,
  comprobanteTipo?: 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C' | null,
  cae?: string,
  caeExpiration?: Date,
  numeroComprobante?: number,
  qrCodeData?: string,
  idempotencyKey?: string
) {
  try {
    // Zero-Trust: tenantId y cajero verificados desde la sesión del servidor
    const session = await getCurrentUserSession();

    const result = await processSaleUseCase.execute({
      items,
      paymentMethod,
      cashSessionId,
      customerDoc,
      comprobanteTipo,
      cae,
      caeExpiration,
      numeroComprobante,
      qrCodeData,
      idempotencyKey,
    }, {
      tenantId: session.tenantId,
      branchId: session.branchId,
      userId: session.id,
      role: session.role,
      name: session.name,
    });

    revalidatePath('/pos');
    revalidatePath('/baker');
    revalidatePath('/supervisor');
    revalidatePath('/admin');

    return { 
      success: true, 
      saleId: result.saleId 
    };
  } catch (err) {
    console.error('[Action Error] procesarVenta falló:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : String(err) 
    };
  }
}
