'use server';

import { getCurrentUserSession } from '@/lib/auth-session';
import { manageEmployeesUseCase, Shift } from '@/modules/identity';
import { shifts as shiftsTable } from '@/db/schema';
import { revalidatePath } from 'next/cache';

export type ShiftRow = typeof shiftsTable.$inferSelect;

function mapToShiftRow(s: Shift): ShiftRow & { employeeName: string; employeeRole: string } {
  return {
    id: s.id,
    tenantId: s.tenantId,
    branchId: s.branchId,
    employeeId: s.employeeId,
    day: s.day,
    shiftType: s.shiftType,
    createdAt: s.createdAt,
    employeeName: s.employeeName ?? 'Desconocido',
    employeeRole: s.employeeRole ?? 'CASHIER',
  };
}

/**
 * Server Action Thin Controller: Lista los turnos programados del tenant/sucursal.
 */
export async function fetchShifts(branchId?: string | null): Promise<(ShiftRow & { employeeName: string; employeeRole: string })[]> {
  const session = await getCurrentUserSession();

  const shifts = await manageEmployeesUseCase.listShifts({
    tenantId: session.tenantId,
    branchId: session.branchId,
    userId: session.id,
    role: session.role,
    name: session.name,
  }, branchId);

  return shifts.map(mapToShiftRow);
}

/**
 * Server Action Thin Controller: Asigna un turno semanal a un empleado.
 */
export async function assignShift(
  employeeId: string,
  day: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo',
  shiftType: 'morning' | 'afternoon' | 'night',
  branchId?: string | null
): Promise<ShiftRow> {
  const session = await getCurrentUserSession();

  const createdShift = await manageEmployeesUseCase.assignShift({
    employeeId,
    day,
    shiftType,
    branchId,
  }, {
    tenantId: session.tenantId,
    branchId: session.branchId,
    userId: session.id,
    role: session.role,
    name: session.name,
  });

  revalidatePath('/admin');
  return {
    id: createdShift.id,
    tenantId: createdShift.tenantId,
    branchId: createdShift.branchId,
    employeeId: createdShift.employeeId,
    day: createdShift.day,
    shiftType: createdShift.shiftType,
    createdAt: createdShift.createdAt,
  };
}

/**
 * Server Action Thin Controller: Elimina un turno asignado.
 */
export async function removeShift(shiftId: string): Promise<void> {
  const session = await getCurrentUserSession();

  await manageEmployeesUseCase.removeShift(shiftId, {
    tenantId: session.tenantId,
    branchId: session.branchId,
    userId: session.id,
    role: session.role,
    name: session.name,
  });

  revalidatePath('/admin');
}
