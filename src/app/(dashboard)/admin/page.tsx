'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import {
  Users, TrendingUp, DollarSign, Building2, Bell,
  Calendar, Clock, Trash2, Plus, AlertTriangle, CheckCircle,
  Coins, UserCheck, Flame, Sparkles, Edit3, Save, X,
  ShoppingBag, Package, RefreshCw, Send, Globe, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

// Server Actions - Zero Trust
import { fetchBranches, createBranch } from '@/actions/branches';
import { fetchEmployees, updateEmployeeSalary } from '@/actions/employees';
import { fetchShifts, assignShift, removeShift } from '@/actions/shifts';
import { getTenantMetrics } from '@/actions/metrics';
import { createAlert } from '@/actions/alerts';
import { fetchBakeQueue } from '@/actions/bakeQueue';

// Tipos
import type { BranchRow } from '@/actions/branches';
import type { EmployeeRow } from '@/actions/employees';
import type { ShiftRow } from '@/actions/shifts';
import type { TenantMetrics } from '@/actions/metrics';

// ==========================================
// TOAST HOOK
// ==========================================
function useToast() {
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const triggerToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };
  return { toastMsg, triggerToast };
}

// ==========================================
// TIPOS EXTENDIDOS
// ==========================================
type ShiftWithEmployee = ShiftRow & { employeeName: string; employeeRole: string };

const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;
const shiftTypes = [
  { id: 'morning' as const, label: 'Mañana (06:00 - 14:00)', hours: 8 },
  { id: 'afternoon' as const, label: 'Tarde (14:00 - 22:00)', hours: 8 },
  { id: 'night' as const, label: 'Noche (22:00 - 06:00)', hours: 8 },
];

