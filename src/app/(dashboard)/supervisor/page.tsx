'use client';

import { useState, useMemo } from 'react';
import { useStore } from "@/store/useStore";
import { 
  Package, TrendingUp, AlertTriangle, ArrowLeft, 
  MapPin, CheckCircle, Store, Users, DollarSign, 
  PieChart as PieIcon, ChevronRight, Activity, Percent,
  Flame, Sparkles, Plus
} from 'lucide-react';
import { KPIGraph } from "@/components/KPIGraph";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface BranchData {
  id: string;
  name: string;
  address: string;
  city: string;
  manager: string;
  color: string;
  borderColor: string;
  bgGradient: string;
  baselineSales: number;
  baselineMonthlySales: number;
  simulatedLeftovers: number;
}

const EXPECTED_DAILY_SALES: Record<string, number> = {
  '11111111-1111-1111-1111-111111111111': 150, // Medialunas (uds)
  '22222222-2222-2222-2222-222222222222': 30,  // Pan Francés (kg)
  '33333333-3333-3333-3333-333333333333': 20,  // Pan Mignon (kg)
  '44444444-4444-4444-4444-444444444444': 100, // Facturas Surtidas (uds)
};

const BRANCHES: BranchData[] = [
  {
    id: 'palermo',
    name: 'Criollito Palermo (Principal)',
    address: 'Av. Santa Fe 3400',
    city: 'CABA',
    manager: 'Carlos Supervisor',
    color: 'text-orange-500',
    borderColor: 'border-l-orange-500',
    bgGradient: 'from-orange-500/5 to-orange-600/0 hover:from-orange-500/10',
    baselineSales: 112000,
    baselineMonthlySales: 1840000,
    simulatedLeftovers: 12
  },
  {
    id: 'recoleta',
    name: 'Criollito Recoleta',
    address: 'Junín 1200',
    city: 'CABA',
    manager: 'Mariana Administradora',
    color: 'text-blue-500',
    borderColor: 'border-l-blue-500',
    bgGradient: 'from-blue-500/5 to-blue-600/0 hover:from-blue-500/10',
    baselineSales: 94000,
    baselineMonthlySales: 1420000,
    simulatedLeftovers: 14
  },
  {
    id: 'belgrano',
    name: 'Criollito Belgrano',
    address: 'Av. Cabildo 2200',
    city: 'CABA',
    manager: 'Esteban Administrador',
    color: 'text-green-500',
    borderColor: 'border-l-green-500',
    bgGradient: 'from-green-500/5 to-green-600/0 hover:from-green-500/10',
    baselineSales: 125000,
    baselineMonthlySales: 2100000,
    simulatedLeftovers: 8
  }
];

