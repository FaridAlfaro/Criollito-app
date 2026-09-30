import { IEmployeeRepository, IPinHasher } from '../../domain/repositories';
import { VerifyPinDto, VerifyPinDtoSchema } from '../dtos/time-clock-dtos';
import { TenantContext } from '@/modules/shared/domain/tenant-context';
import { ValidationError, UnauthorizedError } from '@/modules/shared/domain/errors';
import { Employee } from '../../domain/entities';

export class VerifyPinUseCase {
  constructor(
    private readonly employeeRepo: IEmployeeRepository,
    private readonly pinHasher: IPinHasher
  ) {}

  async execute(input: VerifyPinDto, context: TenantContext): Promise<Employee> {
    const validation = VerifyPinDtoSchema.safeParse(input);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(i => i.message).join(', ');
      throw new ValidationError(`Error al validar PIN: ${errorMsg}`);
    }

    const { pin, branchId } = validation.data;
    const effectiveTenantId = context.tenantId;
    const effectiveBranchId = branchId || context.branchId;

    const employees = await this.employeeRepo.findEmployees(effectiveTenantId, effectiveBranchId);

    for (const emp of employees) {
      if (emp.pinHash && await this.pinHasher.verifyPin(pin, emp.pinHash)) {
        return emp;
      }
    }

    throw new UnauthorizedError('PIN incorrecto o empleado inactivo.');
  }
}
