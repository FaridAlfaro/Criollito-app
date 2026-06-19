'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from "@/store/useStore";
import {
  TrendingUp, AlertTriangle, ArrowLeft,
  MapPin, CheckCircle, Store, Users, DollarSign,
  PieChart as PieIcon, ChevronRight, Activity,
  Flame, Sparkles, Plus, RefreshCw, Package, ShoppingBag
} from 'lucide-react';
import { KPIGraph } from "@/components/KPIGraph";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { requestBakeTask, fetchBakeQueue } from '@/actions/bakeQueue';
import { fetchBranches } from '@/actions/branches';
import { getTenantMetrics } from '@/actions/metrics';
import { fetchProducts } from '@/actions/products';
import type { BranchRow } from '@/actions/branches';
import type { TenantMetrics } from '@/actions/metrics';

export default function SupervisorPage() {
  const { salesHistory } = useStore();

  // Estado de datos reales
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<BranchRow | null>(null);
  const [metrics, setMetrics] = useState<TenantMetrics | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [bakeQueue, setBakeQueue] = useState<any[]>([]);
  const [bakeQuantities, setBakeQuantities] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const triggerToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [branchList, metricsData, productList, queueData] = await Promise.all([
        fetchBranches(),
        getTenantMetrics(),
        fetchProducts(),
        fetchBakeQueue(),
      ]);
      setBranches(branchList);
      setMetrics(metricsData);
      setProducts(productList);
      setBakeQueue(queueData);
    } catch (err: any) {
      triggerToast(`Error cargando datos: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRequestBake = async (productId: string, qty: number, productName: string) => {
    try {
      await requestBakeTask(productId, qty);
      triggerToast(`Horneado solicitado: ${qty} de ${productName}`);
      // Refrescar cola
      const queue = await fetchBakeQueue();
      setBakeQueue(queue);
    } catch (err: any) {
      triggerToast(err.message || 'Error al solicitar horneado', 'error');
    }
  };

  // ==========================================
  // ESTADO VACÍO (sin datos)
  // ==========================================
  if (!isLoading && branches.length === 0 && !metrics) {
    return (
      <div className="p-6 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-100 text-center max-w-lg w-full space-y-4">
          <Store size={56} className="text-slate-300 mx-auto" />
          <h2 className="text-2xl font-bold text-slate-700">Panel Vacío</h2>
          <p className="text-slate-500 text-sm">
            No hay sucursales ni datos registrados aún. El panel mostrará ventas, stock y métricas reales una vez que el administrador configure las sucursales y registre productos.
          </p>
          <Button
            onClick={loadData}
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-12 px-6 font-bold flex items-center gap-2 mx-auto"
          >
            <RefreshCw size={16} />
            Actualizar
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 font-medium">Cargando métricas reales...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // KPIs GLOBALES
  // ==========================================
  const pendingBakeItems = bakeQueue.filter((t: any) => t.status === 'PENDING' || t.status === 'BAKING');
  const lowStockProducts = products.filter(p => p.currentStock < p.minDailyStock);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans text-slate-800 relative">

      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 font-bold px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border ${
              toastMsg.type === 'error' ? 'bg-red-500 text-white border-red-400' : 'bg-orange-500 text-white border-orange-400'
            }`}
          >
            <Sparkles size={18} />
            <span>{toastMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!selectedBranch ? (
          // ============================================================
          // VISTA PRINCIPAL: Selector de Sucursales Reales
          // ============================================================
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-extrabold font-heading text-slate-800 tracking-tight flex items-center gap-2">
                  Panel Corporativo
                  <span className="text-orange-500 text-sm font-semibold border border-orange-200 px-3 py-1 bg-orange-50 rounded-full">
                    Propietario / Dueño
                  </span>
                </h1>
                <p className="text-sm text-slate-500 mt-1">Supervisión en tiempo real de toda la cadena de sucursales.</p>
              </div>
              <button
                onClick={loadData}
                className="flex items-center gap-2 text-slate-500 hover:text-orange-500 text-sm font-semibold transition-colors bg-white border border-slate-200 px-4 py-2 rounded-xl"
              >
                <RefreshCw size={14} />
                Actualizar
              </button>
            </div>

            {/* KPIs Globales Reales */}
            {metrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Facturación Hoy', value: `$${metrics.totalSalesToday.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`, icon: DollarSign, color: 'bg-green-50 text-green-600' },
                  { label: 'Transacciones', value: metrics.totalSalesCount, icon: ShoppingBag, color: 'bg-blue-50 text-blue-600' },
                  { label: 'Alertas de Stock', value: metrics.lowStockProductsCount, icon: AlertTriangle, color: metrics.lowStockProductsCount > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500' },
                  { label: 'Sucursales Activas', value: metrics.totalBranches, icon: Store, color: 'bg-orange-50 text-orange-600' },
                ].map(kpi => (
                  <div key={kpi.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${kpi.color}`}>
                      <kpi.icon size={22} />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-slate-800">{kpi.value}</p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">{kpi.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ventas por Sucursal */}
            {metrics && metrics.byBranch.length > 0 && (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 text-lg mb-4">Ventas de Hoy por Sucursal</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {metrics.byBranch.map(b => (
                    <div key={b.branchId ?? 'unassigned'} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin size={14} className="text-orange-400 shrink-0" />
                        <p className="font-bold text-sm text-slate-800 truncate">{b.branchName}</p>
                      </div>
                      <p className="text-xl font-black text-orange-600">${b.totalSalesToday.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
                      <p className="text-xs text-slate-400">{b.totalSalesCount} transacciones</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grid de Sucursales para drill-down */}
            {branches.length > 0 ? (
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-slate-800 font-heading">Auditoría por Sucursal</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {branches.map(branch => {
                    const branchMetrics = metrics?.byBranch.find(b => b.branchId === branch.id);
                    const branchLowStock = products.filter(p => p.currentStock < p.minDailyStock && (!p.branchId || p.branchId === branch.id)).length;

                    return (
                      <motion.div
                        key={branch.id}
                        whileHover={{ y: -3, scale: 1.01 }}
                        onClick={() => setSelectedBranch(branch)}
                        className="cursor-pointer bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 border-l-4 border-l-orange-500 flex flex-col justify-between space-y-4 relative overflow-hidden"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-lg font-black text-slate-800 tracking-tight">{branch.name}</h3>
                              {branch.address && (
                                <div className="flex items-center gap-1 text-slate-400 text-xs mt-1">
                                  <MapPin size={12} />
                                  <span>{branch.address}</span>
                                </div>
                              )}
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${branchLowStock > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                              {branchLowStock > 0 ? `Stock Bajo (${branchLowStock})` : 'Estable'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Ventas Hoy</p>
                            <p className="text-base font-black text-slate-800">
                              {branchMetrics ? `$${branchMetrics.totalSalesToday.toLocaleString('es-AR', { maximumFractionDigits: 0 })}` : '$0'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Transacc.</p>
                            <p className="text-base font-black text-slate-800">{branchMetrics?.totalSalesCount ?? 0}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-end text-xs font-bold text-slate-500 hover:text-orange-500 gap-1 transition-colors">
                          <span>Ver métricas detalladas</span>
                          <ChevronRight size={14} />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-slate-200 space-y-3">
                <Store size={40} className="text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-600">No hay sucursales registradas</p>
                <p className="text-sm text-slate-400">El administrador debe crear sucursales desde el panel de Administración.</p>
              </div>
            )}

          </motion.div>
        ) : (
          // ============================================================
          // VISTA DRILL-DOWN: Métricas detalladas de la sucursal
          // ============================================================
          <motion.div
            key={`drilldown-${selectedBranch.id}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setSelectedBranch(null)}
                className="border-slate-200 text-slate-600 rounded-xl px-4 h-10 hover:bg-slate-50 flex items-center gap-1.5 font-bold"
              >
                <ArrowLeft size={16} />
                <span>Volver</span>
              </Button>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-800 font-heading tracking-tight flex items-center gap-2">
                  Auditoría: <span className="text-orange-500">{selectedBranch.name}</span>
                </h1>
                {selectedBranch.address && (
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <MapPin size={11} /> {selectedBranch.address}
                  </p>
                )}
              </div>
              <button
                onClick={loadData}
                className="ml-auto flex items-center gap-2 text-slate-400 hover:text-orange-500 text-sm transition-colors"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {/* KPIs de esta sucursal */}
            {(() => {
              const branchMetrics = metrics?.byBranch.find(b => b.branchId === selectedBranch.id);
              const branchBakeQueue = pendingBakeItems.filter((t: any) => !t.branchId || t.branchId === selectedBranch.id);
              const branchLowStock = products.filter(p =>
                p.currentStock < p.minDailyStock &&
                (!p.branchId || p.branchId === selectedBranch.id)
              );

              return (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Ventas Hoy', value: `$${(branchMetrics?.totalSalesToday ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`, icon: DollarSign, color: 'bg-green-50 text-green-600' },
                      { label: 'Transacciones', value: branchMetrics?.totalSalesCount ?? 0, icon: ShoppingBag, color: 'bg-blue-50 text-blue-600' },
                      { label: 'Stock Crítico', value: branchLowStock.length, icon: AlertTriangle, color: branchLowStock.length > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500' },
                      { label: 'Hornos Activos', value: branchBakeQueue.length, icon: Flame, color: 'bg-orange-50 text-orange-600' },
                    ].map(kpi => (
                      <div key={kpi.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${kpi.color}`}>
                          <kpi.icon size={22} />
                        </div>
                        <div>
                          <p className="text-2xl font-black text-slate-800">{kpi.value}</p>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">{kpi.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Producción y Stock */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Tabla de Productos / Control de Stock */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 lg:col-span-2 space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            <Flame className="text-orange-500" size={20} />
                            Producción y Stock en Tiempo Real
                          </h3>
                          <p className="text-xs text-slate-400">Ordene horneados directamente desde aquí.</p>
                        </div>
                      </div>

                      {products.length === 0 ? (
                        <div className="flex flex-col items-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <Package size={32} className="text-slate-300 mb-2" />
                          <p className="text-sm font-semibold text-slate-600">Sin productos registrados</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                <th className="pb-3 pl-2">Producto</th>
                                <th className="pb-3 text-right">Stock Actual</th>
                                <th className="pb-3 text-right">Mínimo</th>
                                <th className="pb-3 text-center">Estado</th>
                                <th className="pb-3 text-right pr-2">Solicitar Horneado</th>
                              </tr>
                            </thead>
                            <tbody className="text-xs divide-y divide-slate-100">
                              {products.map(p => {
                                const isLow = p.currentStock < p.minDailyStock;
                                const qtyValue = bakeQuantities[p.id] || '';
                                const defaultQty = p.optimalBatchSize;

                                return (
                                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-3 pl-2 font-bold text-slate-800">{p.name}</td>
                                    <td className={`py-3 text-right font-black ${isLow ? 'text-red-500' : 'text-slate-700'}`}>
                                      {p.currentStock.toFixed(p.type === 'WEIGHT' ? 2 : 0)} {p.type === 'WEIGHT' ? 'kg' : 'uds'}
                                    </td>
                                    <td className="py-3 text-right font-semibold text-slate-400">
                                      {p.minDailyStock.toFixed(p.type === 'WEIGHT' ? 2 : 0)} {p.type === 'WEIGHT' ? 'kg' : 'uds'}
                                    </td>
                                    <td className="py-3 text-center">
                                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isLow ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-green-100 text-green-700'}`}>
                                        {isLow ? 'Stock Bajo' : 'Suficiente'}
                                      </span>
                                    </td>
                                    <td className="py-3 text-right pr-2">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <input
                                          type="number"
                                          min="1"
                                          placeholder={String(defaultQty)}
                                          value={qtyValue}
                                          onChange={(e) => setBakeQuantities(prev => ({ ...prev, [p.id]: e.target.value }))}
                                          className="w-14 bg-slate-50 border border-slate-200 rounded-lg p-1 text-center font-bold text-slate-800 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                                        />
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            const qty = parseFloat(qtyValue) || defaultQty;
                                            handleRequestBake(p.id, qty, p.name);
                                            setBakeQuantities(prev => ({ ...prev, [p.id]: '' }));
                                          }}
                                          className="bg-orange-500 hover:bg-orange-600 text-white rounded-md text-[10px] px-2 h-6 flex items-center gap-0.5"
                                        >
                                          <Plus size={10} />
                                          <span>Hornear</span>
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Cola de Horneado Real */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2.5 bg-orange-50 text-orange-500 rounded-xl">
                          <Flame size={20} className="animate-pulse" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800">Horno Activo</h3>
                          <p className="text-xs text-slate-400">Órdenes de cocina en tiempo real</p>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {pendingBakeItems.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <CheckCircle size={28} className="text-green-500 mb-1" />
                            <p className="text-xs font-bold text-slate-700">Sin órdenes activas</p>
                            <p className="text-[10px] text-slate-400 mt-1">Todo el stock está al día</p>
                          </div>
                        ) : (
                          pendingBakeItems.map((t: any) => (
                            <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                              <div>
                                <p className="font-bold text-xs text-slate-800">{t.productName}</p>
                                <p className="text-[10px] text-slate-500">
                                  Cantidad: <span className="font-semibold text-slate-700">{parseFloat(t.quantityNeeded)}</span>
                                </p>
                              </div>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse ${
                                t.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-orange-700'
                              }`}>
                                {t.status === 'PENDING' ? 'En Cola' : 'Horneando'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="p-3 bg-orange-50/50 rounded-2xl border border-orange-100/50 text-[11px] text-orange-800 flex items-center gap-2">
                        <Activity size={14} className="text-orange-500 animate-pulse shrink-0" />
                        <span>Los panaderos ven estas órdenes en tiempo real en su panel.</span>
                      </div>
                    </div>

                  </div>

                  {/* Transacciones recientes de esta sucursal */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <TrendingUp size={20} className="text-orange-500" />
                        Transacciones Recientes
                      </h3>
                      <span className="text-xs text-slate-400">Últimas 5 ventas registradas</span>
                    </div>

                    {salesHistory.length === 0 ? (
                      <div className="flex flex-col items-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <ShoppingBag size={28} className="text-slate-300 mb-2" />
                        <p className="text-sm text-slate-500">No hay transacciones registradas en este dispositivo.</p>
                        <p className="text-xs text-slate-400 mt-1">Las ventas aparecen aquí durante la sesión activa del POS.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                              <th className="pb-3">Hora</th>
                              <th className="pb-3 text-center">Método</th>
                              <th className="pb-3 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {salesHistory.slice(0, 5).map((s: any) => (
                              <tr key={s.id} className="hover:bg-slate-50/50">
                                <td className="py-3 text-xs text-slate-400 font-mono">
                                  {new Date(s.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="py-3 text-center">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                                    {s.paymentMethod}
                                  </span>
                                </td>
                                <td className="py-3 text-right font-bold text-orange-600">
                                  ${s.totalAmount?.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
