import { z } from 'zod';

export const RecordTimeClockDtoSchema = z.object({
  pin: z.string().min(4, 'El PIN debe contener al menos 4 dígitos').max(8, 'El PIN no puede exceder 8 dígitos'),
  eventType: z.enum(['CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END']),
  branchId: z.string().optional().nullable(),
  deviceInfo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const VerifyPinDtoSchema = z.object({
  pin: z.string().min(4, 'El PIN debe contener al menos 4 dígitos').max(8, 'El PIN no puede exceder 8 dígitos'),
  branchId: z.string().optional().nullable(),
});

export const TimeClockSummaryFilterDtoSchema = z.object({
  branchId: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
  from: z.date().optional(),
  to: z.date().optional(),
});

export type RecordTimeClockDto = z.infer<typeof RecordTimeClockDtoSchema>;
export type VerifyPinDto = z.infer<typeof VerifyPinDtoSchema>;
export type TimeClockSummaryFilterDto = z.infer<typeof TimeClockSummaryFilterDtoSchema>;
