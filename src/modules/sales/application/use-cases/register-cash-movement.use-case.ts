import { ICashSessionRepository } from '../../domain/repositories';
import { RegisterMovementInputDto, RegisterMovementInputSchema } from '../dtos/cash-session-dtos';
import { TenantContext } from '@/modules/shared/domain/tenant-context';
import { ValidationError, NotFoundError } from '@/modules/shared/domain/errors';
import { CashMovement } from '../../domain/entities';

export class RegisterCashMovementUseCase {
  constructor(private readonly cashSessionRepo: ICashSessionRepository) {}

  async execute(input: RegisterMovementInputDto, context: TenantContext): Promise<CashMovement> {
    const validation = RegisterMovementInputSchema.safeParse(input);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(i => i.message).join(', ');
      throw new ValidationError(`Error al registrar movimiento de caja: ${errorMsg}`);
    }

    const { sessionId, type, amount, description } = validation.data;
    const { tenantId, branchId, userId } = context;

    // Verificar que la sesión pertenezca al tenant y exista
    const session = await this.cashSessionRepo.findSessionById(tenantId, sessionId);
    if (!session) {
      throw new NotFoundError('Sesión de caja', sessionId);
    }

    return this.cashSessionRepo.createMovement({
      tenantId,
      branchId,
      cashSessionId: sessionId,
      cashierId: userId,
      type,
      amount,
      description: description || null,
    });
  }
}
