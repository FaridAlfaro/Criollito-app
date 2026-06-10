'use client';

import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import { Package, TrendingUp, AlertTriangle } from 'lucide-react';
import { KPIGraph } from "@/components/KPIGraph";
import { motion } from "framer-motion";

export default function SupervisorPage() {
  const { products } = useStore();
  const lowStockCount = products.filter(p => p.currentStock < p.minDailyStock).length;

  // Mock data for charts
  const salesData = [
    { name: 'Lun', value: 400 },
    { name: 'Mar', value: 300 },
    { name: 'Mié', value: 550 },
    { name: 'Jue', value: 450 },
    { name: 'Vie', value: 700 },
    { name: 'Sáb', value: 850 },
    { name: 'Dom', value: 900 },
  ];

  const topProductsData = [
    { name: 'Medialunas', value: 400 },
    { name: 'Pan Francés', value: 300 },
    { name: 'Criollitos', value: 200 },
    { name: 'Facturas', value: 100 },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-heading text-foreground">Panel de Supervisor</h1>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div whileHover={{ y: -2 }} className="bg-card p-6 rounded-xl shadow-sm border flex items-center gap-4">
          <div className="bg-muted p-4 rounded-full text-primary">
            <Package size={24} />
          </div>
          <div>
            <h3 className="text-sm text-muted-foreground font-medium">Sobrantes del Día (Ayer)</h3>
            <p className="text-2xl font-bold text-foreground">12%</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="bg-card p-6 rounded-xl shadow-sm border flex items-center gap-4">
          <div className="bg-muted p-4 rounded-full text-primary">
            <TrendingUp size={24} />
          </div>
          <div>
            <h3 className="text-sm text-muted-foreground font-medium">Ventas de Hoy</h3>
            <p className="text-2xl font-bold text-foreground">145</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className={`bg-card p-6 rounded-xl shadow-sm border flex items-center gap-4 ${lowStockCount > 0 ? 'border-primary/50 ring-1 ring-primary/20' : ''}`}>
          <div className={`${lowStockCount > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'} p-4 rounded-full`}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-sm text-muted-foreground font-medium">Alertas de Stock</h3>
            <p className="text-2xl font-bold text-foreground">{lowStockCount}</p>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Control Table */}
        <div className="bg-card p-6 rounded-xl shadow-sm border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold font-heading text-foreground">Control de Inventario</h2>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">Nuevo Producto</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-muted">
                  <th className="py-3 font-semibold text-muted-foreground">Producto</th>
                  <th className="py-3 font-semibold text-muted-foreground text-right">Stock</th>
                  <th className="py-3 font-semibold text-muted-foreground text-right">Mínimo</th>
                  <th className="py-3 font-semibold text-muted-foreground text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => {
                  const isLow = product.currentStock < product.minDailyStock;
                  return (
                    <tr key={product.id} className="border-b border-muted/50 hover:bg-muted/30 transition-colors">
                      <td className="py-4 font-medium text-foreground">{product.name}</td>
                      <td className={`py-4 text-right font-bold ${isLow ? 'text-primary' : 'text-foreground'}`}>
                        {product.currentStock} {product.type === 'WEIGHT' ? 'kg' : ''}
                      </td>
                      <td className="py-4 text-right text-muted-foreground">
                        {product.minDailyStock} {product.type === 'WEIGHT' ? 'kg' : ''}
                      </td>
                      <td className="py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${isLow ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                          }`}>
                          {isLow ? 'Bajo' : 'Óptimo'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts Panel */}
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-xl shadow-sm border">
            <KPIGraph data={salesData} type="line" title="Ventas Semanales" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-card p-6 rounded-xl shadow-sm border">
              <KPIGraph data={salesData.slice(-3)} type="bar" title="Rentabilidad" />
            </div>
            <div className="bg-card p-6 rounded-xl shadow-sm border">
              <KPIGraph data={topProductsData} type="donut" title="Top Productos" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
