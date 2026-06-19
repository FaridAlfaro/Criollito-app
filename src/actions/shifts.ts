'use server';

import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { shifts as shiftsTable, employees } from '@/db/schema';
import { getCurrentUserSession } from '@/lib/auth-session';
import { revalidatePath } from 'next/cache';

export type ShiftRow = typeof shiftsTable.$inferSelect;

export async function fetchShifts(): Promise<(ShiftRow & { employeeName: string; employeeRole: string })[]> {
  const session = await getCurrentUserSession();

  const query = session.branchId
    ? and(eq(shiftsTable.tenantId, session.tenantId), eq(shiftsTable.branchId, session.branchId))
    : eq(shiftsTable.tenantId, session.tenantId);

  const rows = await db.select({
    shift: shiftsTable,
    employeeName: employees.name,
    employeeRole: employees.role,
  })
    .from(shiftsTable)
    .leftJoin(employees, eq(shiftsTable.employeeId, employees.id))
    .where(query);

  return rows.map(r => ({
    ...r.shift,
    employeeName: r.employeeName ?? 'Desconocido',
    employeeRole: r.employeeRole ?? 'CASHIER',
  }));
}

export async function assignShift(
  employeeId: string,
  day: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo',
  shiftType: 'morning' | 'afternoon' | 'night',
  branchId?: string | null
): Promise<ShiftRow> {
  const session = await getCurrentUserSession();

  if (session.role !== 'ADMIN' && session.role !== 'SUPERVISOR' && session.role !== 'SUPER_ADMIN') {
    throw new Error('Sin permisos para asignar turnos.');
  }

  // Verificar que el empleado pertenece al tenant
  const [emp] = await db.select().from(employees).where(
    and(eq(employees.id, employeeId), eq(employees.tenantId, session.tenantId))
  );
  if (!emp) throw new Error('Empleado no encontrado.');

  // Evitar turno duplicado
  const existing = await db.query.shifts.findFirst({
    where: (s, { and, eq }) => and(
      eq(s.employeeId, employeeId),
      eq(s.day, day),
      eq(s.shiftType, shiftType)
    )
  });
  if (existing) throw new Error('El empleado ya tiene ese turno asignado.');

  const [shift] = await db.insert(shiftsTable).values({
    tenantId: session.tenantId,
    branchId: branchId ?? session.branchId,
    employeeId,
    day,
    shiftType,
  }).returning();

  revalidatePath('/admin');
  return shift;
}

export async function removeShift(shiftId: string): Promise<void> {
  const session = await getCurrentUserSession();

  if (session.role !== 'ADMIN' && session.role !== 'SUPERVISOR' && session.role !== 'SUPER_ADMIN') {
    throw new Error('Sin permisos para eliminar turnos.');
  }

  await db.delete(shiftsTable).where(
    and(
      eq(shiftsTable.id, shiftId),
      eq(shiftsTable.tenantId, session.tenantId)
    )
  );

  revalidatePath('/admin');
}