// ==========================================
// ADMIN PAGE
// ==========================================
export default function AdminPage() {
  const { currentSession, salesHistory, movementsHistory } = useStore();

  const [activeTab, setActiveTab] = useState<'operaciones' | 'sucursales' | 'turnos' | 'empleados' | 'notificaciones'>('operaciones');
  const { toastMsg, triggerToast } = useToast();

  // Estado de datos reales
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [shifts, setShifts] = useState<ShiftWithEmployee[]>([]);
  const [metrics, setMetrics] = useState<TenantMetrics | null>(null);
  const [bakeQueueItems, setBakeQueueItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estado de formularios
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [editBaseSalary, setEditBaseSalary] = useState('');
  const [editHourlyRate, setEditHourlyRate] = useState('');
  const [selectedDay, setSelectedDay] = useState<typeof daysOfWeek[number]>('Lunes');
  const [selectedShiftType, setSelectedShiftType] = useState<'morning' | 'afternoon' | 'night'>('morning');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedBranchIdForShift, setSelectedBranchIdForShift] = useState('');

  // Estado para nueva sucursal
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);

  // Estado para notificaciones
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'LOW_STOCK' | 'SYSTEM'>('SYSTEM');
  const [alertTargetBranchId, setAlertTargetBranchId] = useState<string>(''); // '' = global
  const [isSendingAlert, setIsSendingAlert] = useState(false);

  // ==========================================
  // CARGA DE DATOS REALES
  // ==========================================
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [branchList, empList, shiftList, metricsData, queueData] = await Promise.all([
        fetchBranches(),
        fetchEmployees(),
        fetchShifts(),
        getTenantMetrics(),
        fetchBakeQueue(),
      ]);
      setBranches(branchList);
      setEmployees(empList);
      setShifts(shiftList as ShiftWithEmployee[]);
      setMetrics(metricsData);
      setBakeQueueItems(queueData);
    } catch (err) {
      console.error('[Admin] Error cargando datos:', err);
      triggerToast('Error al cargar datos del servidor', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ==========================================
  // MÉTRICAS DE CAJA (sesión actual)
  // ==========================================
  const cashSessionStats = useMemo(() => {
    if (!currentSession) return null;
    const sessionStart = new Date(currentSession.openedAt);
    const sessionSales = salesHistory.filter(s =>
      s.cashSessionId === currentSession.id || new Date(s.createdAt) >= sessionStart
    );
    const sessionMovements = movementsHistory.filter(m =>
      new Date(m.createdAt) >= sessionStart
    );
    const initial = parseFloat(currentSession.initialAmount) || 0;
    let totalCashSales = 0, totalDebitSales = 0, totalCreditSales = 0, totalQrSales = 0;
    sessionSales.forEach(s => {
      const amt = s.totalAmount || 0;
      if (s.paymentMethod === 'CASH') totalCashSales += amt;
      else if (s.paymentMethod === 'DEBIT') totalDebitSales += amt;
      else if (s.paymentMethod === 'CREDIT') totalCreditSales += amt;
      else if (s.paymentMethod === 'QR') totalQrSales += amt;
    });
    let totalIngresos = 0, totalEgresos = 0;
    sessionMovements.forEach(m => {
      const amt = parseFloat(m.amount) || 0;
      if (m.type === 'INGRESO') totalIngresos += amt;
      else totalEgresos += amt;
    });
    const totalSalesSum = totalCashSales + totalDebitSales + totalCreditSales + totalQrSales;
    const theoreticalAmount = initial + totalCashSales + totalIngresos - totalEgresos;
    return { initial, totalCashSales, totalDebitSales, totalCreditSales, totalQrSales, totalSalesSum, totalIngresos, totalEgresos, theoreticalAmount };
  }, [currentSession, salesHistory, movementsHistory]);

  const todayName = useMemo(() => {
    const map: Record<number, typeof daysOfWeek[number]> = { 0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' };
    return map[new Date().getDay()] || 'Lunes';
  }, []);

  const todayShifts = useMemo(() => shifts.filter(s => s.day === todayName), [shifts, todayName]);

  const employeeSalaries = useMemo(() => {
    return employees.map(emp => {
      const empShifts = shifts.filter(s => s.employeeId === emp.id);
      const totalHours = empShifts.length * 8;
      const baseSal = parseFloat(emp.baseSalary as string) || 0;
      const hourlyRt = parseFloat(emp.hourlyRate as string) || 0;
      const calculatedHourlyPay = totalHours * hourlyRt;
      const totalSalary = baseSal + calculatedHourlyPay;
      return { ...emp, assignedShiftsCount: empShifts.length, totalHours, calculatedHourlyPay, totalSalary };
    });
  }, [employees, shifts]);

  // ==========================================
  // HANDLERS
  // ==========================================
  const handleSaveSalary = async (empId: string) => {
    try {
      await updateEmployeeSalary(empId, parseFloat(editBaseSalary) || 0, parseFloat(editHourlyRate) || 0);
      setEditingEmpId(null);
      triggerToast('Salario actualizado con éxito');
      loadAllData();
    } catch (err: any) {
      triggerToast(err.message || 'Error al actualizar salario', 'error');
    }
  };

  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;
    try {
      await assignShift(selectedEmployeeId, selectedDay, selectedShiftType, selectedBranchIdForShift || null);
      const emp = employees.find(e => e.id === selectedEmployeeId);
      triggerToast(`Turno asignado a ${emp?.name}`);
      setSelectedEmployeeId('');
      loadAllData();
    } catch (err: any) {
      triggerToast(err.message || 'Error al asignar turno', 'error');
    }
  };

  const handleRemoveShift = async (shiftId: string) => {
    try {
      await removeShift(shiftId);
      triggerToast('Turno eliminado');
      loadAllData();
    } catch (err: any) {
      triggerToast(err.message || 'Error al eliminar turno', 'error');
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    setIsCreatingBranch(true);
    try {
      await createBranch(newBranchName.trim(), newBranchAddress.trim() || undefined);
      setNewBranchName('');
      setNewBranchAddress('');
      triggerToast(`Sucursal "${newBranchName}" creada con éxito`);
      loadAllData();
    } catch (err: any) {
      triggerToast(err.message || 'Error al crear sucursal', 'error');
    } finally {
      setIsCreatingBranch(false);
    }
  };

  const handleSendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertMessage.trim()) return;
    setIsSendingAlert(true);
    try {
      await createAlert(alertMessage.trim(), alertType, alertTargetBranchId || null);
      setAlertMessage('');
      setAlertTargetBranchId('');
      triggerToast('Notificación enviada con éxito ✓');
    } catch (err: any) {
      triggerToast(err.message || 'Error al enviar notificación', 'error');
    } finally {
      setIsSendingAlert(false);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans text-slate-800">

      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 font-bold px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border ${
              toastMsg.type === 'error'
                ? 'bg-red-500 text-white border-red-400'
                : 'bg-orange-500 text-white border-orange-400'
            }`}
          >
            <Sparkles size={18} />
            <span>{toastMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-slate-800 tracking-tight flex items-center gap-3">
            Administración
          </h1>
          <p className="text-sm text-slate-500 mt-1">Control operativo, sucursales, empleados y notificaciones.</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap bg-slate-100 p-1.5 rounded-2xl gap-1 border border-slate-200 w-fit">
          {([
            { id: 'operaciones', icon: TrendingUp, label: 'Control Diario' },
            { id: 'sucursales', icon: Building2, label: 'Sucursales' },
            { id: 'turnos', icon: Calendar, label: 'Horarios' },
            { id: 'empleados', icon: Users, label: 'Empleados' },
            { id: 'notificaciones', icon: Bell, label: 'Notificaciones' },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === tab.id ? 'bg-white text-orange-600 shadow-sm border border-slate-200/50' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <tab.icon size={14} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ==================== TAB: OPERACIONES ==================== */}
        {activeTab === 'operaciones' && (
          <motion.div key="operaciones" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

            {/* KPIs de métricas reales */}
            {metrics && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Ventas Hoy', value: `$${metrics.totalSalesToday.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`, icon: DollarSign, color: 'green' },
                  { label: 'Transacciones', value: metrics.totalSalesCount, icon: ShoppingBag, color: 'blue' },
                  { label: 'Stock Crítico', value: metrics.lowStockProductsCount, icon: Package, color: 'red' },
                  { label: 'Hornos Activos', value: metrics.activeBakeQueueCount, icon: Flame, color: 'orange' },
                  { label: 'Sucursales', value: metrics.totalBranches, icon: Building2, color: 'purple' },
                  { label: 'Cajas Abiertas', value: metrics.activeCashSessions, icon: Coins, color: 'teal' },
                ].map(kpi => (
                  <div key={kpi.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-1">
                    <kpi.icon size={18} className={`text-${kpi.color}-500`} />
                    <p className="text-2xl font-extrabold text-slate-800">{kpi.value}</p>
                    <p className="text-xs text-slate-400 font-medium">{kpi.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Ventas por Sucursal */}
            {metrics && metrics.byBranch.length > 0 && (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Building2 size={20} className="text-orange-500" />
                  Ventas de Hoy por Sucursal
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <th className="pb-3 pl-2">Sucursal</th>
                        <th className="pb-3 text-right">Transacciones</th>
                        <th className="pb-3 text-right">Total Vendido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {metrics.byBranch.map((b, idx) => (
                        <tr key={b.branchId ?? 'unassigned'} className="hover:bg-slate-50/50">
                          <td className="py-3 pl-2 font-semibold text-slate-800">{b.branchName}</td>
                          <td className="py-3 text-right text-slate-500">{b.totalSalesCount}</td>
                          <td className="py-3 text-right font-extrabold text-orange-600">
                            ${b.totalSalesToday.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Grid: Caja + Turno + Horno */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Control de Caja */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2.5 bg-green-50 text-green-600 rounded-xl"><Coins size={20} /></div>
                    <div>
                      <h3 className="font-bold text-slate-800">Control de Caja</h3>
                      <p className="text-xs text-slate-400">Sesión activa en este cliente</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${currentSession ? 'bg-green-100 text-green-600 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
                    {currentSession ? 'Caja Abierta' : 'Caja Cerrada'}
                  </span>
                </div>
                {currentSession && cashSessionStats ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between p-2 bg-slate-50 rounded-xl">
                      <span className="text-slate-500">Fondo Inicial:</span>
                      <span className="font-bold">${cashSessionStats.initial.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded-xl">
                      <span className="text-slate-500">Ventas:</span>
                      <span className="font-bold text-orange-600">${cashSessionStats.totalSalesSum.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-orange-50 rounded-xl border border-orange-100">
                      <span className="font-bold text-orange-850">Teórico en Caja:</span>
                      <span className="font-extrabold text-orange-600">${cashSessionStats.theoreticalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 rounded-2xl">
                    <AlertTriangle size={28} className="text-slate-400 mb-2" />
                    <p className="text-sm font-semibold text-slate-600">Sin Turno Activo</p>
                    <p className="text-xs text-slate-400">El cajero debe abrir turno en el POS</p>
                  </div>
                )}
              </div>

              {/* Turno de Hoy */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2.5 bg-blue-50 text-blue-500 rounded-xl"><UserCheck size={20} /></div>
                    <div>
                      <h3 className="font-bold text-slate-800">Turno de Hoy</h3>
                      <p className="text-xs text-slate-400">Personal asignado el {todayName}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full">{todayShifts.length} Empl.</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {todayShifts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 bg-slate-50 rounded-2xl">
                      <Users size={28} className="text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-600">Sin Asignaciones</p>
                      <p className="text-xs text-slate-400">No hay turnos para hoy</p>
                    </div>
                  ) : (
                    todayShifts.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${s.employeeRole === 'BAKER' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                            {s.employeeName[0]}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-slate-800 truncate max-w-[120px]">{s.employeeName}</p>
                            <p className="text-[10px] text-slate-500 uppercase">{s.employeeRole}</p>
                          </div>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${s.shiftType === 'morning' ? 'bg-amber-100 text-amber-700' : s.shiftType === 'afternoon' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-800 text-slate-200'}`}>
                          {s.shiftType === 'morning' ? 'Mañana' : s.shiftType === 'afternoon' ? 'Tarde' : 'Noche'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Horno Activo */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2.5 bg-orange-50 text-orange-500 rounded-xl"><Flame size={20} className="animate-pulse" /></div>
                    <div>
                      <h3 className="font-bold text-slate-800">Horno Activo</h3>
                      <p className="text-xs text-slate-400">Cola de horneado en cocina</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${bakeQueueItems.length > 0 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                    {bakeQueueItems.length} Órdenes
                  </span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {bakeQueueItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 bg-slate-50 rounded-2xl">
                      <CheckCircle size={24} className="text-green-500 mb-1" />
                      <p className="text-xs font-bold text-slate-700">Sin Solicitudes Activas</p>
                    </div>
                  ) : (
                    bakeQueueItems.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                          <p className="font-bold text-xs text-slate-800">{t.productName}</p>
                          <p className="text-[10px] text-slate-500">Cantidad: <span className="font-semibold">{parseFloat(t.quantityNeeded)}</span></p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse ${t.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-orange-700'}`}>
                          {t.status === 'PENDING' ? 'En Cola' : 'Horneando'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Transacciones recientes */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-lg">Transacciones Recientes</h3>
                <span className="text-xs text-slate-400">Sesión actual</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3">Hora</th>
                      <th className="pb-3">Detalle</th>
                      <th className="pb-3 text-center">Método</th>
                      <th className="pb-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {(() => {
                      const logs: any[] = [
                        ...salesHistory.slice(0, 5).map(s => ({
                          id: s.id, time: new Date(s.createdAt), desc: `Venta POS - ${s.comprobanteTipo || 'Recibo'}`,
                          method: s.paymentMethod, type: 'INGRESO_VENTA', amount: s.totalAmount
                        })),
                        ...movementsHistory.slice(0, 5).map(m => ({
                          id: m.id, time: new Date(m.createdAt), desc: m.description || 'Movimiento de Caja',
                          method: m.type, type: m.type === 'INGRESO' ? 'INGRESO_EXTRA' : 'EGRESO', amount: m.amount
                        }))
                      ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 6);
                      if (logs.length === 0) return (
                        <tr><td colSpan={4} className="py-8 text-center text-slate-400">No hay transacciones en la sesión actual.</td></tr>
                      );
                      return logs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                          <td className="py-3.5 text-slate-500 font-mono text-xs">{log.time.toLocaleTimeString()}</td>
                          <td className="py-3.5 font-medium text-slate-800">{log.desc}</td>
                          <td className="py-3.5 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${log.type === 'INGRESO_VENTA' ? 'bg-green-50 text-green-700' : log.type === 'INGRESO_EXTRA' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                              {log.method}
                            </span>
                          </td>
                          <td className={`py-3.5 text-right font-bold ${log.type.startsWith('INGRESO') ? 'text-green-600' : 'text-red-500'}`}>
                            {log.type.startsWith('INGRESO') ? '+' : '-'}${parseFloat(log.amount).toLocaleString()}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==================== TAB: SUCURSALES ==================== */}
        {activeTab === 'sucursales' && (
          <motion.div key="sucursales" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Formulario nueva sucursal */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-fit space-y-4">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Plus className="text-orange-500" size={20} />
                  <span>Nueva Sucursal</span>
                </h3>
                <form onSubmit={handleCreateBranch} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Nombre</label>
                    <input
                      type="text"
                      value={newBranchName}
                      onChange={e => setNewBranchName(e.target.value)}
                      placeholder="Ej: Sucursal Centro"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Dirección (opcional)</label>
                    <input
                      type="text"
                      value={newBranchAddress}
                      onChange={e => setNewBranchAddress(e.target.value)}
                      placeholder="Ej: Av. Corrientes 1234"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                  <Button type="submit" disabled={isCreatingBranch} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                    <Plus size={16} />
                    <span>{isCreatingBranch ? 'Creando...' : 'Crear Sucursal'}</span>
                  </Button>
                </form>
              </div>

              {/* Tabla de sucursales reales */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <Building2 size={20} className="text-orange-500" />
                    Sucursales Registradas
                  </h3>
                  <button onClick={loadAllData} className="text-slate-400 hover:text-orange-500 transition-colors">
                    <RefreshCw size={16} />
                  </button>
                </div>
                {isLoading ? (
                  <div className="py-12 text-center text-slate-400">Cargando sucursales...</div>
                ) : branches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Building2 size={40} className="text-slate-300 mb-3" />
                    <p className="text-base font-semibold text-slate-600">No hay sucursales registradas</p>
                    <p className="text-sm text-slate-400 mt-1">Crea tu primera sucursal con el formulario de la izquierda.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <th className="pb-3 pl-2">Nombre</th>
                          <th className="pb-3">Dirección</th>
                          <th className="pb-3 text-center">Estado</th>
                          <th className="pb-3 text-right">Creada</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {branches.map(branch => (
                          <tr key={branch.id} className="hover:bg-slate-50/50">
                            <td className="py-3.5 pl-2 font-bold text-slate-800 flex items-center gap-2">
                              <MapPin size={14} className="text-orange-400 shrink-0" />
                              {branch.name}
                            </td>
                            <td className="py-3.5 text-slate-500 text-sm">{branch.address || '—'}</td>
                            <td className="py-3.5 text-center">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${branch.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                {branch.isActive ? 'Activa' : 'Inactiva'}
                              </span>
                            </td>
                            <td className="py-3.5 text-right text-xs text-slate-400">
                              {new Date(branch.createdAt).toLocaleDateString('es-AR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ==================== TAB: HORARIOS ==================== */}
        {activeTab === 'turnos' && (
          <motion.div key="turnos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

              {/* Formulario asignar turno */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-fit space-y-4">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Clock className="text-orange-500" size={20} />
                  <span>Asignar Turno</span>
                </h3>
                <form onSubmit={handleAddShift} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Día</label>
                    <select value={selectedDay} onChange={(e: any) => setSelectedDay(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none">
                      {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Horario</label>
                    <select value={selectedShiftType} onChange={(e: any) => setSelectedShiftType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none">
                      {shiftTypes.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Empleado</label>
                    <select value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none" required>
                      <option value="">Seleccionar empleado...</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                      ))}
                    </select>
                  </div>
                  {branches.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Sucursal (opcional)</label>
                      <select value={selectedBranchIdForShift} onChange={e => setSelectedBranchIdForShift(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none">
                        <option value="">Sin sucursal específica</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  )}
                  <Button type="submit" className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                    <Plus size={16} />
                    <span>Agregar al Cronograma</span>
                  </Button>
                </form>
              </div>

              {/* Grilla semanal */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 lg:col-span-3 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-lg">Organizador de Jornadas Semanales</h3>
                  <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg text-slate-500 font-medium">1 turno = 8 horas de trabajo</span>
                </div>
                <div className="overflow-x-auto border rounded-2xl border-slate-100">
                  <div className="min-w-[700px] grid grid-cols-8 divide-x divide-slate-100 bg-slate-50 font-heading text-xs font-bold text-slate-500 text-center">
                    <div className="py-3 text-left pl-4 font-bold text-slate-400">TURNO</div>
                    {daysOfWeek.map(d => (
                      <div key={d} className={`py-3 ${d === todayName ? 'bg-orange-500 text-white' : ''}`}>{d.toUpperCase()}</div>
                    ))}
                  </div>
                  <div className="min-w-[700px] divide-y divide-slate-100">
                    {shiftTypes.map(st => (
                      <div key={st.id} className="grid grid-cols-8 divide-x divide-slate-100">
                        <div className="p-3 bg-slate-50/50 flex flex-col justify-center text-xs font-bold text-slate-700">
                          <span>{st.id === 'morning' ? 'Mañana' : st.id === 'afternoon' ? 'Tarde' : 'Noche'}</span>
                          <span className="text-[10px] text-slate-400 font-normal mt-0.5">{st.id === 'morning' ? '6h a 14h' : st.id === 'afternoon' ? '14h a 22h' : '22h a 6h'}</span>
                        </div>
                        {daysOfWeek.map(day => {
                          const cellShifts = shifts.filter(s => s.day === day && s.shiftType === st.id);
                          return (
                            <div key={day} className="p-2 min-h-[80px] flex flex-col gap-1.5 bg-white">
                              {cellShifts.length === 0 ? (
                                <div className="text-[10px] text-slate-300 italic flex items-center justify-center h-full border border-dashed border-slate-100 rounded-xl py-4">Sin Cobertura</div>
                              ) : (
                                cellShifts.map(s => (
                                  <div key={s.id} className="group flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-slate-50 hover:bg-red-50 hover:border-red-100 transition-colors">
                                    <div className="overflow-hidden">
                                      <p className="text-[11px] font-bold text-slate-800 truncate">{s.employeeName}</p>
                                      <p className="text-[9px] text-slate-400 uppercase">{s.employeeRole}</p>
                                    </div>
                                    <button onClick={() => handleRemoveShift(s.id)} className="text-slate-300 hover:text-red-500 p-0.5 rounded-md hover:bg-white transition-colors">
                                      <X size={12} />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==================== TAB: EMPLEADOS ==================== */}
        {activeTab === 'empleados' && (
          <motion.div key="empleados" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Cuentas y Sueldos de Empleados</h3>
                <p className="text-xs text-slate-400 mt-0.5">Gestione el salario básico, valor hora y liquide totales.</p>
              </div>
              <button onClick={loadAllData} className="text-slate-400 hover:text-orange-500 transition-colors flex items-center gap-1 text-xs font-semibold">
                <RefreshCw size={14} /> Actualizar
              </button>
            </div>
            {isLoading ? (
              <div className="py-12 text-center text-slate-400">Cargando empleados...</div>
            ) : employeeSalaries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Users size={40} className="text-slate-300 mb-3" />
                <p className="text-base font-semibold text-slate-600">No hay empleados registrados</p>
                <p className="text-sm text-slate-400 mt-1">Crea empleados desde el panel de usuarios.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pl-4">Empleado</th>
                      <th className="pb-3">Email</th>
                      <th className="pb-3 text-center">Rol</th>
                      <th className="pb-3 text-right">Sueldo Básico</th>
                      <th className="pb-3 text-right">Valor Hora</th>
                      <th className="pb-3 text-center">Horas Asig.</th>
                      <th className="pb-3 text-right">Total Devengado</th>
                      <th className="pb-3 text-right pr-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {employeeSalaries.map(emp => {
                      const isEditing = editingEmpId === emp.id;
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/50">
                          <td className="py-4 pl-4 font-bold text-slate-800">{emp.name}</td>
                          <td className="py-4 text-slate-500 font-mono text-xs">{emp.email}</td>
                          <td className="py-4 text-center">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${emp.role === 'BAKER' ? 'bg-orange-100 text-orange-700' : emp.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                              {emp.role}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            {isEditing ? (
                              <input type="number" value={editBaseSalary} onChange={e => setEditBaseSalary(e.target.value)}
                                className="w-24 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-right font-bold text-slate-800 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none" />
                            ) : (
                              <span className="font-semibold">${(parseFloat(emp.baseSalary as string) || 0).toLocaleString()}</span>
                            )}
                          </td>
                          <td className="py-4 text-right">
                            {isEditing ? (
                              <input type="number" value={editHourlyRate} onChange={e => setEditHourlyRate(e.target.value)}
                                className="w-20 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-right font-bold text-slate-800 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none" />
                            ) : (
                              <span className="font-semibold">${(parseFloat(emp.hourlyRate as string) || 0).toLocaleString()}</span>
                            )}
                          </td>
                          <td className="py-4 text-center font-bold text-slate-600">
                            {emp.totalHours} hs <span className="text-[10px] text-slate-400 font-normal">({emp.assignedShiftsCount} turnos)</span>
                          </td>
                          <td className="py-4 text-right font-extrabold text-orange-600">${emp.totalSalary.toLocaleString()}</td>
                          <td className="py-4 text-right pr-4">
                            {isEditing ? (
                              <div className="flex gap-2 justify-end">
                                <Button size="sm" onClick={() => handleSaveSalary(emp.id)} className="bg-green-500 hover:bg-green-600 text-white rounded-lg px-2.5 h-8 flex items-center gap-1 text-xs">
                                  <Save size={12} /><span>Guardar</span>
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingEmpId(null)} className="border-slate-200 text-slate-500 rounded-lg px-2 h-8 text-xs hover:bg-slate-50">Cancelar</Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => { setEditingEmpId(emp.id); setEditBaseSalary(String(parseFloat(emp.baseSalary as string) || 0)); setEditHourlyRate(String(parseFloat(emp.hourlyRate as string) || 0)); }} className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg h-8 flex items-center gap-1 text-xs font-semibold">
                                <Edit3 size={12} /><span>Editar</span>
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* ==================== TAB: NOTIFICACIONES ==================== */}
        {activeTab === 'notificaciones' && (
          <motion.div key="notificaciones" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Centro de Emisión */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
                <div>
                  <h3 className="font-bold text-slate-800 text-xl flex items-center gap-2">
                    <Bell size={20} className="text-orange-500" />
                    Centro de Notificaciones
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">Envía avisos a todas las sucursales o a una en específico.</p>
                </div>

                <form onSubmit={handleSendAlert} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mensaje</label>
                    <textarea
                      id="alert-message"
                      value={alertMessage}
                      onChange={e => setAlertMessage(e.target.value)}
                      placeholder="Ej: El horno principal estará fuera de servicio hasta las 14hs..."
                      rows={4}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</label>
                    <div className="flex gap-3">
                      {(['SYSTEM', 'LOW_STOCK'] as const).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setAlertType(t)}
                          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold border-2 transition-all ${alertType === t ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                        >
                          {t === 'SYSTEM' ? '📢 Sistema' : '📦 Stock Bajo'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Destino</label>
                    <div className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${alertTargetBranchId === '' ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}
                      onClick={() => setAlertTargetBranchId('')}>
                      <Globe size={18} className={alertTargetBranchId === '' ? 'text-orange-500' : 'text-slate-400'} />
                      <div>
                        <p className="font-bold text-sm text-slate-800">Todas las sucursales</p>
                        <p className="text-xs text-slate-400">La alerta llegará a todos</p>
                      </div>
                      <div className={`ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center ${alertTargetBranchId === '' ? 'border-orange-500 bg-orange-500' : 'border-slate-300'}`}>
                        {alertTargetBranchId === '' && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    </div>

                    {branches.map(branch => (
                      <div
                        key={branch.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${alertTargetBranchId === branch.id ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-slate-300'}`}
                        onClick={() => setAlertTargetBranchId(branch.id)}
                      >
                        <MapPin size={18} className={alertTargetBranchId === branch.id ? 'text-orange-500' : 'text-slate-400'} />
                        <div>
                          <p className="font-bold text-sm text-slate-800">{branch.name}</p>
                          <p className="text-xs text-slate-400">{branch.address || 'Sin dirección'}</p>
                        </div>
                        <div className={`ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center ${alertTargetBranchId === branch.id ? 'border-orange-500 bg-orange-500' : 'border-slate-300'}`}>
                          {alertTargetBranchId === branch.id && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                      </div>
                    ))}

                    {branches.length === 0 && (
                      <p className="text-xs text-slate-400 italic px-1">No hay sucursales registradas. La alerta se enviará de forma global.</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isSendingAlert || !alertMessage.trim()}
                    className="w-full h-12 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <Send size={16} />
                    <span>{isSendingAlert ? 'Enviando...' : 'Enviar Notificación'}</span>
                  </Button>
                </form>
              </div>

              {/* Info de visibilidad */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                <h3 className="font-bold text-slate-800 text-lg">Reglas de Visibilidad</h3>
                <div className="space-y-3">
                  {[
                    { icon: Globe, color: 'bg-blue-100 text-blue-600', title: 'Alerta Global (sin sucursal)', desc: 'Todos los usuarios del tenant la verán, independientemente de su sucursal asignada.' },
                    { icon: MapPin, color: 'bg-orange-100 text-orange-600', title: 'Alerta de Sucursal Específica', desc: 'Solo la verán los CASHIER y BAKER asignados a esa sucursal. Los ADMIN y SUPERVISOR ven todas.' },
                    { icon: Users, color: 'bg-green-100 text-green-600', title: 'Roles ADMIN / SUPERVISOR', desc: 'Ven TODAS las alertas del tenant, globales y de cada sucursal.' },
                  ].map(item => (
                    <div key={item.title} className="flex gap-4 p-4 bg-slate-50 rounded-2xl">
                      <div className={`p-2.5 ${item.color} rounded-xl shrink-0`}>
                        <item.icon size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
