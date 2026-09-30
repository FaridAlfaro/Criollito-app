import { z } from 'zod';

export const GenerateApiKeyDtoSchema = z.object({
  name: z.string().min(2, 'El nombre del dispositivo/cliente es requerido'),
  branchId: z.string().optional().nullable(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'BAKER', 'CASHIER']).default('CASHIER'),
});

export type GenerateApiKeyDto = z.infer<typeof GenerateApiKeyDtoSchema>;
