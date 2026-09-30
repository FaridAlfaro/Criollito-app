export type PaymentMethod = 'CASH' | 'DEBIT' | 'CREDIT' | 'QR';
export type ComprobanteTipo = 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C' | 'NOTA_CREDITO';
export type DocType = 'DNI' | 'CUIT' | 'CUIL' | 'PASAPORTE' | 'CONSUMIDOR_FINAL';
export type CashMovementType = 'INGRESO' | 'EGRESO_PROVEEDOR' | 'EGRESO_SUELDO' | 'EGRESO_VARIOS';

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  tenantId: string;
  branchId: string | null;
  cashSessionId: string | null;
  cashierId: string;
  employeeId: string | null;
  idempotencyKey: string | null;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  clienteTipoDocumento: DocType;
  clienteDocumento: string | null;
  comprobanteTipo: ComprobanteTipo | null;
  puntoVenta: number | null;
  numeroComprobante: number | null;
  ivaContenido: number | null;
  cae: string | null;
  caeExpiration: Date | null;
  qrCodeData: string | null;
  createdAt: Date;
  items?: SaleItem[];
}

export interface CashSession {
  id: string;
  tenantId: string;
  branchId: string | null;
  cashierId: string;
  openedAt: Date;
  closedAt: Date | null;
  initialAmount: string;
  finalAmount: string | null;
  totalSales: string | null;
  totalCash: string | null;
  totalDebit: string | null;
  totalCredit: string | null;
  totalQr: string | null;
  theoreticalAmount: string | null;
  difference: string | null;
}

export interface CashMovement {
  id: string;
  tenantId: string;
  branchId: string | null;
  cashSessionId: string;
  cashierId: string;
  type: CashMovementType;
  amount: string;
  description: string | null;
  createdAt: Date;
}
