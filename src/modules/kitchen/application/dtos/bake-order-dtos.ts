import { z } from 'zod';

export const QueueBakeOrderDtoSchema = z.object({
  productId: z.string().min(1, 'El ID de producto es requerido'),
  recipeId: z.string().optional().nullable(),
  quantityNeeded: z.number().positive('La cantidad requerida debe ser mayor a 0'),
  priority: z.number().int().min(1).optional().default(1),
  notes: z.string().optional().nullable(),
});

export const UpdateBakeStatusDtoSchema = z.object({
  taskId: z.string().min(1, 'El ID de la orden es requerido'),
  status: z.enum(['PENDING', 'BAKING', 'COMPLETED']),
  startedAt: z.date().optional(),
});

export type QueueBakeOrderDto = z.input<typeof QueueBakeOrderDtoSchema>;
export type UpdateBakeStatusDto = z.input<typeof UpdateBakeStatusDtoSchema>;
