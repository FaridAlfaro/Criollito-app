import { Sale, SaleItem, CashSession, CashMovement, PaymentMethod, ComprobanteTipo, DocType, CashMovementType } from './entities';
import { DrizzleTransaction } from '@/modules/shared/infrastructure/transaction';

export interface CreateSaleInput {
  tenantId: string;
  branchId?: string | null;
  cashSessionId?: string | null;
  cashierId: string;
  employeeId?: string | null;
  idempotencyKey?: string | null;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  clienteTipoDocumento?: DocType;
  clienteDocumento?: string | null;
  comprobanteTipo?: ComprobanteTipo | null;
  puntoVenta?: number | null;
  numeroComprobante?: number | null;
  ivaContenido?: number | null;
  cae?: string | null;
  caeExpiration?: Date | null;
  qrCodeData?: string | null;
}

export interface CreateSaleItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface SaleWithDetails extends Sale {
  items: (SaleItem & { productName: string })[];
}

export interface ISalesRepository {
  findByIdempotencyKey(tenantId: string, idempotencyKey: string, tx?: DrizzleTransaction): Promise<Sale | null>;
  createSale(saleData: CreateSaleInput, items: CreateSaleItemInput[], tx?: DrizzleTransaction): Promise<Sale>;
  findSalesBySession(tenantId: string, sessionId: string, tx?: DrizzleTransaction): Promise<SaleWithDetails[]>;
  deductProductStock(
    tenantId: string,
    productId: string,
    quantity: number,
    tx?: DrizzleTransaction
  ): Promise<{ id: string; name: string; currentStock: number; minDailyStock: number; optimalBatchSize: number } | null>;
  createLowStockAlert(
    tenantId: string,
    branchId: string | null,
    message: string,
    tx?: DrizzleTransaction
  ): Promise<void>;
  enqueueBakeTaskIfNotPresent(
    tenantId: string,
    branchId: string | null,
    productId: string,
    quantityNeeded: number,
    tx?: DrizzleTransaction
  ): Promise<void>;
}

export interface CreateSessionInput {
  tenantId: string;
  branchId?: string | null;
  cashierId: string;
  initialAmount: number;
}

export interface UpdateSessionClosingInput {
  closedAt: Date;
  finalAmount: number;
  totalSales: number;
  totalCash: number;
  totalDebit: number;
  totalCredit: number;
  totalQr: number;
  theoreticalAmount: number;
  difference: number;
}

export interface CreateMovementInput {
  tenantId: string;
  branchId?: string | null;
  cashSessionId: string;
  cashierId: string;
  type: CashMovementType;
  amount: number;
  description?: string | null;
}

export interface ICashSessionRepository {
  findActiveSession(tenantId: string, cashierId: string, tx?: DrizzleTransaction): Promise<CashSession | null>;
  findSessionById(tenantId: string, sessionId: string, tx?: DrizzleTransaction): Promise<CashSession | null>;
  createSession(input: CreateSessionInput, tx?: DrizzleTransaction): Promise<CashSession>;
  closeSession(tenantId: string, sessionId: string, input: UpdateSessionClosingInput, tx?: DrizzleTransaction): Promise<CashSession>;
  createMovement(input: CreateMovementInput, tx?: DrizzleTransaction): Promise<CashMovement>;
  findMovementsBySession(tenantId: string, sessionId: string, tx?: DrizzleTransaction): Promise<CashMovement[]>;
  findBranchWorkers(tenantId: string, branchId?: string | null, tx?: DrizzleTransaction): Promise<{ id: string; name: string; role: string }[]>;
}
