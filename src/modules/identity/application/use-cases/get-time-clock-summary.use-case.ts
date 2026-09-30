import { ITimeClockRepository } from '../../domain/repositories';
import { TimeClockSummaryFilterDto, TimeClockSummaryFilterDtoSchema } from '../dtos/time-clock-dtos';
import { TenantContext } from '@/modules/shared/domain/tenant-context';
import { TimeClockLog } from '../../domain/entities';

export interface EmployeeWorkSummary {
  employeeId: string;
  employeeName: string;
  totalHoursWorked: number;
  totalBreakHours: number;
  netHoursWorked: number;
  logs: TimeClockLog[];
}

export class GetTimeClockSummaryUseCase {
  constructor(private readonly timeClockRepo: ITimeClockRepository) {}

  async execute(filter: TimeClockSummaryFilterDto, context: TenantContext): Promise<EmployeeWorkSummary[]> {
    const parsed = TimeClockSummaryFilterDtoSchema.parse(filter);
    const effectiveTenantId = context.tenantId;
    const effectiveBranchId = parsed.branchId ?? context.branchId;

    const logs = await this.timeClockRepo.findLogsByPeriod(
      effectiveTenantId,
      effectiveBranchId,
      parsed.employeeId,
      parsed.from,
      parsed.to
    );

    // Agrupar logs por empleado
    const grouped = new Map<string, TimeClockLog[]>();
    for (const log of logs) {
      const list = grouped.get(log.employeeId) || [];
      list.push(log);
      grouped.set(log.employeeId, list);
    }

    const summaries: EmployeeWorkSummary[] = [];

    for (const [empId, empLogs] of grouped.entries()) {
      // Ordenar cronológicamente
      empLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      let totalGrossMs = 0;
      let totalBreakMs = 0;
      let clockInTime: Date | null = null;
      let breakStartTime: Date | null = null;
      const empName = empLogs[0]?.employeeName || 'Empleado';

      for (const log of empLogs) {
        if (log.eventType === 'CLOCK_IN') {
          clockInTime = log.timestamp;
        } else if (log.eventType === 'CLOCK_OUT' && clockInTime) {
          totalGrossMs += log.timestamp.getTime() - clockInTime.getTime();
          clockInTime = null;
        } else if (log.eventType === 'BREAK_START') {
          breakStartTime = log.timestamp;
        } else if (log.eventType === 'BREAK_END' && breakStartTime) {
          totalBreakMs += log.timestamp.getTime() - breakStartTime.getTime();
          breakStartTime = null;
        }
      }

      const totalHoursWorked = Math.max(0, totalGrossMs / (1000 * 60 * 60));
      const totalBreakHours = Math.max(0, totalBreakMs / (1000 * 60 * 60));
      const netHoursWorked = Math.max(0, totalHoursWorked - totalBreakHours);

      summaries.push({
        employeeId: empId,
        employeeName: empName,
        totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
        totalBreakHours: Math.round(totalBreakHours * 100) / 100,
        netHoursWorked: Math.round(netHoursWorked * 100) / 100,
        logs: empLogs,
      });
    }

    return summaries;
  }
}
