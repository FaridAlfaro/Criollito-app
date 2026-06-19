'use server';

import { db } from '@/db';
import { users, employees as employeesTable } from '@/db/schema';
import { getCurrentUserSession } from '@/lib/auth-session';
import { eq, and } from 'drizzle-orm';
import { createHash } from 'crypto';
import { revalidatePath } from 'next/cache';

export type EmployeeRow = typeof employeesTable.$inferSelect;

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

// ==========================================
// TABLA EMPLOYEES (RRHH - sueldos, turnos)
// ==========================================

export async function fetchEmployees(): Promise<EmployeeRow[]> {
  const session = await getCurrentUserSession();

  const query = (session.role === 'ADMIN' || session.role === 'SUPER_ADMIN')
    ? and(eq(employeesTable.tenantId, session.tenantId), eq(employeesTable.isActive, true))
    : session.branchId
      ? and(
          eq(employeesTable.tenantId, session.tenantId),
          eq(employeesTable.branchId, session.branchId),
          eq(employeesTable.isActive, true)
        )
      : and(eq(employeesTable.tenantId, session.tenantId), eq(employeesTable.isActive, true));

  return db.select().from(employeesTable).where(query);
}

export async function updateEmployeeSalary(
  employeeId: string,
  baseSalary: number,
  hourlyRate: number
): Promise<EmployeeRow> {
  const session = await getCurrentUserSession();

  if (session.role !== 'ADMIN' && session.role !== 'SUPERVISOR' && session.role !== 'SUPER_ADMIN') {
    throw new Error('Sin permisos para modificar salarios.');
  }

  const [updated] = await db.update(employeesTable)
    .set({
      baseSalary: baseSalary.toString(),
      hourlyRate: hourlyRate.toString(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(employeesTable.id, employeeId),
        eq(employeesTable.tenantId, session.tenantId)
      )
    )
    .returning();

  if (!updated) throw new Error('Empleado no encontrado.');
  revalidatePath('/admin');
  return updated;
}

export async function addEmployee(data: {
  name: string;
  email: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'BAKER' | 'CASHIER';
  branchId?: string | null;
  baseSalary?: number;
  hourlyRate?: number;
}): Promise<EmployeeRow> {
  const session = await getCurrentUserSession();

  if (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN') {
    throw new Error('Sin permisos para crear empleados.');
  }

  const [emp] = await db.insert(employeesTable).values({
    tenantId: session.tenantId,
    branchId: data.branchId ?? null,
    name: data.name,
    email: data.email,
    role: data.role,
    baseSalary: (data.baseSalary ?? 0).toString(),
    hourlyRate: (data.hourlyRate ?? 0).toString(),
    isActive: true,
  }).returning();

  revalidatePath('/admin');
  return emp;
}

// ==========================================
// TABLA USERS (autenticación)
// ==========================================

const EMPLOYEE_ROLES = {
  cajero: 'CASHIER' as const,
  panadero: 'BAKER' as const,
  CASHIER: 'CASHIER' as const,
  BAKER: 'BAKER' as const,
};

export async function createEmployee(data: {
  name: string;
  email: string;
  password: string;
  role: 'cajero' | 'panadero' | 'CASHIER' | 'BAKER';
  branchId?: string | null;
}) {
  try {
    const session = await getCurrentUserSession();

    if (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Acceso denegado. Se requiere rol ADMIN o SUPER_ADMIN.' };
    }

    if (!data.name || !data.email || !data.password || !data.role) {
      return { success: false, error: 'Todos los campos son requeridos.' };
    }

    const passwordHash = hashPassword(data.password);
    const dbRole = EMPLOYEE_ROLES[data.role];

    if (!dbRole) {
      return { success: false, error: 'Rol de empleado no válido.' };
    }

    const assignedBranchId = data.branchId || null;

    const [newUser] = await db.insert(users).values({
      tenantId: session.tenantId,
      branchId: assignedBranchId,
      name: data.name,
      email: data.email,
      passwordHash: passwordHash,
      role: dbRole,
      isActive: true,
    }).returning();

    // Crear también el registro en la tabla employees
    await db.insert(employeesTable).values({
      tenantId: session.tenantId,
      branchId: assignedBranchId,
      userId: newUser.id,
      name: data.name,
      email: data.email,
      role: dbRole,
      isActive: true,
    });

    revalidatePath('/admin/usuarios');
    revalidatePath('/admin');
    return {
      success: true,
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      }
    };

  } catch (err: any) {
    console.error('Error in createEmployee:', err);
    if (err.code === '23505' || err.message?.includes('users_email_unique')) {
      return { success: false, error: 'El correo electrónico ya está registrado.' };
    }
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getTenantEmployees() {
  const session = await getCurrentUserSession();

  const result = await db.select()
    .from(users)
    .where(eq(users.tenantId, session.tenantId));

  return result.map(e => ({
    id: e.id,
    tenantId: e.tenantId,
    name: e.name,
    email: e.email,
    role: e.role,
    isActive: e.isActive,
    createdAt: e.createdAt,
  }));
}
