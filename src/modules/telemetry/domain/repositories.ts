import { TelemetryEvent, AlertEvent } from './entities';
import { DrizzleTransaction } from '@/modules/shared/infrastructure/transaction';

export interface CreateTelemetryEventInput {
  tenantId: string;
  branchId: string;
  deviceId: string;
  eventType: string;
  confidence?: number | null;
  payload: Record<string, unknown>;
  timestamp?: Date;
}

export interface ITelemetryRepository {
  createTelemetryEvent(
    data: CreateTelemetryEventInput, 
    tx?: DrizzleTransaction
  ): Promise<TelemetryEvent>;

  findRecentEvent(
    tenantId: string, 
    deviceId: string, 
    eventType: string, 
    since: Date, 
    tx?: DrizzleTransaction
  ): Promise<TelemetryEvent | null>;

  createAlert(
    tenantId: string, 
    targetBranchId: string | null, 
    message: string, 
    type?: 'LOW_STOCK' | 'SYSTEM',
    tx?: DrizzleTransaction
  ): Promise<AlertEvent>;

  getRecentEvents(
    tenantId: string, 
    branchId?: string | null, 
    limit?: number, 
    tx?: DrizzleTransaction
  ): Promise<TelemetryEvent[]>;

  countEventsByType(
    tenantId: string, 
    branchId?: string | null, 
    since?: Date, 
    tx?: DrizzleTransaction
  ): Promise<Record<string, number>>;
}