export default function SupervisorPage() {
  const { products, salesHistory, requestBakeTask, bakeQueue, alerts } = useStore();
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [bakeQuantities, setBakeQuantities] = useState<Record<string, string>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // 1. DYNAMIC CALCULATIONS FOR PALERMO (REAL-TIME POS)
  const palermoRealTimeStats = useMemo(() => {
    // Total sales in history
    const totalSalesSum = salesHistory.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    
    // Low stock count
    const lowStockCount = products.filter(p => p.currentStock < p.minDailyStock).length;

    // Waste / Leftovers details
    // We compute: Prepared = currentStock + sold. Leftover = currentStock.
    const leftoversSummary = products.map(p => {
      // Find quantity sold today in salesHistory
      let qtySold = 0;
      salesHistory.forEach(s => {
        s.items?.forEach((item: any) => {
          if (item.productId === p.id || item.name === p.name) {
            qtySold += item.quantity;
          }
        });
      });

      const stock = parseFloat(p.currentStock.toString());
      const minStock = parseFloat(p.minDailyStock.toString());
      const prepared = stock + qtySold;
      const wastePercent = prepared > 0 ? Math.round((stock / prepared) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        prepared,
        sold: qtySold,
        leftovers: stock,
        wastePercent,
        isLow: stock < minStock
      };
    });

    const totalPrepared = leftoversSummary.reduce((sum, item) => sum + item.prepared, 0);
    const totalLeftovers = leftoversSummary.reduce((sum, item) => sum + item.leftovers, 0);
    const palermoAverageLeftovers = totalPrepared > 0 ? Math.round((totalLeftovers / totalPrepared) * 100) : 12;

    // Top products from salesHistory
    const productSalesCount: Record<string, number> = {};
    salesHistory.forEach(s => {
      s.items?.forEach((item: any) => {
        productSalesCount[item.name] = (productSalesCount[item.name] || 0) + item.quantity;
      });
    });

    let topProducts = Object.entries(productSalesCount).map(([name, value]) => ({ name, value }));
    if (topProducts.length === 0) {
      topProducts = [
        { name: 'Medialunas', value: 48 },
        { name: 'Pan Francés', value: 15 },
        { name: 'Criollitos', value: 30 },
        { name: 'Facturas Surtidas', value: 20 }
      ];
    }

    return {
      dailySales: BRANCHES[0].baselineSales + totalSalesSum,
      monthlySales: BRANCHES[0].baselineMonthlySales + totalSalesSum,
      leftoversRate: palermoAverageLeftovers,
      lowStockCount,
      leftoversSummary,
      topProducts
    };
  }, [products, salesHistory]);

  // 2. CHAIN GLOBAL STATS (Palermo real + Recoleta + Belgrano)
  const chainStats = useMemo(() => {
    const palermoSales = palermoRealTimeStats.dailySales;
    const recoletaSales = BRANCHES[1].baselineSales;
    const belgranoSales = BRANCHES[2].baselineSales;
    const totalDailyChainSales = palermoSales + recoletaSales + belgranoSales;

    const palermoMonthly = palermoRealTimeStats.monthlySales;
    const recoletaMonthly = BRANCHES[1].baselineMonthlySales;
    const belgranoMonthly = BRANCHES[2].baselineMonthlySales;
    const totalMonthlyChainSales = palermoMonthly + recoletaMonthly + belgranoMonthly;

    const totalLowStockAlerts = palermoRealTimeStats.lowStockCount + 1; // Palermo + 1 mock for Recoleta
    
    return {
      totalDailyChainSales,
      totalMonthlyChainSales,
      totalLowStockAlerts,
      activeBranches: BRANCHES.length
    };
  }, [palermoRealTimeStats]);

  // Selected Branch Drilldown Stats
  const activeBranchData = useMemo(() => {
    if (!selectedBranchId) return null;
    const branch = BRANCHES.find(b => b.id === selectedBranchId);
    if (!branch) return null;

    // If it's Palermo, inject real-time state. Otherwise, return mock stats.
    if (branch.id === 'palermo') {
      return {
        ...branch,
        dailySales: palermoRealTimeStats.dailySales,
        monthlySales: palermoRealTimeStats.monthlySales,
        leftoversRate: palermoRealTimeStats.leftoversRate,
        lowStockCount: palermoRealTimeStats.lowStockCount,
        leftoversSummary: palermoRealTimeStats.leftoversSummary,
        topProducts: palermoRealTimeStats.topProducts,
        salesWeekly: [
          { name: 'Lun', value: 105000 },
          { name: 'Mar', value: 98000 },
          { name: 'Mié', value: 122000 },
          { name: 'Jue', value: 114000 },
          { name: 'Vie', value: 135000 },
          { name: 'Sáb', value: 155000 },
          { name: 'Dom', value: palermoRealTimeStats.dailySales },
        ]
      };
    } else if (branch.id === 'recoleta') {
      return {
        ...branch,
        dailySales: branch.baselineSales,
        monthlySales: branch.baselineMonthlySales,
        leftoversRate: branch.simulatedLeftovers,
        lowStockCount: 1, // mock stock alert
        leftoversSummary: [
          { name: 'Medialunas', prepared: 180, sold: 160, leftovers: 20, wastePercent: 11, isLow: false },
          { name: 'Pan Francés', prepared: 40, sold: 32, leftovers: 8, wastePercent: 20, isLow: true },
          { name: 'Pan Mignon', prepared: 25, sold: 21, leftovers: 4, wastePercent: 16, isLow: false },
          { name: 'Facturas Surtidas', prepared: 120, sold: 105, leftovers: 15, wastePercent: 13, isLow: false }
        ],
        topProducts: [
          { name: 'Medialunas', value: 160 },
          { name: 'Facturas Surtidas', value: 105 },
          { name: 'Pan Francés', value: 32 },
          { name: 'Pan Mignon', value: 21 }
        ],
        salesWeekly: [
          { name: 'Lun', value: 85000 },
          { name: 'Mar', value: 92000 },
          { name: 'Mié', value: 88000 },
          { name: 'Jue', value: 91000 },
          { name: 'Vie', value: 99000 },
          { name: 'Sáb', value: 110000 },
          { name: 'Dom', value: branch.baselineSales },
        ]
      };
    } else { // belgrano
      return {
        ...branch,
        dailySales: branch.baselineSales,
        monthlySales: branch.baselineMonthlySales,
        leftoversRate: branch.simulatedLeftovers,
        lowStockCount: 0,
        leftoversSummary: [
          { name: 'Medialunas', prepared: 220, sold: 205, leftovers: 15, wastePercent: 7, isLow: false },
          { name: 'Pan Francés', prepared: 55, sold: 50, leftovers: 5, wastePercent: 9, isLow: false },
          { name: 'Pan Mignon', prepared: 30, sold: 28, leftovers: 2, wastePercent: 7, isLow: false },
          { name: 'Facturas Surtidas', prepared: 150, sold: 138, leftovers: 12, wastePercent: 8, isLow: false }
        ],
        topProducts: [
          { name: 'Medialunas', value: 205 },
          { name: 'Facturas Surtidas', value: 138 },
          { name: 'Pan Francés', value: 50 },
          { name: 'Pan Mignon', value: 28 }
        ],
        salesWeekly: [
          { name: 'Lun', value: 110000 },
          { name: 'Mar', value: 118000 },
          { name: 'Mié', value: 121000 },
          { name: 'Jue', value: 115000 },
          { name: 'Vie', value: 130000 },
          { name: 'Sáb', value: 142000 },
          { name: 'Dom', value: branch.baselineSales },
        ]
      };
    }
  }, [selectedBranchId, palermoRealTimeStats, products]);

  return (
    <div className="p-1 max-w-7xl mx-auto space-y-6 font-sans text-slate-800 relative">
      
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
      
      <AnimatePresence mode="wait">
        {!selectedBranchId ? (
          // Vista principal: Selector de sucursales
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Header corporativo */}
            <div>
              <h1 className="text-3xl font-extrabold font-heading text-slate-800 tracking-tight flex items-center gap-2">
                Panel Corporativo <span className="text-orange-500 text-sm font-semibold border border-orange-200 px-3 py-1 bg-orange-50 rounded-full">Propietario / Dueño</span>
              </h1>
              <p className="text-sm text-slate-500 mt-1">Supervisión en tiempo real de toda la cadena de sucursales El Criollito.</p>
            </div>

            {/* Chain metrics ribbon */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="bg-orange-50 p-4 rounded-2xl text-orange-500">
                  <DollarSign size={24} />
                </div>
                <div>
                  <h3 className="text-xs text-slate-400 font-bold uppercase">Facturación Cadena (Hoy)</h3>
                  <p className="text-2xl font-black text-slate-800 mt-0.5">${chainStats.totalDailyChainSales.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="bg-blue-50 p-4 rounded-2xl text-blue-500">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h3 className="text-xs text-slate-400 font-bold uppercase">Facturación Mensual</h3>
                  <p className="text-2xl font-black text-slate-800 mt-0.5">${chainStats.totalMonthlyChainSales.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="bg-red-50 p-4 rounded-2xl text-red-500">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-xs text-slate-400 font-bold uppercase">Alertas de Stock Totales</h3>
                  <p className="text-2xl font-black text-slate-800 mt-0.5">{chainStats.totalLowStockAlerts}</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="bg-green-50 p-4 rounded-2xl text-green-500">
                  <Store size={24} />
                </div>
                <div>
                  <h3 className="text-xs text-slate-400 font-bold uppercase">Sucursales Activas</h3>
                  <p className="text-2xl font-black text-slate-800 mt-0.5">{chainStats.activeBranches} Locales</p>
                </div>
              </div>

            </div>

            {/* Grid de Sucursales */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800 font-heading">Seleccionar Sucursal para Auditoría</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {BRANCHES.map(branch => {
                  const isPalermo = branch.id === 'palermo';
                  const sales = isPalermo ? palermoRealTimeStats.dailySales : branch.baselineSales;
                  const alertsCount = isPalermo ? palermoRealTimeStats.lowStockCount : 1;
                  const leftovers = isPalermo ? palermoRealTimeStats.leftoversRate : branch.simulatedLeftovers;

                  return (
                    <motion.div
                      key={branch.id}
                      whileHover={{ y: -3, scale: 1.01 }}
                      onClick={() => setSelectedBranchId(branch.id)}
                      className={`cursor-pointer bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 border-l-4 ${branch.borderColor} flex flex-col justify-between space-y-6 relative overflow-hidden`}
                    >
                      {/* Decorative gradient inside */}
                      <div className={`absolute inset-0 bg-gradient-to-r ${branch.bgGradient} opacity-50 pointer-events-none transition-opacity`} />

                      <div className="relative z-10 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">{branch.name}</h3>
                            <div className="flex items-center gap-1 text-slate-400 text-xs mt-1">
                              <MapPin size={12} />
                              <span>{branch.address}, {branch.city}</span>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${alertsCount > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                            {alertsCount > 0 ? `Stock Bajo (${alertsCount})` : 'Estable'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
                          <span>Administrador:</span>
                          <span className="font-bold text-slate-700">{branch.manager}</span>
                        </div>
                      </div>

                      <div className="relative z-10 grid grid-cols-2 gap-4 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Ventas Hoy</p>
                          <p className="text-base font-black text-slate-800">${sales.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Sobrantes %</p>
                          <p className="text-base font-black text-slate-800">{leftovers}%</p>
                        </div>
                      </div>

                      <div className="relative z-10 flex items-center justify-end text-xs font-bold text-slate-500 hover:text-orange-500 gap-1 pt-1 transition-colors">
                        <span>Ingresar a métricas</span>
                        <ChevronRight size={14} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : (
          // Vista Drill-down: Métricas detalladas del local seleccionado
          <motion.div
            key="drilldown"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Volver a sucursales */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setSelectedBranchId(null)}
                className="border-slate-200 text-slate-600 rounded-xl px-4 h-10 hover:bg-slate-50 flex items-center gap-1.5 font-bold"
              >
                <ArrowLeft size={16} />
                <span>Volver a Locales</span>
              </Button>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-800 font-heading tracking-tight flex items-center gap-2">
                  Auditoría: <span className="text-orange-500">{activeBranchData?.name}</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">Reportes financieros y control de sobrantes al cierre del local.</p>
              </div>
            </div>

            {/* Top metrics ribbon */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="bg-orange-50 p-4.5 rounded-2xl text-orange-500">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h3 className="text-xs text-slate-400 font-bold uppercase">Ventas Hoy</h3>
                  <p className="text-xl font-black text-slate-800 mt-0.5">${activeBranchData?.dailySales.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="bg-blue-50 p-4.5 rounded-2xl text-blue-500">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 className="text-xs text-slate-400 font-bold uppercase">Mensual Proyectado</h3>
                  <p className="text-xl font-black text-slate-800 mt-0.5">${activeBranchData?.monthlySales.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="bg-red-50 p-4.5 rounded-2xl text-red-500">
                  <Percent size={20} />
                </div>
                <div>
                  <h3 className="text-xs text-slate-400 font-bold uppercase">Sobrantes (Tasa de Desperdicio)</h3>
                  <p className="text-xl font-black text-slate-800 mt-0.5">{activeBranchData?.leftoversRate}%</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="bg-green-50 p-4.5 rounded-2xl text-green-500">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-xs text-slate-400 font-bold uppercase">Gerente</h3>
                  <p className="text-base font-bold text-slate-800 mt-0.5">{activeBranchData?.manager}</p>
                </div>
              </div>

            </div>

            {/* Charts & Tables layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Daily Sales Graph */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 lg:col-span-2 min-h-[300px]">
                <KPIGraph 
                  data={activeBranchData?.salesWeekly || []} 
                  type="line" 
                  title="Ventas de la Semana ($)" 
                />
              </div>

              {/* Top products sold */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 lg:col-span-1 min-h-[300px] flex flex-col">
                <KPIGraph 
                  data={activeBranchData?.topProducts || []} 
                  type="donut" 
                  title="Productos Más Vendidos (Uds / kg)" 
                />
              </div>

            </div>

            {/* Panel de Producción y Cola de Horneado */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Bakery Production & Stock Controller */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 lg:col-span-2 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                      <Flame className="text-orange-500" size={20} />
                      <span>Producción y Stock de Panadería</span>
                    </h3>
                    <p className="text-xs text-slate-400">Verifique las existencias reales contra las ventas esperadas y ordene horneados a cocina.</p>
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
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                isLow ? 'bg-red-105 bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
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
                                      onClick={() => {
                                        if (selectedBranchId === 'palermo') {
                                          requestBakeTask(p.id, 48);
                                          triggerToast(`Horneado solicitado: 48 uds de ${p.name}`);
                                        } else {
                                          triggerToast(`[Demo] Solicitada 1 bandeja para ${activeBranchData?.name}`);
                                        }
                                      }}
                                      className="text-[9px] h-6 px-1.5 border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-orange-600 rounded-md"
                                    >
                                      +1 Band. (48)
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        if (selectedBranchId === 'palermo') {
                                          requestBakeTask(p.id, 96);
                                          triggerToast(`Horneado solicitado: 96 uds de ${p.name}`);
                                        } else {
                                          triggerToast(`[Demo] Solicitadas 2 bandejas para ${activeBranchData?.name}`);
                                        }
                                      }}
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
                                      onClick={() => {
                                        if (selectedBranchId === 'palermo') {
                                          requestBakeTask(p.id, 5);
                                          triggerToast(`Horneado solicitado: 5 kg de ${p.name}`);
                                        } else {
                                          triggerToast(`[Demo] Solicitados 5 kg para ${activeBranchData?.name}`);
                                        }
                                      }}
                                      className="text-[9px] h-6 px-1.5 border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-orange-600 rounded-md"
                                    >
                                      +5 kg
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        if (selectedBranchId === 'palermo') {
                                          requestBakeTask(p.id, 10);
                                          triggerToast(`Horneado solicitado: 10 kg de ${p.name}`);
                                        } else {
                                          triggerToast(`[Demo] Solicitados 10 kg para ${activeBranchData?.name}`);
                                        }
                                      }}
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
                                    if (selectedBranchId === 'palermo') {
                                      requestBakeTask(p.id, customQty);
                                      triggerToast(`Horneado solicitado: ${customQty} uds/kg de ${p.name}`);
                                    } else {
                                      triggerToast(`[Demo] Solicitados ${customQty} uds/kg para ${activeBranchData?.name}`);
                                    }
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

              {/* Bake Queue Real-Time Card */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2.5 bg-orange-50 text-orange-500 rounded-xl">
                        <Flame size={20} className="animate-pulse" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">Horno Activo</h3>
                        <p className="text-xs text-slate-400">Ordenes activas en esta sucursal</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedBranchId === 'palermo' ? (
                      bakeQueue.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50 rounded-2xl">
                          <CheckCircle size={32} className="text-green-500 mb-1" />
                          <p className="text-xs font-bold text-slate-700">Sin Solicitudes Activas</p>
                          <p className="text-[10px] text-slate-400">Todo el stock está al día</p>
                        </div>
                      ) : (
                        bakeQueue.map(t => (
                          <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <div>
                              <p className="font-bold text-xs text-slate-800">{t.productName}</p>
                              <p className="text-[10px] text-slate-500">
                                Cantidad: <span className="font-semibold text-slate-700">{parseFloat(t.quantityNeeded.toString())}</span>
                              </p>
                            </div>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 animate-pulse">
                              {t.status === 'PENDING' ? 'En Cola' : 'En Horno'}
                            </span>
                          </div>
                        ))
                      )
                    ) : (
                      // Mock queue for Recoleta and Belgrano
                      <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50 rounded-2xl">
                        <CheckCircle size={32} className="text-green-500 mb-1" />
                        <p className="text-xs font-bold text-slate-700">Sin Solicitudes Activas</p>
                        <p className="text-[10px] text-slate-400">Todo el stock está al día</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Oven summary info */}
                <div className="mt-4 p-3 bg-orange-50/50 rounded-2xl border border-orange-100/50 text-[11px] text-orange-800 flex items-center gap-2">
                  <Activity size={14} className="text-orange-500 animate-pulse shrink-0" />
                  <span>Los panaderos verán estas órdenes en tiempo real en su panel de horneado.</span>
                </div>
              </div>

            </div>

            {/* Control de Sobrantes (Vendidos vs Sobrantes) Table */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <PieIcon className="text-orange-500" size={20} />
                    <span>Control de Sobrantes de Fin de Día</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Análisis de desperdicio diario: diferencia entre la producción estimada y lo realmente comercializado.</p>
                </div>
                <span className="text-xs text-slate-400 font-medium font-mono">Última sesión de hoy</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pl-4">Producto</th>
                      <th className="pb-3 text-right">Preparado (Total Inicial)</th>
                      <th className="pb-3 text-right">Vendido Hoy</th>
                      <th className="pb-3 text-right">Sobrante (Stock en Local)</th>
                      <th className="pb-3 text-right">Estado de Stock</th>
                      <th className="pb-3 text-right pr-4">Tasa de Sobrante (%)</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {activeBranchData?.leftoversSummary.map((item: any, idx: number) => {
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 pl-4 font-bold text-slate-800">
                            {item.name}
                          </td>
                          <td className="py-4 text-right font-medium text-slate-600">
                            {item.prepared}
                          </td>
                          <td className="py-4 text-right font-bold text-green-600">
                            {item.sold}
                          </td>
                          <td className="py-4 text-right font-bold text-slate-700">
                            {item.leftovers}
                          </td>
                          <td className="py-4 text-right">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              item.isLow ? 'bg-red-50 text-red-600 border border-red-100 animate-pulse' : 'bg-green-50 text-green-700 border border-green-100'
                            }`}>
                              {item.isLow ? 'Bajo Mínimo' : 'Suficiente'}
                            </span>
                          </td>
                          <td className="py-4 text-right pr-4 font-extrabold text-orange-500">
                            <div className="flex items-center justify-end gap-2">
                              {/* progress bar */}
                              <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                                <div 
                                  className={`h-full rounded-full ${
                                    item.wastePercent > 20 ? 'bg-red-500' :
                                    item.wastePercent > 10 ? 'bg-orange-500' : 'bg-green-500'
                                  }`} 
                                  style={{ width: `${item.wastePercent}%` }} 
                                />
                              </div>
                              <span>{item.wastePercent}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
