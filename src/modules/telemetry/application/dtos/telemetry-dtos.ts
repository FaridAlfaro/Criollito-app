import { z } from 'zod';

export const IngestTelemetryDtoSchema = z.object({
  deviceId: z.string().min(1, 'El ID de dispositivo/cámara es requerido'),
  eventType: z.string().min(1, 'El tipo de evento es requerido'),
  confidence: z.number().min(0).max(1).optional().nullable(),
  payload: z.record(z.string(), z.any()),
  timestamp: z.string().datetime().or(z.date()).optional(),
  branchId: z.string().optional().nullable(),
});

export const QueryMetricsDtoSchema = z.object({
  branchId: z.string().optional().nullable(),
  sinceHours: z.number().int().positive().optional().default(24),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

export type IngestTelemetryDto = z.infer<typeof IngestTelemetryDtoSchema>;
export type QueryMetricsDto = z.infer<typeof QueryMetricsDtoSchema>;
