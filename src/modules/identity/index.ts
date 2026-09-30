import { DrizzleEmployeeRepository } from './infrastructure/drizzle-employee.repository';
import { DrizzleTimeClockRepository } from './infrastructure/drizzle-time-clock.repository';
import { DrizzleApiKeyRepository } from './infrastructure/drizzle-api-key.repository';
import { CryptoPinHasherAdapter } from './infrastructure/pin-hasher.adapter';

import { RecordTimeClockUseCase } from './application/use-cases/record-time-clock.use-case';
import { VerifyPinUseCase } from './application/use-cases/verify-pin.use-case';
import { ManageEmployeesUseCase } from './application/use-cases/manage-employees.use-case';
import { GetTimeClockSummaryUseCase } from './application/use-cases/get-time-clock-summary.use-case';
import { ValidateApiKeyUseCase } from './application/use-cases/validate-api-key.use-case';

// Adaptadores e infraestructura
export const pinHasher = new CryptoPinHasherAdapter();
export const employeeRepository = new DrizzleEmployeeRepository();
export const timeClockRepository = new DrizzleTimeClockRepository();
export const apiKeyRepository = new DrizzleApiKeyRepository();

// Casos de uso
export const recordTimeClockUseCase = new RecordTimeClockUseCase(employeeRepository, timeClockRepository, pinHasher);
export const verifyPinUseCase = new VerifyPinUseCase(employeeRepository, pinHasher);
export const manageEmployeesUseCase = new ManageEmployeesUseCase(employeeRepository, pinHasher);
export const getTimeClockSummaryUseCase = new GetTimeClockSummaryUseCase(timeClockRepository);
export const validateApiKeyUseCase = new ValidateApiKeyUseCase(apiKeyRepository);

export * from './domain/entities';
export * from './domain/repositories';
export * from './application/dtos/time-clock-dtos';
export * from './application/dtos/employee-dtos';
export * from './application/dtos/api-key-dtos';
export * from './application/use-cases/record-time-clock.use-case';
export * from './application/use-cases/verify-pin.use-case';
export * from './application/use-cases/manage-employees.use-case';
export * from './application/use-cases/get-time-clock-summary.use-case';
export * from './application/use-cases/validate-api-key.use-case';
