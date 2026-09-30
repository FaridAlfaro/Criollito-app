import { ITelemetryRepository } from '../../domain/repositories';
import { IngestTelemetryDto, IngestTelemetryDtoSchema } from '../dtos/telemetry-dtos';
import { TenantContext } from '@/modules/shared/domain/tenant-context';
import { ValidationError } from '@/modules/shared/domain/errors';
import { TelemetryEvent, AlertEvent } from '../../domain/entities';

export interface IngestTelemetryResult {
  success: boolean;
  event: TelemetryEvent;
  alertTriggered: boolean;
  alert?: AlertEvent;
}

export class IngestTelemetryUseCase {
  constructor(private readonly telemetryRepo: ITelemetryRepository) {}

  async execute(input: IngestTelemetryDto, context: TenantContext): Promise<IngestTelemetryResult> {
    const validation = IngestTelemetryDtoSchema.safeParse(input);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(i => i.message).join(', ');
      throw new ValidationError(`Payload de telemetría inválido: ${errorMsg}`);
    }

    const data = validation.data;
    const effectiveTenantId = context.tenantId;
    const effectiveBranchId = data.branchId || context.branchId;

    if (!effectiveBranchId) {
      throw new ValidationError('La sucursal es obligatoria para registrar eventos de telemetría.');
    }

    const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();

    // 1. Persistir el evento de telemetría / Edge CV
    const event = await this.telemetryRepo.createTelemetryEvent({
      tenantId: effectiveTenantId,
      branchId: effectiveBranchId,
      deviceId: data.deviceId,
      eventType: data.eventType,
      confidence: data.confidence,
      payload: data.payload,
      timestamp,
    });

    let alertTriggered = false;
    let alert: AlertEvent | undefined;

    // 2. Lógica Crítica: Disparador de Alertas por Visión Artificial
    const confidence = data.confidence ?? 1.0;
    const isTrayDepletion = data.eventType.toUpperCase().includes('TRAY') || 
                            data.eventType.toUpperCase().includes('DEPLETION') ||
                            data.eventType === 'EMPTY_SHELF';

    if (confidence >= 0.80 && isTrayDepletion) {
      // Evitar spam de alertas (debounce de 3 minutos para la misma alerta)
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      const recent = await this.telemetryRepo.findRecentEvent(
        effectiveTenantId,
        data.deviceId,
        data.eventType,
        threeMinutesAgo
      );

      // Si no hubo alerta idéntica en los últimos 3 minutos, emitir alerta KDS/POS
      if (!recent || recent.id === event.id) {
        const itemInfo = data.payload.label || data.payload.productName || 'Bandeja de mostrador';
        const msg = `📹 [Edge CV] ${itemInfo} vacía detectada por ${data.deviceId} (Confianza: ${(confidence * 100).toFixed(0)}%). Reposición requerida.`;

        alert = await this.telemetryRepo.createAlert(
          effectiveTenantId,
          effectiveBranchId,
          msg,
          'LOW_STOCK'
        );
        alertTriggered = true;
      }
    }

    return {
      success: true,
      event,
      alertTriggered,
      alert,
    };
  }
}
