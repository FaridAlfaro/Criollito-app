'use client';

import { useState, useMemo } from 'react';
import { useStore, Product, Employee, Shift } from '@/store/useStore';
import {
  Users, TrendingUp, DollarSign, Calendar, Clock,
  Trash2, Plus, AlertTriangle, CheckCircle,
  Coins, UserCheck, Flame, Sparkles, Edit3, Save, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { KPIGraph } from '@/components/KPIGraph';

const EXPECTED_DAILY_SALES: Record<string, number> = {
  '11111111-1111-1111-1111-111111111111': 150, // Medialunas (uds)
  '22222222-2222-2222-2222-222222222222': 30,  // Pan Francés (kg)
  '33333333-3333-3333-3333-333333333333': 20,  // Pan Mignon (kg)
  '44444444-4444-4444-4444-444444444444': 100, // Facturas Surtidas (uds)
};

export default function AdminPage() {
  const {
    products,
    alerts,
    currentSession,
    salesHistory,
    movementsHistory,
    employees,
    shifts,
    updateEmployeeSalary,
    assignShift,
    removeShift,
    requestBakeTask,
    bakeQueue
  } = useStore();

  const [activeTab, setActiveTab] = useState<'operaciones' | 'turnos' | 'empleados'>('operaciones');

  // State for editing employee salary
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [editBaseSalary, setEditBaseSalary] = useState('');
  const [editHourlyRate, setEditHourlyRate] = useState('');

  // States for scheduler
  const [selectedDay, setSelectedDay] = useState<'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo'>('Lunes');
  const [selectedShiftType, setSelectedShiftType] = useState<'morning' | 'afternoon' | 'night'>('morning');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  // Toast for confirmation
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [bakeQuantities, setBakeQuantities] = useState<Record<string, string>>({});

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // 1. OPERATIONS DATA CALCULATIONS
  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.currentStock < p.minDailyStock);
  }, [products]);

  // Cash session totals calculated reactively from store
  const cashSessionStats = useMemo(() => {
    if (!currentSession) return null;

    const sessionStart = new Date(currentSession.openedAt);

    // Filter sales in current session
    const sessionSales = salesHistory.filter(s => {
      return s.cashSessionId === currentSession.id || new Date(s.createdAt) >= sessionStart;
    });

    // Filter movements in current session
    const sessionMovements = movementsHistory.filter(m => {
      return new Date(m.createdAt) >= sessionStart;
    });

    const initial = parseFloat(currentSession.initialAmount) || 0;

    let totalCashSales = 0;
    let totalDebitSales = 0;
    let totalCreditSales = 0;
    let totalQrSales = 0;

    sessionSales.forEach(s => {
      const amt = s.totalAmount || 0;
      if (s.paymentMethod === 'CASH') totalCashSales += amt;
      else if (s.paymentMethod === 'DEBIT') totalDebitSales += amt;
      else if (s.paymentMethod === 'CREDIT') totalCreditSales += amt;
      else if (s.paymentMethod === 'QR') totalQrSales += amt;
    });

    let totalIngresos = 0;
    let totalEgresos = 0;

    sessionMovements.forEach(m => {
      const amt = parseFloat(m.amount) || 0;
      if (m.type === 'INGRESO') totalIngresos += amt;
      else totalEgresos += amt;
    });

    const totalSalesSum = totalCashSales + totalDebitSales + totalCreditSales + totalQrSales;
    const theoreticalAmount = initial + totalCashSales + totalIngresos - totalEgresos;

    return {
      initial,
      totalCashSales,
      totalDebitSales,
      totalCreditSales,
      totalQrSales,
      totalSalesSum,
      totalIngresos,
      totalEgresos,
      theoreticalAmount
    };
  }, [currentSession, salesHistory, movementsHistory]);

  // Daily Shifts calculation
  const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;
  const shiftTypes = [
    { id: 'morning', label: 'Mañana (06:00 - 14:00)', hours: 8 },
    { id: 'afternoon', label: 'Tarde (14:00 - 22:00)', hours: 8 },
    { id: 'night', label: 'Noche (22:00 - 06:00)', hours: 8 }
  ] as const;

  // Active employees on shift today (Sunday as day index check)
  const todayName = useMemo(() => {
    const dayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday...
    const map: Record<number, typeof daysOfWeek[number]> = {
      0: 'Domingo',
      1: 'Lunes',
      2: 'Martes',
      3: 'Miércoles',
      4: 'Jueves',
      5: 'Viernes',
      6: 'Sábado'
    };
    return map[dayIndex] || 'Lunes';
  }, []);

  const todayShifts = useMemo(() => {
    return shifts.filter(s => s.day === todayName).map(s => {
      const emp = employees.find(e => e.id === s.employeeId);
      return {
        ...s,
        employeeName: emp ? emp.name : 'Desconocido',
        employeeRole: emp ? emp.role : 'cajero'
      };
    });
  }, [shifts, todayName, employees]);

  // Employee extra hours & total salary calculations
  const employeeSalaries = useMemo(() => {
    return employees.map(emp => {
      // Count total shifts assigned in the scheduler
      const empShifts = shifts.filter(s => s.employeeId === emp.id);
      const totalHours = empShifts.length * 8; // 8 hours per shift
      const calculatedHourlyPay = totalHours * emp.hourlyRate;
      const totalSalary = emp.baseSalary + calculatedHourlyPay;

      return {
        ...emp,
        assignedShiftsCount: empShifts.length,
        totalHours,
        calculatedHourlyPay,
        totalSalary
      };
    });
  }, [employees, shifts]);

  // Payment methods chart data
  const paymentMethodsChartData = useMemo(() => {
    if (cashSessionStats) {
      return [
        { name: 'Efectivo', value: cashSessionStats.totalCashSales },
        { name: 'Débito', value: cashSessionStats.totalDebitSales },
        { name: 'Crédito', value: cashSessionStats.totalCreditSales },
        { name: 'QR/MercadoPago', value: cashSessionStats.totalQrSales }
      ].filter(item => item.value > 0);
    }
    return [
      { name: 'Efectivo', value: 60000 },
      { name: 'Débito', value: 30000 },
      { name: 'Crédito', value: 15000 },
      { name: 'QR/MercadoPago', value: 25000 }
    ];
  }, [cashSessionStats]);

  const handleBakeRequest = (productId: string, name: string, qty: number) => {
    requestBakeTask(productId, qty);
    triggerToast(`Horneado solicitado: ${qty} uds de ${name}`);
  };

  const handleEditSalaryClick = (emp: Employee) => {
    setEditingEmpId(emp.id);
    setEditBaseSalary(emp.baseSalary.toString());
    setEditHourlyRate(emp.hourlyRate.toString());
  };

  const handleSaveSalary = (id: string) => {
    const base = parseFloat(editBaseSalary) || 0;
    const hourly = parseFloat(editHourlyRate) || 0;
    updateEmployeeSalary(id, base, hourly);
    setEditingEmpId(null);
    triggerToast('Salario actualizado con éxito');
  };

  const handleAddShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;

    assignShift(selectedEmployeeId, selectedDay, selectedShiftType);
    const emp = employees.find(e => e.id === selectedEmployeeId);
    triggerToast(`Turno asignado a ${emp?.name}`);
    setSelectedEmployeeId('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans text-slate-800">

      {/* Toast Alert */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-orange-500 text-white font-bold px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-orange-400"
          >
            <Sparkles size={18} />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-slate-800 tracking-tight flex items-center gap-2">
            Administración <span className="text-orange-500 text-sm font-semibold border border-orange-200 px-3 py-1 bg-orange-50 rounded-full">Sucursal Palermo</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Control diario de KPIs, turnos de empleados y sueldos de la sucursal.</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 border border-slate-200 w-fit">
          <button
            onClick={() => setActiveTab('operaciones')}
            className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'operaciones'
                ? 'bg-white text-orange-600 shadow-sm border border-slate-200/50'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <TrendingUp size={16} />
            <span>Control Diario</span>
          </button>
          <button
            onClick={() => setActiveTab('turnos')}
            className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'turnos'
                ? 'bg-white text-orange-600 shadow-sm border border-slate-200/50'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Calendar size={16} />
            <span>Horarios (Calendario)</span>
          </button>
          <button
            onClick={() => setActiveTab('empleados')}
            className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'empleados'
                ? 'bg-white text-orange-600 shadow-sm border border-slate-200/50'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Users size={16} />
            <span>Sueldos y Empleados</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'operaciones' && (
          <motion.div
            key="operaciones"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Top Operational Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Cash Controls Summary card */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
                      <Coins size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">Control de Caja</h3>
                      <p className="text-xs text-slate-400">Arqueo y sesión actual</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${currentSession ? 'bg-green-100 text-green-600 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
                    {currentSession ? 'Caja Abierta' : 'Caja Cerrada'}
                  </span>
                </div>

                {currentSession && cashSessionStats ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between p-2 bg-slate-50 rounded-xl">
                      <span className="text-slate-500">Fondo Inicial:</span>
                      <span className="font-bold text-slate-800">${cashSessionStats.initial.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded-xl">
                      <span className="text-slate-500">Ventas Registradas:</span>
                      <span className="font-bold text-orange-600">${cashSessionStats.totalSalesSum.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded-xl">
                      <span className="text-slate-500">Egresos:</span>
                      <span className="font-bold text-red-500">-${cashSessionStats.totalEgresos.toLocaleString()}</span>
                    </div>
                    <hr className="border-slate-100 my-0.5" />
                    <div className="flex justify-between p-2 bg-orange-50 rounded-xl border border-orange-100">
                      <span className="font-bold text-orange-850">Teórico en Caja:</span>
                      <span className="font-extrabold text-orange-600">${cashSessionStats.theoreticalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center bg-slate-50 rounded-2xl">
                    <AlertTriangle size={32} className="text-slate-400 mb-2" />
                    <p className="text-sm font-semibold text-slate-600">Sin Turno Activo</p>
                    <p className="text-xs text-slate-400">El cajero debe abrir turno en el POS</p>
                  </div>
                )}
              </div>

              {/* Shift Workers today card */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2.5 bg-blue-50 text-blue-500 rounded-xl">
                      <UserCheck size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">Turno de Hoy</h3>
                      <p className="text-xs text-slate-400">Personal asignado el {todayName}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full">
                    {todayShifts.length} Empleados
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {todayShifts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center bg-slate-50 rounded-2xl">
                      <Users size={32} className="text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-600">Sin Asignaciones</p>
                      <p className="text-xs text-slate-400">No se organizaron turnos para hoy</p>
                    </div>
                  ) : (
                    todayShifts.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100/30 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${s.employeeRole === 'panadero' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                            {s.employeeName[0]}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-slate-800 truncate max-w-[120px]">{s.employeeName}</p>
                            <p className="text-[10px] text-slate-500 capitalize">{s.employeeRole}</p>
                          </div>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${s.shiftType === 'morning' ? 'bg-amber-100 text-amber-700' :
                            s.shiftType === 'afternoon' ? 'bg-indigo-100 text-indigo-700' :
                              'bg-slate-800 text-slate-200'
                          }`}>
                          {s.shiftType === 'morning' ? 'Mañana' : s.shiftType === 'afternoon' ? 'Tarde' : 'Noche'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bake Queue Real-Time Card */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2.5 bg-orange-50 text-orange-500 rounded-xl">
                      <Flame size={20} className="animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800"> Horno Activo</h3>
                      <p className="text-xs text-slate-400">Cola de horneado en cocina</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${bakeQueue.length > 0 ? 'bg-orange-100 text-orange-700' : 'bg-slate-105 bg-slate-100 text-slate-500'}`}>
                    {bakeQueue.length} Ordenes
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {bakeQueue.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 rounded-2xl">
                      <CheckCircle size={24} className="text-green-500 mb-1" />
                      <p className="text-xs font-bold text-slate-700">Sin Solicitudes Activas</p>
                      <p className="text-[10px] text-slate-400">Los panaderos están al día</p>
                    </div>
                  ) : (
                    bakeQueue.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                          <p className="font-bold text-xs text-slate-850">{t.productName}</p>
                          <p className="text-[10px] text-slate-500">
                            Cantidad: <span className="font-semibold text-slate-800">{parseFloat(t.quantityNeeded.toString())}</span>
                          </p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse ${t.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-orange-700 border border-orange-200'
                          }`}>
                          {t.status === 'PENDING' ? 'En Cola' : 'Horneando'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Bottom Grid: Production Scheduler & Payments Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Bakery Production & Stock Controller */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 lg:col-span-2 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Producción y Stock de Panadería</h3>
                    <p className="text-xs text-slate-400">Monitoree existencias, compare con las ventas esperadas y ordene producción manual.</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="pb-3 pl-2">Producto</th>
                        <th className="pb-3 text-right">Stock Actual</th>
                        <th className="pb-3 text-right">Venta Diaria Esp.</th>
                        <th className="pb-3 text-center">Estado</th>
                        <th className="pb-3 text-center">Cantidad a Hornear</th>
                        <th className="pb-3 text-right pr-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs divide-y divide-slate-100">
                      {products.map(p => {
                        const expectedSales = EXPECTED_DAILY_SALES[p.id] || 40;
                        const isLow = p.currentStock < p.minDailyStock;
                        const qtyValue = bakeQuantities[p.id] || '';

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 pl-2 font-bold text-slate-800">{p.name}</td>
                            <td className={`py-3 text-right font-black ${isLow ? 'text-red-500' : 'text-slate-700'}`}>
                              {parseFloat(p.currentStock.toString())} {p.type === 'WEIGHT' ? 'kg' : 'uds'}
                            </td>
                            <td className="py-3 text-right font-semibold text-slate-400">
                              {expectedSales} {p.type === 'WEIGHT' ? 'kg' : 'uds'}
                            </td>
                            <td className="py-3 text-center">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isLow ? 'bg-red-55 bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                                }`}>
                                {isLow ? 'Stock Bajo' : 'Suficiente'}
                              </span>
                            </td>
                            <td className="py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  placeholder={p.optimalBatchSize.toString()}
                                  value={qtyValue}
                                  onChange={(e) => setBakeQuantities(prev => ({ ...prev, [p.id]: e.target.value }))}
                                  className="w-14 bg-slate-50 border border-slate-200 rounded-lg p-1 text-center font-bold text-slate-800 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                                />
                                <span className="text-[9px] text-slate-400 capitalize">{p.type === 'WEIGHT' ? 'kg' : 'uds'}</span>
                              </div>
                            </td>
                            <td className="py-3 text-right pr-2">
                              <div className="flex items-center justify-end gap-1">
                                {p.type === 'UNIT' ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleBakeRequest(p.id, p.name, 48)}
                                      className="text-[9px] h-6 px-1.5 border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-orange-600 rounded-md"
                                    >
                                      +1 Band. (48)
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleBakeRequest(p.id, p.name, 96)}
                                      className="text-[9px] h-6 px-1.5 border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-orange-600 rounded-md"
                                    >
                                      +2 Band. (96)
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleBakeRequest(p.id, p.name, 5)}
                                      className="text-[9px] h-6 px-1.5 border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-orange-600 rounded-md"
                                    >
                                      +5 kg
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleBakeRequest(p.id, p.name, 10)}
                                      className="text-[9px] h-6 px-1.5 border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-orange-600 rounded-md"
                                    >
                                      +10 kg
                                    </Button>
                                  </>
                                )}
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const customQty = parseFloat(qtyValue) || parseFloat(p.optimalBatchSize.toString());
                                    handleBakeRequest(p.id, p.name, customQty);
                                    setBakeQuantities(prev => ({ ...prev, [p.id]: '' }));
                                  }}
                                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-md text-[10px] px-2.5 h-6 shadow-sm flex items-center gap-0.5"
                                >
                                  <Plus size={10} />
                                  <span>Solicitar</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Methods Graph */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 lg:col-span-1 flex flex-col min-h-[300px]">
                <KPIGraph
                  data={paymentMethodsChartData}
                  type="donut"
                  title="Métodos de Pago Activos (%)"
                />
              </div>

            </div>

            {/* Bottom Row: Live Transactions */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-lg">Control de Caja: Transacciones Recientes</h3>
                <span className="text-xs text-slate-400">Actualizado en vivo</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3">Hora</th>
                      <th className="pb-3">Detalle</th>
                      <th className="pb-3 text-center">Tipo / Método</th>
                      <th className="pb-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {/* Combine sales and movements */}
                    {(() => {
                      const logs: any[] = [];
                      salesHistory.slice(0, 5).forEach(s => {
                        logs.push({
                          id: s.id,
                          time: new Date(s.createdAt),
                          desc: `Venta POS - ${s.comprobanteTipo || 'Recibo'}`,
                          method: s.paymentMethod,
                          type: 'INGRESO_VENTA',
                          amount: s.totalAmount
                        });
                      });
                      movementsHistory.slice(0, 5).forEach(m => {
                        logs.push({
                          id: m.id,
                          time: new Date(m.createdAt),
                          desc: m.description || 'Movimiento de Caja',
                          method: m.type,
                          type: m.type === 'INGRESO' ? 'INGRESO_EXTRA' : 'EGRESO',
                          amount: m.amount
                        });
                      });

                      // Sort logs chronologically descending
                      const sortedLogs = logs.sort((a, b) => b.time - a.time).slice(0, 6);

                      if (sortedLogs.length === 0) {
                        return (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-400">
                              No hay transacciones registradas hoy.
                            </td>
                          </tr>
                        );
                      }

                      return sortedLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 text-slate-500 font-mono text-xs">
                            {log.time.toLocaleTimeString()}
                          </td>
                          <td className="py-3.5 font-medium text-slate-800">
                            {log.desc}
                          </td>
                          <td className="py-3.5 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${log.type === 'INGRESO_VENTA' ? 'bg-green-50 text-green-700' :
                                log.type === 'INGRESO_EXTRA' ? 'bg-emerald-100 text-emerald-700' :
                                  'bg-red-50 text-red-700'
                              }`}>
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

        {/* Tab 2: Scheduler */}
        {activeTab === 'turnos' && (
          <motion.div
            key="turnos"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Split layout: Selector form and Weekly Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

              {/* Form to assign shifts */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-fit space-y-4">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Clock className="text-orange-500" size={20} />
                  <span>Asignar Turno</span>
                </h3>
                <form onSubmit={handleAddShift} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Día</label>
                    <select
                      value={selectedDay}
                      onChange={(e: any) => setSelectedDay(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    >
                      {daysOfWeek.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Horario</label>
                    <select
                      value={selectedShiftType}
                      onChange={(e: any) => setSelectedShiftType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    >
                      {shiftTypes.map(st => (
                        <option key={st.id} value={st.id}>{st.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Empleado</label>
                    <select
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      required
                    >
                      <option value="">Seleccionar empleado...</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.role.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    <span>Agregar al Cronograma</span>
                  </Button>
                </form>
              </div>

              {/* Weekly scheduler calendar grid */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 lg:col-span-3 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-lg">Organizador de Jornadas Semanales</h3>
                  <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg text-slate-500 font-medium">1 turno = 8 horas de trabajo</span>
                </div>

                <div className="overflow-x-auto border rounded-2xl border-slate-100">
                  <div className="min-w-[700px] grid grid-cols-8 divide-x divide-slate-100 bg-slate-50 font-heading text-xs font-bold text-slate-500 text-center">
                    <div className="py-3 text-left pl-4 font-bold text-slate-400">TURNO</div>
                    {daysOfWeek.map(d => (
                      <div key={d} className={`py-3 ${d === todayName ? 'bg-orange-500 text-white' : ''}`}>
                        {d.toUpperCase()}
                      </div>
                    ))}
                  </div>

                  <div className="min-w-[700px] divide-y divide-slate-100">
                    {shiftTypes.map(st => (
                      <div key={st.id} className="grid grid-cols-8 divide-x divide-slate-100">
                        {/* Label column */}
                        <div className="p-3 bg-slate-50/50 flex flex-col justify-center text-xs font-bold text-slate-700">
                          <span className="capitalize">{st.id === 'morning' ? 'Mañana' : st.id === 'afternoon' ? 'Tarde' : 'Noche'}</span>
                          <span className="text-[10px] text-slate-400 font-normal mt-0.5">{st.id === 'morning' ? '6h a 14h' : st.id === 'afternoon' ? '14h a 22h' : '22h a 6h'}</span>
                        </div>

                        {/* Days columns */}
                        {daysOfWeek.map(day => {
                          const cellShifts = shifts.filter(s => s.day === day && s.shiftType === st.id);
                          return (
                            <div key={day} className="p-2 min-h-[100px] flex flex-col gap-1.5 bg-white">
                              {cellShifts.length === 0 ? (
                                <div className="text-[10px] text-slate-300 italic flex items-center justify-center h-full border border-dashed border-slate-100 rounded-xl py-4">
                                  Sin Cobertura
                                </div>
                              ) : (
                                cellShifts.map(s => {
                                  const emp = employees.find(e => e.id === s.employeeId);
                                  return (
                                    <div key={s.id} className="group flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-slate-50 hover:bg-red-50 hover:border-red-100 transition-colors">
                                      <div className="overflow-hidden">
                                        <p className="text-[11px] font-bold text-slate-800 truncate">{emp ? emp.name : 'Cajero'}</p>
                                        <p className="text-[9px] text-slate-400 capitalize">{emp ? emp.role : 'Cajero'}</p>
                                      </div>
                                      <button
                                        onClick={() => {
                                          removeShift(s.id);
                                          triggerToast('Turno eliminado del calendario');
                                        }}
                                        className="text-slate-300 hover:text-red-500 p-0.5 rounded-md hover:bg-white transition-colors"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  );
                                })
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

        {/* Tab 3: Salaries */}
        {activeTab === 'empleados' && (
          <motion.div
            key="empleados"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Cuentas y Sueldos de Empleados</h3>
                <p className="text-xs text-slate-400 mt-0.5">Gestione el salario básico, valor de horas extra y liquide los totales semanales/mensuales.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pl-4">Empleado</th>
                    <th className="pb-3">Contacto</th>
                    <th className="pb-3 text-center">Rol</th>
                    <th className="pb-3 text-right">Sueldo Básico (Mes)</th>
                    <th className="pb-3 text-right">Valor Hora Extra</th>
                    <th className="pb-3 text-center">Horas en Horario</th>
                    <th className="pb-3 text-right">Total Devengado</th>
                    <th className="pb-3 text-right pr-4">Acciones</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {employeeSalaries.map(emp => {
                    const isEditing = editingEmpId === emp.id;
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 pl-4 font-bold text-slate-800">
                          {emp.name}
                        </td>
                        <td className="py-4 text-slate-500 font-mono text-xs">
                          {emp.email}
                        </td>
                        <td className="py-4 text-center">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${emp.role === 'panadero' ? 'bg-orange-100 text-orange-700' :
                              emp.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                                'bg-green-100 text-green-700'
                            }`}>
                            {emp.role}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editBaseSalary}
                              onChange={(e) => setEditBaseSalary(e.target.value)}
                              className="w-24 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-right font-bold text-slate-800 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                            />
                          ) : (
                            <span className="font-semibold">${emp.baseSalary.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="py-4 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editHourlyRate}
                              onChange={(e) => setEditHourlyRate(e.target.value)}
                              className="w-20 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-right font-bold text-slate-800 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                            />
                          ) : (
                            <span className="font-semibold">${emp.hourlyRate.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="py-4 text-center font-bold text-slate-600">
                          {emp.totalHours} hs <span className="text-[10px] text-slate-400 font-normal">({emp.assignedShiftsCount} turnos)</span>
                        </td>
                        <td className="py-4 text-right font-extrabold text-orange-600">
                          ${emp.totalSalary.toLocaleString()}
                        </td>
                        <td className="py-4 text-right pr-4">
                          {isEditing ? (
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                onClick={() => handleSaveSalary(emp.id)}
                                className="bg-green-500 hover:bg-green-600 text-white rounded-lg px-2.5 h-8 flex items-center gap-1 text-xs"
                              >
                                <Save size={12} />
                                <span>Guardar</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingEmpId(null)}
                                className="border-slate-200 text-slate-500 rounded-lg px-2 h-8 text-xs hover:bg-slate-50"
                              >
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditSalaryClick(emp)}
                              className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg h-8 flex items-center gap-1 text-xs font-semibold"
                            >
                              <Edit3 size={12} />
                              <span>Editar</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
