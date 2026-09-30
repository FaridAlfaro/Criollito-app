import { z } from 'zod';

export const SaleItemInputSchema = z.object({
  productId: z.string().min(1, 'El ID de producto es requerido'),
  quantity: z.number().positive('La cantidad debe ser mayor a 0'),
  unitPrice: z.number().nonnegative('El precio unitario no puede ser negativo'),
});

export const ProcessSaleInputSchema = z.object({
  items: z.array(SaleItemInputSchema).min(1, 'Debe incluir al menos un producto en la venta'),
  paymentMethod: z.enum(['CASH', 'DEBIT', 'CREDIT', 'QR']),
  cashSessionId: z.string().optional(),
  customerDoc: z.string().optional(),
  comprobanteTipo: z.enum(['FACTURA_A', 'FACTURA_B', 'FACTURA_C']).nullable().optional(),
  cae: z.string().optional(),
  caeExpiration: z.date().optional(),
  numeroComprobante: z.number().optional(),
  qrCodeData: z.string().optional(),
  idempotencyKey: z.string().optional(),
  employeeId: z.string().optional(),
});

export type SaleItemInputDto = z.infer<typeof SaleItemInputSchema>;
export type ProcessSaleInputDto = z.infer<typeof ProcessSaleInputSchema>;
