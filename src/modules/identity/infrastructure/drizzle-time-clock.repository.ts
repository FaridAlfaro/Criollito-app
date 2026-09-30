import { eq, and, gte, lte } from 'drizzle-orm';
import { db } from '@/db';
import { timeClockLogs, employees } from '@/db/schema';
import { 
  ITimeClockRepository, 
  CreateTimeClockLogInput 
} from '../domain/repositories';
import { TimeClockLog, ClockEventType } from '../domain/entities';
import { DrizzleTransaction, DbOrTx } from '@/modules/shared/infrastructure/transaction';

export class DrizzleTimeClockRepository implements ITimeClockRepository {
  private getClient(tx?: DrizzleTransaction): DbOrTx {
    return tx || db;
  }

  async createLog(
    data: CreateTimeClockLogInput, 
    tx?: DrizzleTransaction
  ): Promise<TimeClockLog> {
    const client = this.getClient(tx);

    const [log] = await client.insert(timeClockLogs).values({
      tenantId: data.tenantId,
      branchId: data.branchId,
      employeeId: data.employeeId,
      eventType: data.eventType,
      timestamp: data.timestamp,
      deviceInfo: data.deviceInfo || null,
      notes: data.notes || null,
    }).returning();

    return {
      id: log.id,
      tenantId: log.tenantId,
      branchId: log.branchId,
      employeeId: log.employeeId,
      eventType: log.eventType as ClockEventType,
      timestamp: log.timestamp,
      deviceInfo: log.deviceInfo,
      notes: log.notes,
      createdAt: log.createdAt,
    };
  }

  async findRecentLog(
    tenantId: string, 
    employeeId: string, 
    eventType: ClockEventType, 
    since: Date, 
    tx?: DrizzleTransaction
  ): Promise<TimeClockLog | null> {
    const client = this.getClient(tx);

    const [recent] = await client
      .select()
      .from(timeClockLogs)
      .where(and(
        eq(timeClockLogs.tenantId, tenantId),
        eq(timeClockLogs.employeeId, employeeId),
        eq(timeClockLogs.eventType, eventType),
        gte(timeClockLogs.timestamp, since)
      ));

    if (!recent) return null;

    return {
      id: recent.id,
      tenantId: recent.tenantId,
      branchId: recent.branchId,
      employeeId: recent.employeeId,
      eventType: recent.eventType as ClockEventType,
      timestamp: recent.timestamp,
      deviceInfo: recent.deviceInfo,
      notes: recent.notes,
      createdAt: recent.createdAt,
    };
  }

  async findLogsByPeriod(
    tenantId: string, 
    branchId?: string | null, 
    employeeId?: string | null, 
    from?: Date, 
    to?: Date, 
    tx?: DrizzleTransaction
  ): Promise<TimeClockLog[]> {
    const client = this.getClient(tx);

    const conditions = [eq(timeClockLogs.tenantId, tenantId)];
    if (branchId) conditions.push(eq(timeClockLogs.branchId, branchId));
    if (employeeId) conditions.push(eq(timeClockLogs.employeeId, employeeId));
    if (from) conditions.push(gte(timeClockLogs.timestamp, from));
    if (to) conditions.push(lte(timeClockLogs.timestamp, to));

    const rows = await client
      .select({
        log: timeClockLogs,
        employeeName: employees.name,
      })
      .from(timeClockLogs)
      .leftJoin(employees, eq(timeClockLogs.employeeId, employees.id))
      .where(and(...conditions));

    return rows.map(r => ({
      id: r.log.id,
      tenantId: r.log.tenantId,
      branchId: r.log.branchId,
      employeeId: r.log.employeeId,
      employeeName: r.employeeName ?? undefined,
      eventType: r.log.eventType as ClockEventType,
      timestamp: r.log.timestamp,
      deviceInfo: r.log.deviceInfo,
      notes: r.log.notes,
      createdAt: r.log.createdAt,
    }));
  }
}
