import { IEmployeeRepository, ITimeClockRepository, IPinHasher } from '../../domain/repositories';
import { RecordTimeClockDto, RecordTimeClockDtoSchema } from '../dtos/time-clock-dtos';
import { TenantContext } from '@/modules/shared/domain/tenant-context';
import { ValidationError, UnauthorizedError, ConflictError } from '@/modules/shared/domain/errors';
import { TimeClockLog } from '../../domain/entities';

export interface RecordTimeClockResult {
  success: boolean;
  log: TimeClockLog;
  employee: {
    id: string;
    name: string;
    role: string;
  };
}

export class RecordTimeClockUseCase {
  constructor(
    private readonly employeeRepo: IEmployeeRepository,
    private readonly timeClockRepo: ITimeClockRepository,
    private readonly pinHasher: IPinHasher
  ) {}

  async execute(input: RecordTimeClockDto, context: TenantContext): Promise<RecordTimeClockResult> {
    const validation = RecordTimeClockDtoSchema.safeParse(input);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(i => i.message).join(', ');
      throw new ValidationError(`Error al registrar fichada: ${errorMsg}`);
    }

    const { pin, eventType, branchId, deviceInfo, notes } = validation.data;
    const effectiveTenantId = context.tenantId;
    const effectiveBranchId = branchId || context.branchId;

    if (!effectiveBranchId) {
      throw new ValidationError('La sucursal es requerida para registrar el control horario.');
    }

    // 1. Obtener empleados activos de la sucursal/tenant
    const employees = await this.employeeRepo.findEmployees(effectiveTenantId, effectiveBranchId);
    
    // 2. Identificar al empleado autenticando su PIN
    let matchedEmployee = null;
    for (const emp of employees) {
      if (emp.pinHash && await this.pinHasher.verifyPin(pin, emp.pinHash)) {
        matchedEmployee = emp;
        break;
      }
    }

    if (!matchedEmployee) {
      throw new UnauthorizedError('PIN inválido o empleado no registrado en esta sucursal.');
    }

    // 3. Prevención de dobles marcas accidentales (Debounce de 60 segundos)
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
    const recentLog = await this.timeClockRepo.findRecentLog(
      effectiveTenantId, 
      matchedEmployee.id, 
      eventType, 
      sixtySecondsAgo
    );

    if (recentLog) {
      throw new ConflictError(
        `Marca duplicada detectada (${eventType}). Por favor espere 1 minuto antes de volver a registrar el mismo evento.`
      );
    }

    // 4. Registrar la fichada con timestamp seguro del servidor
    const log = await this.timeClockRepo.createLog({
      tenantId: effectiveTenantId,
      branchId: effectiveBranchId,
      employeeId: matchedEmployee.id,
      eventType,
      timestamp: new Date(),
      deviceInfo: deviceInfo || null,
      notes: notes || null,
    });

    return {
      success: true,
      log,
      employee: {
        id: matchedEmployee.id,
        name: matchedEmployee.name,
        role: matchedEmployee.role,
      },
    };
  }
}
