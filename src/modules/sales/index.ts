import { DrizzleSalesRepository } from './infrastructure/drizzle-sales.repository';
import { DrizzleCashSessionRepository } from './infrastructure/drizzle-cash-session.repository';
import { ArcaFiscalInvoiceAdapter } from './infrastructure/arca-fiscal-invoice.adapter';
import { ProcessSaleUseCase } from './application/use-cases/process-sale.use-case';
import { OpenCashSessionUseCase } from './application/use-cases/open-cash-session.use-case';
import { CloseCashSessionUseCase } from './application/use-cases/close-cash-session.use-case';
import { RegisterCashMovementUseCase } from './application/use-cases/register-cash-movement.use-case';
import { GetBranchWorkersUseCase } from './application/use-cases/get-branch-workers.use-case';
import { GetSessionHistoryUseCase } from './application/use-cases/get-session-history.use-case';

// Instancias singleton de repositorios y adaptadores
export const salesRepository = new DrizzleSalesRepository();
export const cashSessionRepository = new DrizzleCashSessionRepository();
export const fiscalInvoiceService = new ArcaFiscalInvoiceAdapter();

// Instancias de casos de uso listas para inyección
export const processSaleUseCase = new ProcessSaleUseCase(salesRepository, fiscalInvoiceService);
export const openCashSessionUseCase = new OpenCashSessionUseCase(cashSessionRepository);
export const closeCashSessionUseCase = new CloseCashSessionUseCase(cashSessionRepository, salesRepository);
export const registerCashMovementUseCase = new RegisterCashMovementUseCase(cashSessionRepository);
export const getBranchWorkersUseCase = new GetBranchWorkersUseCase(cashSessionRepository);
export const getSessionHistoryUseCase = new GetSessionHistoryUseCase(cashSessionRepository, salesRepository);

export * from './domain/entities';
export * from './domain/repositories';
export * from './domain/fiscal-service';
export * from './application/dtos/sale-dtos';
export * from './application/dtos/cash-session-dtos';
export * from './application/use-cases/process-sale.use-case';
export * from './application/use-cases/open-cash-session.use-case';
export * from './application/use-cases/close-cash-session.use-case';
export * from './application/use-cases/register-cash-movement.use-case';
export * from './application/use-cases/get-branch-workers.use-case';
export * from './application/use-cases/get-session-history.use-case';
