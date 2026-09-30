import { z } from 'zod';

export const OpenSessionInputSchema = z.object({
  initialAmount: z.number().nonnegative('El monto inicial no puede ser negativo'),
});

export const CloseSessionInputSchema = z.object({
  sessionId: z.string().min(1, 'El ID de la sesión es requerido'),
  countedCash: z.number().nonnegative('El monto de efectivo contado no puede ser negativo'),
});

export const RegisterMovementInputSchema = z.object({
  sessionId: z.string().min(1, 'El ID de la sesión es requerido'),
  type: z.enum(['INGRESO', 'EGRESO_PROVEEDOR', 'EGRESO_SUELDO', 'EGRESO_VARIOS']),
  amount: z.number().positive('El monto del movimiento debe ser mayor a 0'),
  description: z.string().optional().default(''),
});

export type OpenSessionInputDto = z.infer<typeof OpenSessionInputSchema>;
export type CloseSessionInputDto = z.infer<typeof CloseSessionInputSchema>;
export type RegisterMovementInputDto = z.infer<typeof RegisterMovementInputSchema>;
