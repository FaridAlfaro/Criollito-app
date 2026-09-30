import { ICashSessionRepository, ISalesRepository } from '../../domain/repositories';
import { TenantContext } from '@/modules/shared/domain/tenant-context';
import { NotFoundError } from '@/modules/shared/domain/errors';

export interface SessionHistoryItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  name: string;
}

export interface SessionHistorySale {
  id: string;
  createdAt: Date;
  totalAmount: number;
  paymentMethod: 'CASH' | 'DEBIT' | 'CREDIT' | 'QR';
  comprobanteTipo: string | null;
  clienteDocumento: string | null;
  cae: string | null;
  caeExpiration: Date | null;
  numeroComprobante: number | null;
  qrCodeData: string | null;
  items: SessionHistoryItem[];
}

export interface SessionHistoryMovement {
  id: string;
  type: 'INGRESO' | 'EGRESO_PROVEEDOR' | 'EGRESO_SUELDO' | 'EGRESO_VARIOS';
  amount: number;
  description: string | null;
  createdAt: Date;
}

export interface SessionHistoryResult {
  movements: SessionHistoryMovement[];
  sales: SessionHistorySale[];
}

export class GetSessionHistoryUseCase {
  constructor(
    private readonly cashSessionRepo: ICashSessionRepository,
    private readonly salesRepo: ISalesRepository
  ) {}

  async execute(sessionId: string, context: TenantContext): Promise<SessionHistoryResult> {
    const { tenantId } = context;

    const session = await this.cashSessionRepo.findSessionById(tenantId, sessionId);
    if (!session) {
      throw new NotFoundError('Sesión de caja', sessionId);
    }

    const movements = await this.cashSessionRepo.findMovementsBySession(tenantId, sessionId);
    const sales = await this.salesRepo.findSalesBySession(tenantId, sessionId);

    return {
      movements: movements.map(m => ({
        id: m.id,
        type: m.type as SessionHistoryMovement['type'],
        amount: parseFloat(m.amount),
        description: m.description,
        createdAt: m.createdAt,
      })),
      sales: sales.map(s => ({
        id: s.id,
        createdAt: s.createdAt,
        totalAmount: s.totalAmount,
        paymentMethod: s.paymentMethod,
        comprobanteTipo: s.comprobanteTipo,
        clienteDocumento: s.clienteDocumento,
        cae: s.cae,
        caeExpiration: s.caeExpiration,
        numeroComprobante: s.numeroComprobante,
        qrCodeData: s.qrCodeData,
        items: s.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          name: item.productName,
        })),
      })),
    };
  }
}
