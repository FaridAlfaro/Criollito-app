import { z } from 'zod';

export const AddEmployeeDtoSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Correo electrónico no válido'),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'BAKER', 'CASHIER']),
  branchId: z.string().optional().nullable(),
  baseSalary: z.number().nonnegative().optional().default(0),
  hourlyRate: z.number().nonnegative().optional().default(0),
  pin: z.string().min(4).max(8).optional().nullable(),
});

export const CreateUserEmployeeDtoSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Correo electrónico no válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['cajero', 'panadero', 'CASHIER', 'BAKER']),
  branchId: z.string().optional().nullable(),
  pin: z.string().min(4).max(8).optional().nullable(),
});

export const UpdateSalaryDtoSchema = z.object({
  employeeId: z.string().min(1, 'El ID de empleado es requerido'),
  baseSalary: z.number().nonnegative(),
  hourlyRate: z.number().nonnegative(),
});

export const AssignShiftDtoSchema = z.object({
  employeeId: z.string().min(1, 'El ID de empleado es requerido'),
  day: z.enum(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']),
  shiftType: z.enum(['morning', 'afternoon', 'night']),
  branchId: z.string().optional().nullable(),
});

export type AddEmployeeDto = z.infer<typeof AddEmployeeDtoSchema>;
export type CreateUserEmployeeDto = z.infer<typeof CreateUserEmployeeDtoSchema>;
export type UpdateSalaryDto = z.infer<typeof UpdateSalaryDtoSchema>;
export type AssignShiftDto = z.infer<typeof AssignShiftDtoSchema>;
