import { Employee, TimeClockLog, Shift, ApiKey, Role, ClockEventType, DayOfWeek, ShiftType } from './entities';
import { DrizzleTransaction } from '@/modules/shared/infrastructure/transaction';

export interface CreateEmployeeInput {
  tenantId: string;
  branchId?: string | null;
  userId?: string | null;
  name: string;
  email: string;
  role: Role;
  baseSalary?: number;
  hourlyRate?: number;
  pinHash?: string | null;
}

export interface UpdateEmployeeInput {
  name?: string;
  email?: string;
  role?: Role;
  branchId?: string | null;
  baseSalary?: number;
  hourlyRate?: number;
  pinHash?: string | null;
  isActive?: boolean;
}

export interface CreateTimeClockLogInput {
  tenantId: string;
  branchId: string;
  employeeId: string;
  eventType: ClockEventType;
  timestamp: Date;
  deviceInfo?: string | null;
  notes?: string | null;
}

export interface CreateApiKeyInput {
  tenantId: string;
  branchId?: string | null;
  name: string;
  keyHash: string;
  keyPrefix: string;
  role: Role;
}

export interface IEmployeeRepository {
  findEmployees(tenantId: string, branchId?: string | null, tx?: DrizzleTransaction): Promise<Employee[]>;
  findEmployeeById(tenantId: string, employeeId: string, tx?: DrizzleTransaction): Promise<Employee | null>;
  findEmployeeByEmail(tenantId: string, email: string, tx?: DrizzleTransaction): Promise<Employee | null>;
  createEmployee(data: CreateEmployeeInput, tx?: DrizzleTransaction): Promise<Employee>;
  updateEmployee(tenantId: string, employeeId: string, data: UpdateEmployeeInput, tx?: DrizzleTransaction): Promise<Employee>;
  createUserAuth(data: { tenantId: string; branchId?: string | null; name: string; email: string; passwordHash: string; role: Role; pinHash?: string | null }, tx?: DrizzleTransaction): Promise<{ id: string; name: string; email: string; role: Role; createdAt: Date }>;
  findUsers(tenantId: string, tx?: DrizzleTransaction): Promise<{ id: string; tenantId: string; branchId: string | null; name: string; email: string; role: Role; isActive: boolean; createdAt: Date }[]>;
  updateUserBranch(tenantId: string, userId: string, branchId: string | null, tx?: DrizzleTransaction): Promise<void>;
  
  // Shifts
  findShifts(tenantId: string, branchId?: string | null, tx?: DrizzleTransaction): Promise<Shift[]>;
  findShiftByEmployeeAndDay(tenantId: string, employeeId: string, day: DayOfWeek, shiftType: ShiftType, tx?: DrizzleTransaction): Promise<Shift | null>;
  createShift(tenantId: string, employeeId: string, day: DayOfWeek, shiftType: ShiftType, branchId?: string | null, tx?: DrizzleTransaction): Promise<Shift>;
  deleteShift(tenantId: string, shiftId: string, tx?: DrizzleTransaction): Promise<void>;
}

export interface ITimeClockRepository {
  createLog(data: CreateTimeClockLogInput, tx?: DrizzleTransaction): Promise<TimeClockLog>;
  findRecentLog(tenantId: string, employeeId: string, eventType: ClockEventType, since: Date, tx?: DrizzleTransaction): Promise<TimeClockLog | null>;
  findLogsByPeriod(tenantId: string, branchId?: string | null, employeeId?: string | null, from?: Date, to?: Date, tx?: DrizzleTransaction): Promise<TimeClockLog[]>;
}

export interface IApiKeyRepository {
  createApiKey(data: CreateApiKeyInput, tx?: DrizzleTransaction): Promise<ApiKey>;
  findApiKeyByHash(keyHash: string, tx?: DrizzleTransaction): Promise<ApiKey | null>;
  updateLastUsed(id: string, timestamp: Date, tx?: DrizzleTransaction): Promise<void>;
  listApiKeys(tenantId: string, tx?: DrizzleTransaction): Promise<ApiKey[]>;
  revokeApiKey(tenantId: string, id: string, tx?: DrizzleTransaction): Promise<void>;
}

export interface IPinHasher {
  hashPin(pin: string): Promise<string>;
  verifyPin(pin: string, hash: string): Promise<boolean>;
}
