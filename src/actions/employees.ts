'use server';

import { getCurrentUserSession } from '@/lib/auth-session';
import { 
  manageEmployeesUseCase, 
  recordTimeClockUseCase,
  Employee
} from '@/modules/identity';
import { employees as employeesTable } from '@/db/schema';
import { revalidatePath } from 'next/cache';

export type EmployeeRow = typeof employeesTable.$inferSelect;

function mapToEmployeeRow(emp: Employee): EmployeeRow {
  return {
    id: emp.id,
    tenantId: emp.tenantId,
    branchId: emp.branchId,
    userId: emp.userId,
    name: emp.name,
    email: emp.email,
    pinHash: emp.pinHash,
    role: emp.role,
    baseSalary: emp.baseSalary.toString(),
    hourlyRate: emp.hourlyRate.toString(),
    isActive: emp.isActive,
    createdAt: emp.createdAt,
    updatedAt: emp.updatedAt,
  };
}

/**
 * Server Action Thin Controller: Lista los empleados activos del tenant/sucursal.
 */
export async function fetchEmployees(branchId?: string | null): Promise<EmployeeRow[]> {
  const session = await getCurrentUserSession();

  const emps = await manageEmployeesUseCase.listEmployees({
    tenantId: session.tenantId,
    branchId: session.branchId,
    userId: session.id,
    role: session.role,
    name: session.name,
  }, branchId);

  return emps.map(mapToEmployeeRow);
}

/**
 * Server Action Thin Controller: Actualiza el salario y tarifa por hora de un empleado.
 */
export async function updateEmployeeSalary(
  employeeId: string,
  baseSalary: number,
  hourlyRate: number
): Promise<EmployeeRow> {
  const session = await getCurrentUserSession();

  const updated = await manageEmployeesUseCase.updateSalary({
    employeeId,
    baseSalary,
    hourlyRate,
  }, {
    tenantId: session.tenantId,
    branchId: session.branchId,
    userId: session.id,
    role: session.role,
    name: session.name,
  });

  revalidatePath('/admin');
  return mapToEmployeeRow(updated);
}

/**
 * Server Action Thin Controller: Da de alta un empleado (datos de RRHH).
 */
export async function addEmployee(data: {
  name: string;
  email: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'BAKER' | 'CASHIER';
  branchId?: string | null;
  baseSalary?: number;
  hourlyRate?: number;
  pin?: string | null;
}): Promise<EmployeeRow> {
  const session = await getCurrentUserSession();

  const created = await manageEmployeesUseCase.addEmployee({
    name: data.name,
    email: data.email,
    role: data.role,
    branchId: data.branchId ?? null,
    baseSalary: data.baseSalary ?? 0,
    hourlyRate: data.hourlyRate ?? 0,
    pin: data.pin ?? null,
  }, {
    tenantId: session.tenantId,
    branchId: session.branchId,
    userId: session.id,
    role: session.role,
    name: session.name,
  });

  revalidatePath('/admin');
  return mapToEmployeeRow(created);
}

/**
 * Server Action Thin Controller: Crea usuario de acceso y registro de empleado.
 */
export async function createEmployee(data: {
  name: string;
  email: string;
  password: string;
  role: 'cajero' | 'panadero' | 'CASHIER' | 'BAKER';
  branchId?: string | null;
  pin?: string | null;
}): Promise<{
  success: boolean;
  data?: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: Date;
  };
  error?: string;
}> {
  try {
    const session = await getCurrentUserSession();

    const res = await manageEmployeesUseCase.createEmployeeUser({
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      branchId: data.branchId || null,
      pin: data.pin || null,
    }, {
      tenantId: session.tenantId,
      branchId: session.branchId,
      userId: session.id,
      role: session.role,
      name: session.name,
    });

    revalidatePath('/admin/usuarios');
    revalidatePath('/admin');
    return res;
  } catch (err: any) {
    console.error('[Action Error] createEmployee:', err);
    if (err.code === '23505' || err.message?.includes('users_email_unique')) {
      return { success: false, error: 'El correo electrónico ya está registrado.' };
    }
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Server Action Thin Controller: Obtiene los usuarios del tenant.
 */
export async function getTenantEmployees() {
  const session = await getCurrentUserSession();

  return manageEmployeesUseCase.listUsers({
    tenantId: session.tenantId,
    branchId: session.branchId,
    userId: session.id,
    role: session.role,
    name: session.name,
  });
}

/**
 * Server Action Thin Controller: Asigna o cambia la sucursal que administra un usuario ADMIN (solo Dueño / Superadmin).
 */
export async function assignAdminBranchAction(
  userId: string, 
  branchId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getCurrentUserSession();

    await manageEmployeesUseCase.assignAdminBranch(userId, branchId, {
      tenantId: session.tenantId,
      branchId: session.branchId,
      userId: session.id,
      role: session.role,
      name: session.name,
    });

    revalidatePath('/admin/usuarios');
    revalidatePath('/superadmin');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    console.error('[Action Error] assignAdminBranchAction:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Server Action Thin Controller: Registra una fichada de personal mediante PIN.
 */
export async function recordTimeClockAction(data: {
  pin: string;
  eventType: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END';
  branchId?: string | null;
  deviceInfo?: string | null;
  notes?: string | null;
}) {
  try {
    const session = await getCurrentUserSession();

    const res = await recordTimeClockUseCase.execute({
      pin: data.pin,
      eventType: data.eventType,
      branchId: data.branchId || session.branchId,
      deviceInfo: data.deviceInfo || 'POS-Terminal',
      notes: data.notes || null,
    }, {
      tenantId: session.tenantId,
      branchId: session.branchId,
      userId: session.id,
      role: session.role,
      name: session.name,
    });

    revalidatePath('/pos');
    revalidatePath('/admin');
    return { success: true, data: res };
  } catch (err) {
    console.error('[Action Error] recordTimeClockAction:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
