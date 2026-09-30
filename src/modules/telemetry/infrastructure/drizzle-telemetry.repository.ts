import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { telemetryEvents, alerts } from '@/db/schema';
import { 
  ITelemetryRepository, 
  CreateTelemetryEventInput 
} from '../domain/repositories';
import { TelemetryEvent, AlertEvent } from '../domain/entities';
import { DrizzleTransaction, DbOrTx } from '@/modules/shared/infrastructure/transaction';

export class DrizzleTelemetryRepository implements ITelemetryRepository {
  private getClient(tx?: DrizzleTransaction): DbOrTx {
    return tx || db;
  }

  async createTelemetryEvent(
    data: CreateTelemetryEventInput, 
    tx?: DrizzleTransaction
  ): Promise<TelemetryEvent> {
    const client = this.getClient(tx);

    const [created] = await client.insert(telemetryEvents).values({
      tenantId: data.tenantId,
      branchId: data.branchId,
      deviceId: data.deviceId,
      eventType: data.eventType,
      confidence: data.confidence !== undefined && data.confidence !== null ? data.confidence.toString() : null,
      payload: data.payload,
      processed: false,
      timestamp: data.timestamp || new Date(),
    }).returning();

    return {
      id: created.id,
      tenantId: created.tenantId,
      branchId: created.branchId,
      deviceId: created.deviceId,
      eventType: created.eventType,
      confidence: created.confidence ? parseFloat(created.confidence) : null,
      payload: created.payload as Record<string, unknown>,
      processed: created.processed,
      timestamp: created.timestamp,
      createdAt: created.createdAt,
    };
  }

  async findRecentEvent(
    tenantId: string, 
    deviceId: string, 
    eventType: string, 
    since: Date, 
    tx?: DrizzleTransaction
  ): Promise<TelemetryEvent | null> {
    const client = this.getClient(tx);

    const [recent] = await client
      .select()
      .from(telemetryEvents)
      .where(and(
        eq(telemetryEvents.tenantId, tenantId),
        eq(telemetryEvents.deviceId, deviceId),
        eq(telemetryEvents.eventType, eventType),
        gte(telemetryEvents.createdAt, since)
      ))
      .orderBy(desc(telemetryEvents.createdAt))
      .limit(1);

    if (!recent) return null;

    return {
      id: recent.id,
      tenantId: recent.tenantId,
      branchId: recent.branchId,
      deviceId: recent.deviceId,
      eventType: recent.eventType,
      confidence: recent.confidence ? parseFloat(recent.confidence) : null,
      payload: recent.payload as Record<string, unknown>,
      processed: recent.processed,
      timestamp: recent.timestamp,
      createdAt: recent.createdAt,
    };
  }

  async createAlert(
    tenantId: string, 
    targetBranchId: string | null, 
    message: string, 
    type: 'LOW_STOCK' | 'SYSTEM' = 'LOW_STOCK',
    tx?: DrizzleTransaction
  ): Promise<AlertEvent> {
    const client = this.getClient(tx);

    const [created] = await client.insert(alerts).values({
      tenantId,
      targetBranchId,
      type,
      message,
      isRead: false,
    }).returning();

    return {
      id: created.id,
      tenantId: created.tenantId,
      targetBranchId: created.targetBranchId,
      type: created.type as AlertEvent['type'],
      message: created.message,
      isRead: created.isRead,
      createdAt: created.createdAt,
    };
  }

  async getRecentEvents(
    tenantId: string, 
    branchId?: string | null, 
    limit = 50, 
    tx?: DrizzleTransaction
  ): Promise<TelemetryEvent[]> {
    const client = this.getClient(tx);

    const conditions = [eq(telemetryEvents.tenantId, tenantId)];
    if (branchId) {
      conditions.push(eq(telemetryEvents.branchId, branchId));
    }

    const rows = await client
      .select()
      .from(telemetryEvents)
      .where(and(...conditions))
      .orderBy(desc(telemetryEvents.createdAt))
      .limit(limit);

    return rows.map(r => ({
      id: r.id,
      tenantId: r.tenantId,
      branchId: r.branchId,
      deviceId: r.deviceId,
      eventType: r.eventType,
      confidence: r.confidence ? parseFloat(r.confidence) : null,
      payload: r.payload as Record<string, unknown>,
      processed: r.processed,
      timestamp: r.timestamp,
      createdAt: r.createdAt,
    }));
  }

  async countEventsByType(
    tenantId: string, 
    branchId?: string | null, 
    since?: Date, 
    tx?: DrizzleTransaction
  ): Promise<Record<string, number>> {
    const client = this.getClient(tx);

    const conditions = [eq(telemetryEvents.tenantId, tenantId)];
    if (branchId) conditions.push(eq(telemetryEvents.branchId, branchId));
    if (since) conditions.push(gte(telemetryEvents.createdAt, since));

    const rows = await client
      .select({
        eventType: telemetryEvents.eventType,
        count: sql<number>`count(*)::int`,
      })
      .from(telemetryEvents)
      .where(and(...conditions))
      .groupBy(telemetryEvents.eventType);

    const result: Record<string, number> = {};
    for (const r of rows) {
      result[r.eventType] = r.count;
    }
    return result;
  }
}
