import { ISalesRepository } from '../../domain/repositories';
import { IFiscalInvoiceService } from '../../domain/fiscal-service';
import { ProcessSaleInputDto, ProcessSaleInputSchema } from '../dtos/sale-dtos';
import { TenantContext } from '@/modules/shared/domain/tenant-context';
import { runInTransaction } from '@/modules/shared/infrastructure/transaction';
import { ValidationError, InfrastructureError, DomainError } from '@/modules/shared/domain/errors';
import { Sale } from '../../domain/entities';
import { Result } from '@/modules/shared/domain/result';

export interface ProcessSaleData {
  saleId: string;
  sale: Sale;
  isIdempotentReplay?: boolean;
}

export type ProcessSaleResponse = Result<ProcessSaleData, DomainError | InfrastructureError> & {
  saleId?: string;
  sale?: Sale;
  error?: string;
  isIdempotentReplay?: boolean;
};

export class ProcessSaleUseCase {
  constructor(
    private readonly salesRepo: ISalesRepository,
    private readonly fiscalService: IFiscalInvoiceService
  ) {}

  async execute(input: ProcessSaleInputDto, context: TenantContext): Promise<ProcessSaleResponse> {
    try {
      // 1. Validar DTO de entrada con Zod
      const validation = ProcessSaleInputSchema.safeParse(input);
      if (!validation.success) {
        const errorMsg = validation.error.issues.map(i => i.message).join(', ');
        const valErr = new ValidationError(`Error de validación de venta: ${errorMsg}`);
        return Object.assign(Result.err(valErr), {
          success: false as const,
          error: valErr.message,
        }) as ProcessSaleResponse;
      }

      const data = validation.data;
      const { tenantId, branchId, userId } = context;

      // 2. Control de Idempotencia: si viene idempotencyKey y ya fue procesada, retornar ticket previo
      if (data.idempotencyKey) {
        const existingSale = await this.salesRepo.findByIdempotencyKey(tenantId, data.idempotencyKey);
        if (existingSale) {
          const replayData: ProcessSaleData = {
            saleId: existingSale.id,
            sale: existingSale,
            isIdempotentReplay: true,
          };
          return Object.assign(Result.ok(replayData), {
            success: true as const,
            saleId: existingSale.id,
            sale: existingSale,
            isIdempotentReplay: true,
          }) as ProcessSaleResponse;
        }
      }

      // 3. Ejecutar transacción de venta, descuento de stock y facturación
      const resultData = await runInTransaction(async (tx) => {
        const totalAmount = data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

        let finalCae = data.cae;
        let finalCaeExpiration = data.caeExpiration;
        let finalNumeroComprobante = data.numeroComprobante;
        let finalQrCodeData = data.qrCodeData;

        // 4. Emisión fiscal ARCA si corresponde
        if (data.comprobanteTipo && !finalCae) {
          const netAmount = totalAmount / 1.21;
          const ivaAmount = totalAmount - netAmount;
          const docType = data.customerDoc 
            ? (data.customerDoc.length > 8 ? 'CUIT' : 'DNI') 
            : 'CONSUMIDOR_FINAL';

          const arcaRes = await this.fiscalService.emitInvoice({
            totalAmount,
            netAmount,
            ivaAmount,
            docType,
            docNumber: data.customerDoc || undefined,
            comprobanteTipo: data.comprobanteTipo,
            puntoVenta: 1,
          });

          if (arcaRes.success) {
            finalCae = arcaRes.cae;
            finalCaeExpiration = arcaRes.caeExpiration;
            finalNumeroComprobante = arcaRes.numeroComprobante;
            finalQrCodeData = arcaRes.qrCodeData;
          } else {
            throw new Error(arcaRes.errorMessage || 'Falló la facturación electrónica ARCA.');
          }
        }

        // 5. Registrar la venta y los ítems
        const createdSale = await this.salesRepo.createSale({
          tenantId,
          branchId,
          cashierId: userId,
          employeeId: data.employeeId || null,
          cashSessionId: data.cashSessionId || null,
          idempotencyKey: data.idempotencyKey || null,
          totalAmount,
          paymentMethod: data.paymentMethod,
          clienteDocumento: data.customerDoc || null,
          clienteTipoDocumento: data.customerDoc ? (data.customerDoc.length > 8 ? 'CUIT' : 'DNI') : 'CONSUMIDOR_FINAL',
          comprobanteTipo: data.comprobanteTipo || null,
          puntoVenta: 1,
          numeroComprobante: finalNumeroComprobante || null,
          ivaContenido: (totalAmount - (totalAmount / 1.21)),
          cae: finalCae || null,
          caeExpiration: finalCaeExpiration || null,
          qrCodeData: finalQrCodeData || null,
        }, data.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.quantity * item.unitPrice,
        })), tx);

        // 6. Descontar stock atómico y disparar alertas de reposición / cola de horneado
        for (const item of data.items) {
          const updatedProduct = await this.salesRepo.deductProductStock(
            tenantId,
            item.productId,
            item.quantity,
            tx
          );

          if (!updatedProduct) continue;

          if (updatedProduct.currentStock < updatedProduct.minDailyStock) {
            // Crear alerta de stock bajo
            await this.salesRepo.createLowStockAlert(
              tenantId,
              branchId,
              `Stock bajo para ${updatedProduct.name}: ${updatedProduct.currentStock.toFixed(2)} restante (mínimo: ${updatedProduct.minDailyStock.toFixed(2)}).`,
              tx
            );

            // Encolar en horneado si no hay tanda activa
            await this.salesRepo.enqueueBakeTaskIfNotPresent(
              tenantId,
              branchId,
              updatedProduct.id,
              updatedProduct.optimalBatchSize,
              tx
            );
          }
        }

        return {
          saleId: createdSale.id,
          sale: createdSale,
          isIdempotentReplay: false,
        };
      });

      return Object.assign(Result.ok(resultData), {
        success: true as const,
        saleId: resultData.saleId,
        sale: resultData.sale,
        isIdempotentReplay: false,
      }) as ProcessSaleResponse;
    } catch (err: any) {
      const infraErr = err instanceof DomainError
        ? err
        : new InfrastructureError(`Error en base de datos al procesar la venta: ${err?.message || String(err)}`, err);
      return Object.assign(Result.err(infraErr), {
        success: false as const,
        error: infraErr.message,
      }) as ProcessSaleResponse;
    }
  }
}
