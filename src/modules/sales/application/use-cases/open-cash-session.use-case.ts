import { ICashSessionRepository } from '../../domain/repositories';
import { OpenSessionInputDto, OpenSessionInputSchema } from '../dtos/cash-session-dtos';
import { TenantContext } from '@/modules/shared/domain/tenant-context';
import { ValidationError, InfrastructureError, DomainError } from '@/modules/shared/domain/errors';
import { CashSession } from '../../domain/entities';
import { Result } from '@/modules/shared/domain/result';

export type OpenCashSessionResult = Result<CashSession, DomainError | InfrastructureError> & Partial<CashSession>;

export class OpenCashSessionUseCase {
  constructor(private readonly cashSessionRepo: ICashSessionRepository) {}

  async execute(input: OpenSessionInputDto, context: TenantContext): Promise<OpenCashSessionResult> {
    const validation = OpenSessionInputSchema.safeParse(input);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(i => i.message).join(', ');
      const err = new ValidationError(`Error de validación al abrir caja: ${errorMsg}`);
      return Result.err(err) as OpenCashSessionResult;
    }

    const { tenantId, branchId, userId } = context;

    try {
      // Verificar si ya existe una sesión abierta para este cajero en este tenant
      const activeSession = await this.cashSessionRepo.findActiveSession(tenantId, userId);
      if (activeSession) {
        return Object.assign(Result.ok(activeSession), activeSession) as OpenCashSessionResult;
      }

      const newSession = await this.cashSessionRepo.createSession({
        tenantId,
        branchId,
        cashierId: userId,
        initialAmount: validation.data.initialAmount,
      });

      return Object.assign(Result.ok(newSession), newSession) as OpenCashSessionResult;
    } catch (err: any) {
      const infraErr = err instanceof DomainError
        ? err
        : new InfrastructureError(`Fallo al consultar/crear sesión de caja: ${err?.message || String(err)}`, err);
      return Result.err(infraErr) as OpenCashSessionResult;
    }
  }
}
