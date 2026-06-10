'use client';

import { Button } from "@/components/ui/button";
import { KPIGraph } from "@/components/KPIGraph";
import { motion } from "framer-motion";
import { Users, TrendingUp, DollarSign, PieChart as PieChartIcon } from "lucide-react";

export default function AdminPage() {
  const paymentData = [
    { name: 'Efectivo', value: 60 },
    { name: 'Débito', value: 30 },
    { name: 'Crédito', value: 10 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-heading text-foreground">Dashboard Dueño (Admin)</h1>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          Invitar Empleado
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div whileHover={{ y: -2 }} className="bg-card p-6 rounded-xl shadow-sm border border-l-4 border-l-primary flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-muted-foreground" />
            <h3 className="text-muted-foreground text-sm font-medium">Ventas Hoy</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">$145.500</p>
        </motion.div>
        
        <motion.div whileHover={{ y: -2 }} className="bg-card p-6 rounded-xl shadow-sm border border-l-4 border-l-destructive flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-muted-foreground" />
            <h3 className="text-muted-foreground text-sm font-medium">Gastos / Compras</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">$42.000</p>
        </motion.div>
        
        <motion.div whileHover={{ y: -2 }} className="bg-card p-6 rounded-xl shadow-sm border border-l-4 border-l-primary/50 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <PieChartIcon size={16} className="text-muted-foreground" />
            <h3 className="text-muted-foreground text-sm font-medium">Pérdida (Sobrantes)</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">$5.200</p>
        </motion.div>
        
        <motion.div whileHover={{ y: -2 }} className="bg-card p-6 rounded-xl shadow-sm border border-l-4 border-l-green-500 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-green-500" />
            <h3 className="text-muted-foreground text-sm font-medium">Rentabilidad Est.</h3>
          </div>
          <p className="text-3xl font-bold text-green-500">67%</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Management */}
        <div className="lg:col-span-2 bg-card rounded-xl shadow-sm p-6 border">
          <div className="flex items-center gap-2 mb-6">
            <Users className="text-primary" />
            <h2 className="text-xl font-bold font-heading text-foreground">Gestión de Personal</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-muted">
                  <th className="pb-3 font-semibold text-muted-foreground">Nombre</th>
                  <th className="pb-3 font-semibold text-muted-foreground">Email</th>
                  <th className="pb-3 font-semibold text-muted-foreground text-center">Rol</th>
                  <th className="pb-3 font-semibold text-muted-foreground text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-muted/50 hover:bg-muted/30 transition-colors">
                  <td className="py-4 font-medium text-foreground">Juan Perez</td>
                  <td className="py-4 text-muted-foreground">juan@panaderia.com</td>
                  <td className="py-4 text-center">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">CASHIER</span>
                  </td>
                  <td className="py-4 text-right">
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hover:bg-primary/10">Editar</Button>
                  </td>
                </tr>
                <tr className="border-b border-muted/50 hover:bg-muted/30 transition-colors">
                  <td className="py-4 font-medium text-foreground">Carlos Horno</td>
                  <td className="py-4 text-muted-foreground">carlos@panaderia.com</td>
                  <td className="py-4 text-center">
                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">BAKER</span>
                  </td>
                  <td className="py-4 text-right">
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hover:bg-primary/10">Editar</Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Methods Chart */}
        <div className="bg-card rounded-xl shadow-sm p-6 border">
          <KPIGraph data={paymentData} type="donut" title="Métodos de Pago (%)" />
        </div>
      </div>
    </div>
  );
}
