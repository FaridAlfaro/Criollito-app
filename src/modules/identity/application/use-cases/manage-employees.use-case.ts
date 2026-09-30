import { createHash } from 'crypto';
import { IEmployeeRepository, IPinHasher } from '../../domain/repositories';
import { 
  AddEmployeeDto, 
  AddEmployeeDtoSchema, 
  CreateUserEmployeeDto, 
  CreateUserEmployeeDtoSchema, 
  UpdateSalaryDto, 
  UpdateSalaryDtoSchema,
  AssignShiftDto,
  AssignShiftDtoSchema
} from '../dtos/employee-dtos';
import { TenantContext } from '@/modules/shared/domain/tenant-context';
import { ValidationError, UnauthorizedError, ConflictError, NotFoundError } from '@/modules/shared/domain/errors';
import { Employee, Shift, Role } from '../../domain/entities';

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

const EMPLOYEE_ROLES: Record<string, Role> = {
  cajero: 'CASHIER',
  panadero: 'BAKER',
  CASHIER: 'CASHIER',
  BAKER: 'BAKER',
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
};

export interface CreateEmployeeUserResult {
  success: boolean;
  data?: {
    id: string;
    name: string;
    email: string;
    role: Role;
    createdAt: Date;
  };
  error?: string;
}

export class ManageEmployeesUseCase {
  constructor(
    private readonly employeeRepo: IEmployeeRepository,
    private readonly pinHasher: IPinHasher
  ) {}

  async listEmployees(context: TenantContext, branchId?: string | null): Promise<Employee[]> {
    const isGlobal = context.role === 'ADMIN' || context.role === 'SUPER_ADMIN' || context.role === 'SUPERVISOR';
    const branchFilter = branchId !== undefined ? branchId : (isGlobal ? null : context.branchId);
    return this.employeeRepo.findEmployees(context.tenantId, branchFilter);
  }

  async addEmployee(input: AddEmployeeDto, context: TenantContext): Promise<Employee> {
    if (context.role !== 'ADMIN' && context.role !== 'SUPER_ADMIN') {
      throw new UnauthorizedError('Sin permisos para crear empleados.');
    }

    const validation = AddEmployeeDtoSchema.safeParse(input);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(i => i.message).join(', ');
      throw new ValidationError(`Error al validar empleado: ${errorMsg}`);
    }

    const data = validation.data;
    const pinHash = data.pin ? await this.pinHasher.hashPin(data.pin) : null;

    return this.employeeRepo.createEmployee({
      tenantId: context.tenantId,
      branchId: data.branchId || null,
      name: data.name,
      email: data.email,
      role: data.role as Role,
      baseSalary: data.baseSalary,
      hourlyRate: data.hourlyRate,
      pinHash,
    });
  }

  async createEmployeeUser(input: CreateUserEmployeeDto, context: TenantContext): Promise<CreateEmployeeUserResult> {
    if (context.role !== 'ADMIN' && context.role !== 'SUPER_ADMIN') {
      throw new UnauthorizedError('Acceso denegado. Se requiere rol ADMIN o SUPER_ADMIN.');
    }

    const validation = CreateUserEmployeeDtoSchema.safeParse(input);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(i => i.message).join(', ');
      throw new ValidationError(`Error al validar datos: ${errorMsg}`);
    }

    const data = validation.data;
    const dbRole = EMPLOYEE_ROLES[data.role];
    if (!dbRole) {
      throw new ValidationError('Rol de empleado no válido.');
    }

    const passwordHash = hashPassword(data.password);
    const pinHash = data.pin ? await this.pinHasher.hashPin(data.pin) : null;
    const assignedBranchId = data.branchId || null;

    const user = await this.employeeRepo.createUserAuth({
      tenantId: context.tenantId,
      branchId: assignedBranchId,
      name: data.name,
      email: data.email,
      passwordHash,
      role: dbRole,
      pinHash,
    });

    await this.employeeRepo.createEmployee({
      tenantId: context.tenantId,
      branchId: assignedBranchId,
      userId: user.id,
      name: data.name,
      email: data.email,
      role: dbRole,
      pinHash,
    });

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    };
  }

  async updateSalary(input: UpdateSalaryDto, context: TenantContext): Promise<Employee> {
    if (context.role !== 'ADMIN' && context.role !== 'SUPERVISOR' && context.role !== 'SUPER_ADMIN') {
      throw new UnauthorizedError('Sin permisos para modificar salarios.');
    }

    const validation = UpdateSalaryDtoSchema.safeParse(input);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(i => i.message).join(', ');
      throw new ValidationError(`Error al validar salarios: ${errorMsg}`);
    }

    const { employeeId, baseSalary, hourlyRate } = validation.data;

    const updated = await this.employeeRepo.updateEmployee(context.tenantId, employeeId, {
      baseSalary,
      hourlyRate,
    });

    if (!updated) {
      throw new NotFoundError('Empleado', employeeId);
    }

    return updated;
  }

  async listUsers(context: TenantContext) {
    return this.employeeRepo.findUsers(context.tenantId);
  }

  async assignAdminBranch(userId: string, branchId: string | null, context: TenantContext): Promise<void> {
    const isOwnerOrSuperAdmin = 
      context.role === 'SUPERVISOR' || 
      (context.role as string) === 'OWNER' || 
      context.role === 'SUPER_ADMIN';

    if (!isOwnerOrSuperAdmin) {
      throw new UnauthorizedError('Solo el Dueño o Superadmin pueden asignar sucursales a los administradores.');
    }

    await this.employeeRepo.updateUserBranch(context.tenantId, userId, branchId);
  }

  // ==========================================
  // TURNOS (Shifts)
  // ==========================================

  async listShifts(context: TenantContext, branchId?: string | null): Promise<Shift[]> {
    const effectiveBranchId = branchId !== undefined ? branchId : context.branchId;
    return this.employeeRepo.findShifts(context.tenantId, effectiveBranchId);
  }

  async assignShift(input: AssignShiftDto, context: TenantContext): Promise<Shift> {
    if (context.role !== 'ADMIN' && context.role !== 'SUPERVISOR' && context.role !== 'SUPER_ADMIN') {
      throw new UnauthorizedError('Sin permisos para asignar turnos.');
    }

    const validation = AssignShiftDtoSchema.safeParse(input);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(i => i.message).join(', ');
      throw new ValidationError(`Error al validar turno: ${errorMsg}`);
    }

    const { employeeId, day, shiftType, branchId } = validation.data;

    const emp = await this.employeeRepo.findEmployeeById(context.tenantId, employeeId);
    if (!emp) {
      throw new NotFoundError('Empleado', employeeId);
    }

    const existing = await this.employeeRepo.findShiftByEmployeeAndDay(
      context.tenantId,
      employeeId,
      day,
      shiftType
    );

    if (existing) {
      throw new ConflictError('El empleado ya tiene ese turno asignado.');
    }

    return this.employeeRepo.createShift(
      context.tenantId,
      employeeId,
      day,
      shiftType,
      branchId ?? context.branchId
    );
  }

  async removeShift(shiftId: string, context: TenantContext): Promise<void> {
    if (context.role !== 'ADMIN' && context.role !== 'SUPERVISOR' && context.role !== 'SUPER_ADMIN') {
      throw new UnauthorizedError('Sin permisos para eliminar turnos.');
    }

    await this.employeeRepo.deleteShift(context.tenantId, shiftId);
  }
}
