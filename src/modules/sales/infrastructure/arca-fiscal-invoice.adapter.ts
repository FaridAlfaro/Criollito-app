import { IFiscalInvoiceService, FiscalInvoiceRequest, FiscalInvoiceResult } from '../domain/fiscal-service';
import { emitirFacturaARCA } from '@/actions/arca';

export class ArcaFiscalInvoiceAdapter implements IFiscalInvoiceService {
  async emitInvoice(req: FiscalInvoiceRequest): Promise<FiscalInvoiceResult> {
    try {
      const res = await emitirFacturaARCA({
        totalAmount: req.totalAmount,
        netAmount: req.netAmount,
        ivaAmount: req.ivaAmount,
        docType: req.docType,
        docNumber: req.docNumber,
        comprobanteTipo: req.comprobanteTipo,
        puntoVenta: req.puntoVenta,
      });

      return {
        success: res.success,
        cae: res.cae,
        caeExpiration: res.caeExpiration,
        numeroComprobante: res.numeroComprobante,
        qrCodeData: res.qrCodeData,
        errorMessage: res.errorMessage,
      };
    } catch (error) {
      console.error('[ArcaFiscalInvoiceAdapter] Error emitiendo factura:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Error inesperado de comunicación con ARCA.',
      };
    }
  }
}
