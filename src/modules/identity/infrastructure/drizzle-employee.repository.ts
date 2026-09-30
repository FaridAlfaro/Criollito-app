import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { employees as employeesTable, users as usersTable, shifts as shiftsTable } from '@/db/schema';
import { 
  IEmployeeRepository, 
  CreateEmployeeInput, 
  UpdateEmployeeInput 
} from '../domain/repositories';
import { Employee, Shift, Role, DayOfWeek, ShiftType } from '../domain/entities';
import { DrizzleTransaction, DbOrTx } from '@/modules/shared/infrastructure/transaction';

export class DrizzleEmployeeRepository implements IEmployeeRepository {
  private getClient(tx?: DrizzleTransaction): DbOrTx {
    return tx || db;
  }

  async findEmployees(
    tenantId: string, 
    branchId?: string | null, 
    tx?: DrizzleTransaction
  ): Promise<Employee[]> {
    const client = this.getClient(tx);

    const query = branchId
      ? and(
          eq(employeesTable.tenantId, tenantId),
          eq(employeesTable.branchId, branchId),
          eq(employeesTable.isActive, true)
        )
      : and(
          eq(employeesTable.tenantId, tenantId),
          eq(employeesTable.isActive, true)
        );

    const rows = await client.select().from(employeesTable).where(query);

    return rows.map(r => ({
      id: r.id,
      tenantId: r.tenantId,
      branchId: r.branchId,
      userId: r.userId,
      name: r.name,
      email: r.email,
      pinHash: r.pinHash,
      role: r.role as Role,
      baseSalary: parseFloat(r.baseSalary),
      hourlyRate: parseFloat(r.hourlyRate),
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async findEmployeeById(
    tenantId: string, 
    employeeId: string, 
    tx?: DrizzleTransaction
  ): Promise<Employee | null> {
    const client = this.getClient(tx);

    const [emp] = await client
      .select()
      .from(employeesTable)
      .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.tenantId, tenantId)));

    if (!emp) return null;

    return {
      id: emp.id,
      tenantId: emp.tenantId,
      branchId: emp.branchId,
      userId: emp.userId,
      name: emp.name,
      email: emp.email,
      pinHash: emp.pinHash,
      role: emp.role as Role,
      baseSalary: parseFloat(emp.baseSalary),
      hourlyRate: parseFloat(emp.hourlyRate),
      isActive: emp.isActive,
      createdAt: emp.createdAt,
      updatedAt: emp.updatedAt,
    };
  }

  async findEmployeeByEmail(
    tenantId: string, 
    email: string, 
    tx?: DrizzleTransaction
  ): Promise<Employee | null> {
    const client = this.getClient(tx);

    const [emp] = await client
      .select()
      .from(employeesTable)
      .where(and(eq(employeesTable.email, email), eq(employeesTable.tenantId, tenantId)));

    if (!emp) return null;

    return {
      id: emp.id,
      tenantId: emp.tenantId,
      branchId: emp.branchId,
      userId: emp.userId,
      name: emp.name,
      email: emp.email,
      pinHash: emp.pinHash,
      role: emp.role as Role,
      baseSalary: parseFloat(emp.baseSalary),
      hourlyRate: parseFloat(emp.hourlyRate),
      isActive: emp.isActive,
      createdAt: emp.createdAt,
      updatedAt: emp.updatedAt,
    };
  }

  async createEmployee(
    data: CreateEmployeeInput, 
    tx?: DrizzleTransaction
  ): Promise<Employee> {
    const client = this.getClient(tx);

    const [emp] = await client.insert(employeesTable).values({
      tenantId: data.tenantId,
      branchId: data.branchId || null,
      userId: data.userId || null,
      name: data.name,
      email: data.email,
      role: data.role,
      baseSalary: (data.baseSalary ?? 0).toString(),
      hourlyRate: (data.hourlyRate ?? 0).toString(),
      pinHash: data.pinHash || null,
      isActive: true,
    }).returning();

    return {
      id: emp.id,
      tenantId: emp.tenantId,
      branchId: emp.branchId,
      userId: emp.userId,
      name: emp.name,
      email: emp.email,
      pinHash: emp.pinHash,
      role: emp.role as Role,
      baseSalary: parseFloat(emp.baseSalary),
      hourlyRate: parseFloat(emp.hourlyRate),
      isActive: emp.isActive,
      createdAt: emp.createdAt,
      updatedAt: emp.updatedAt,
    };
  }

  async updateEmployee(
    tenantId: string, 
    employeeId: string, 
    data: UpdateEmployeeInput, 
    tx?: DrizzleTransaction
  ): Promise<Employee> {
    const client = this.getClient(tx);

    const updateSet: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateSet.name = data.name;
    if (data.email !== undefined) updateSet.email = data.email;
    if (data.role !== undefined) updateSet.role = data.role;
    if (data.branchId !== undefined) updateSet.branchId = data.branchId;
    if (data.baseSalary !== undefined) updateSet.baseSalary = data.baseSalary.toString();
    if (data.hourlyRate !== undefined) updateSet.hourlyRate = data.hourlyRate.toString();
    if (data.pinHash !== undefined) updateSet.pinHash = data.pinHash;
    if (data.isActive !== undefined) updateSet.isActive = data.isActive;

    const [updated] = await client
      .update(employeesTable)
      .set(updateSet)
      .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.tenantId, tenantId)))
      .returning();

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      branchId: updated.branchId,
      userId: updated.userId,
      name: updated.name,
      email: updated.email,
      pinHash: updated.pinHash,
      role: updated.role as Role,
      baseSalary: parseFloat(updated.baseSalary),
      hourlyRate: parseFloat(updated.hourlyRate),
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async createUserAuth(
    data: { 
      tenantId: string; 
      branchId?: string | null; 
      name: string; 
      email: string; 
      passwordHash: string; 
      role: Role; 
      pinHash?: string | null 
    }, 
    tx?: DrizzleTransaction
  ): Promise<{ id: string; name: string; email: string; role: Role; createdAt: Date }> {
    const client = this.getClient(tx);

    const [user] = await client.insert(usersTable).values({
      tenantId: data.tenantId,
      branchId: data.branchId || null,
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      role: data.role,
      pinHash: data.pinHash || null,
      isActive: true,
    }).returning();

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as Role,
      createdAt: user.createdAt,
    };
  }

  async findUsers(
    tenantId: string, 
    tx?: DrizzleTransaction
  ): Promise<{ id: string; tenantId: string; branchId: string | null; name: string; email: string; role: Role; isActive: boolean; createdAt: Date }[]> {
    const client = this.getClient(tx);

    const rows = await client
      .select()
      .from(usersTable)
      .where(eq(usersTable.tenantId, tenantId));

    return rows.map(u => ({
      id: u.id,
      tenantId: u.tenantId,
      branchId: u.branchId,
      name: u.name,
      email: u.email,
      role: u.role as Role,
      isActive: u.isActive,
      createdAt: u.createdAt,
    }));
  }

  async updateUserBranch(
    tenantId: string,
    userId: string,
    branchId: string | null,
    tx?: DrizzleTransaction
  ): Promise<void> {
    const client = this.getClient(tx);

    await client
      .update(usersTable)
      .set({ branchId: branchId || null })
      .where(and(eq(usersTable.id, userId), eq(usersTable.tenantId, tenantId)));
  }

  // ==========================================
  // SHIFTS (Turnos)
  // ==========================================

  async findShifts(
    tenantId: string, 
    branchId?: string | null, 
    tx?: DrizzleTransaction
  ): Promise<Shift[]> {
    const client = this.getClient(tx);

    const query = branchId
      ? and(eq(shiftsTable.tenantId, tenantId), eq(shiftsTable.branchId, branchId))
      : eq(shiftsTable.tenantId, tenantId);

    const rows = await client
      .select({
        shift: shiftsTable,
        employeeName: employeesTable.name,
        employeeRole: employeesTable.role,
      })
      .from(shiftsTable)
      .leftJoin(employeesTable, eq(shiftsTable.employeeId, employeesTable.id))
      .where(query);

    return rows.map(r => ({
      id: r.shift.id,
      tenantId: r.shift.tenantId,
      branchId: r.shift.branchId,
      employeeId: r.shift.employeeId,
      employeeName: r.employeeName ?? 'Desconocido',
      employeeRole: (r.employeeRole as Role) ?? 'CASHIER',
      day: r.shift.day as DayOfWeek,
      shiftType: r.shift.shiftType as ShiftType,
      createdAt: r.shift.createdAt,
    }));
  }

  async findShiftByEmployeeAndDay(
    tenantId: string, 
    employeeId: string, 
    day: DayOfWeek, 
    shiftType: ShiftType, 
    tx?: DrizzleTransaction
  ): Promise<Shift | null> {
    const client = this.getClient(tx);

    const existing = await client.query.shifts.findFirst({
      where: (s, { and, eq }) => and(
        eq(s.tenantId, tenantId),
        eq(s.employeeId, employeeId),
        eq(s.day, day),
        eq(s.shiftType, shiftType)
      )
    });

    if (!existing) return null;

    return {
      id: existing.id,
      tenantId: existing.tenantId,
      branchId: existing.branchId,
      employeeId: existing.employeeId,
      day: existing.day as DayOfWeek,
      shiftType: existing.shiftType as ShiftType,
      createdAt: existing.createdAt,
    };
  }

  async createShift(
    tenantId: string, 
    employeeId: string, 
    day: DayOfWeek, 
    shiftType: ShiftType, 
    branchId?: string | null, 
    tx?: DrizzleTransaction
  ): Promise<Shift> {
    const client = this.getClient(tx);

    const [shift] = await client.insert(shiftsTable).values({
      tenantId,
      branchId: branchId || null,
      employeeId,
      day,
      shiftType,
    }).returning();

    return {
      id: shift.id,
      tenantId: shift.tenantId,
      branchId: shift.branchId,
      employeeId: shift.employeeId,
      day: shift.day as DayOfWeek,
      shiftType: shift.shiftType as ShiftType,
      createdAt: shift.createdAt,
    };
  }

  async deleteShift(
    tenantId: string, 
    shiftId: string, 
    tx?: DrizzleTransaction
  ): Promise<void> {
    const client = this.getClient(tx);

    await client
      .delete(shiftsTable)
      .where(and(eq(shiftsTable.id, shiftId), eq(shiftsTable.tenantId, tenantId)));
  }
}
