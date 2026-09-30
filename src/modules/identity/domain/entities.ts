export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISOR' | 'BAKER' | 'CASHIER';
export type ClockEventType = 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END';
export type DayOfWeek = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
export type ShiftType = 'morning' | 'afternoon' | 'night';

export interface Employee {
  id: string;
  tenantId: string;
  branchId: string | null;
  userId: string | null;
  name: string;
  email: string;
  pinHash: string | null;
  role: Role;
  baseSalary: number;
  hourlyRate: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Shift {
  id: string;
  tenantId: string;
  branchId: string | null;
  employeeId: string;
  employeeName?: string;
  employeeRole?: Role;
  day: DayOfWeek;
  shiftType: ShiftType;
  createdAt: Date;
}

export interface TimeClockLog {
  id: string;
  tenantId: string;
  branchId: string;
  employeeId: string;
  employeeName?: string;
  eventType: ClockEventType;
  timestamp: Date;
  deviceInfo: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface ApiKey {
  id: string;
  tenantId: string;
  branchId: string | null;
  name: string;
  keyHash: string;
  keyPrefix: string;
  role: Role;
  isActive: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
}
