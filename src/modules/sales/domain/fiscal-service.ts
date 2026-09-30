import { DocType } from './entities';

export interface FiscalInvoiceRequest {
  totalAmount: number;
  netAmount: number;
  ivaAmount: number;
  docType: DocType;
  docNumber?: string;
  comprobanteTipo: 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C';
  puntoVenta: number;
}

export interface FiscalInvoiceResult {
  success: boolean;
  cae?: string;
  caeExpiration?: Date;
  numeroComprobante?: number;
  qrCodeData?: string;
  errorMessage?: string;
}

export interface IFiscalInvoiceService {
  emitInvoice(req: FiscalInvoiceRequest): Promise<FiscalInvoiceResult>;
}
