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
 * Maneja logs estructurados de severidad ERROR y códigos identificables.
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

    if (!result.success) {
      const errObj = 'error' in result ? result.error : null;
      const errorCode = (errObj as any)?.code || 'INFRASTRUCTURE_ERROR';
      const errorMessage = typeof errObj === 'string' ? errObj : (errObj as any)?.message || 'Fallo al procesar la venta';

      console.error(JSON.stringify({
        severity: 'ERROR',
        event: 'PROCESAR_VENTA_FAILED',
        code: errorCode,
        message: errorMessage,
        tenantId: session.tenantId,
        branchId: session.branchId,
        userId: session.id,
        idempotencyKey: idempotencyKey || null,
        timestamp: new Date().toISOString(),
      }));

      return { 
        success: false, 
        code: errorCode,
        error: errorMessage 
      };
    }

    revalidatePath('/pos');
    revalidatePath('/baker');
    revalidatePath('/supervisor');
    revalidatePath('/admin');

    return { 
      success: true, 
      saleId: result.saleId,
      isIdempotentReplay: result.isIdempotentReplay,
    };
  } catch (err: any) {
    const errorCode = err?.code || 'UNHANDLED_EXCEPTION';
    const errorMessage = err instanceof Error ? err.message : String(err);

    console.error(JSON.stringify({
      severity: 'ERROR',
      event: 'PROCESAR_VENTA_CRITICAL_EXCEPTION',
      code: errorCode,
      message: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
      timestamp: new Date().toISOString(),
    }));

    return { 
      success: false, 
      code: errorCode,
      error: errorMessage 
    };
  }
}
