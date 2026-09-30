import { ICashSessionRepository, ISalesRepository } from '../../domain/repositories';
import { CloseSessionInputDto, CloseSessionInputSchema } from '../dtos/cash-session-dtos';
import { TenantContext } from '@/modules/shared/domain/tenant-context';
import { ValidationError, NotFoundError } from '@/modules/shared/domain/errors';
import { CashSession } from '../../domain/entities';

export interface CloseSessionResult {
  session: CashSession;
  summary: {
    initialAmount: number;
    totalSalesCash: number;
    totalDebit: number;
    totalCredit: number;
    totalQr: number;
    totalIngresos: number;
    totalEgresos: number;
    theoreticalTotal: number;
    countedCash: number;
    difference: number;
  };
}

export class CloseCashSessionUseCase {
  constructor(
    private readonly cashSessionRepo: ICashSessionRepository,
    private readonly salesRepo: ISalesRepository
  ) {}

  async execute(input: CloseSessionInputDto, context: TenantContext): Promise<CloseSessionResult> {
    const validation = CloseSessionInputSchema.safeParse(input);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(i => i.message).join(', ');
      throw new ValidationError(`Error de validación al cerrar caja: ${errorMsg}`);
    }

    const { sessionId, countedCash } = validation.data;
    const { tenantId } = context;

    // 1. Obtener la sesión y verificar pertenencia al tenant
    const cashSession = await this.cashSessionRepo.findSessionById(tenantId, sessionId);
    if (!cashSession) {
      throw new NotFoundError('Sesión de caja', sessionId);
    }

    const initial = parseFloat(cashSession.initialAmount);

    // 2. Obtener ventas por método de pago de esta sesión
    const allSales = await this.salesRepo.findSalesBySession(tenantId, sessionId);

    let totalSalesCash = 0;
    let totalDebit = 0;
    let totalCredit = 0;
    let totalQr = 0;

    for (const s of allSales) {
      const amt = s.totalAmount;
      if (s.paymentMethod === 'CASH') totalSalesCash += amt;
      else if (s.paymentMethod === 'DEBIT') totalDebit += amt;
      else if (s.paymentMethod === 'CREDIT') totalCredit += amt;
      else if (s.paymentMethod === 'QR') totalQr += amt;
    }

    // 3. Obtener movimientos
    const movements = await this.cashSessionRepo.findMovementsBySession(tenantId, sessionId);

    let totalIngresos = 0;
    let totalEgresos = 0;

    for (const m of movements) {
      const val = parseFloat(m.amount);
      if (m.type === 'INGRESO') totalIngresos += val;
      else totalEgresos += val;
    }

    // 4. Calcular totales
    const theoreticalTotal = initial + totalSalesCash + totalIngresos - totalEgresos;
    const difference = countedCash - theoreticalTotal;

    // 5. Cerrar la sesión
    const updatedSession = await this.cashSessionRepo.closeSession(tenantId, sessionId, {
      closedAt: new Date(),
      finalAmount: countedCash,
      totalSales: totalSalesCash + totalDebit + totalCredit + totalQr,
      totalCash: totalSalesCash,
      totalDebit: totalDebit,
      totalCredit: totalCredit,
      totalQr: totalQr,
      theoreticalAmount: theoreticalTotal,
      difference: difference,
    });

    return {
      session: updatedSession,
      summary: {
        initialAmount: initial,
        totalSalesCash,
        totalDebit,
        totalCredit,
        totalQr,
        totalIngresos,
        totalEgresos,
        theoreticalTotal,
        countedCash,
        difference,
      },
    };
  }
}
