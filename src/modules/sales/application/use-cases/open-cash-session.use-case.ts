import { ICashSessionRepository } from '../../domain/repositories';
import { OpenSessionInputDto, OpenSessionInputSchema } from '../dtos/cash-session-dtos';
import { TenantContext } from '@/modules/shared/domain/tenant-context';
import { ValidationError } from '@/modules/shared/domain/errors';
import { CashSession } from '../../domain/entities';

export class OpenCashSessionUseCase {
  constructor(private readonly cashSessionRepo: ICashSessionRepository) {}

  async execute(input: OpenSessionInputDto, context: TenantContext): Promise<CashSession> {
    const validation = OpenSessionInputSchema.safeParse(input);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(i => i.message).join(', ');
      throw new ValidationError(`Error de validación al abrir caja: ${errorMsg}`);
    }

    const { tenantId, branchId, userId } = context;

    // Verificar si ya existe una sesión abierta para este cajero en este tenant
    const activeSession = await this.cashSessionRepo.findActiveSession(tenantId, userId);
    if (activeSession) {
      return activeSession;
    }

    return this.cashSessionRepo.createSession({
      tenantId,
      branchId,
      cashierId: userId,
      initialAmount: validation.data.initialAmount,
    });
  }
}
