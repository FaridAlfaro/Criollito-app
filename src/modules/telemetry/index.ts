import { DrizzleTelemetryRepository } from './infrastructure/drizzle-telemetry.repository';
import { IngestTelemetryUseCase } from './application/use-cases/ingest-telemetry.use-case';
import { GetTelemetryMetricsUseCase } from './application/use-cases/get-telemetry-metrics.use-case';

// Instancias de infraestructura y casos de uso
export const telemetryRepository = new DrizzleTelemetryRepository();
export const ingestTelemetryUseCase = new IngestTelemetryUseCase(telemetryRepository);
export const getTelemetryMetricsUseCase = new GetTelemetryMetricsUseCase(telemetryRepository);

export * from './domain/entities';
export * from './domain/repositories';
export * from './application/dtos/telemetry-dtos';
export * from './application/use-cases/ingest-telemetry.use-case';
export * from './application/use-cases/get-telemetry-metrics.use-case';
