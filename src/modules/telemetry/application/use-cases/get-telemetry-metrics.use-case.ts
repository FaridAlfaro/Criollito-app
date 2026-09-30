import { ITelemetryRepository } from '../../domain/repositories';
import { QueryMetricsDto, QueryMetricsDtoSchema } from '../dtos/telemetry-dtos';
import { TenantContext } from '@/modules/shared/domain/tenant-context';
import { TelemetryEvent } from '../../domain/entities';

export interface TelemetryMetricsResult {
  events: TelemetryEvent[];
  countsByType: Record<string, number>;
  totalEvents: number;
}

export class GetTelemetryMetricsUseCase {
  constructor(private readonly telemetryRepo: ITelemetryRepository) {}

  async execute(query: QueryMetricsDto, context: TenantContext): Promise<TelemetryMetricsResult> {
    const parsed = QueryMetricsDtoSchema.parse(query);
    const effectiveTenantId = context.tenantId;
    const effectiveBranchId = parsed.branchId ?? context.branchId;

    const since = new Date(Date.now() - parsed.sinceHours * 60 * 60 * 1000);

    const [events, countsByType] = await Promise.all([
      this.telemetryRepo.getRecentEvents(effectiveTenantId, effectiveBranchId, parsed.limit),
      this.telemetryRepo.countEventsByType(effectiveTenantId, effectiveBranchId, since),
    ]);

    const totalEvents = Object.values(countsByType).reduce((acc, curr) => acc + curr, 0);

    return {
      events,
      countsByType,
      totalEvents,
    };
  }
}
