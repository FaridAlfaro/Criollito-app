'use client';

import { motion } from 'framer-motion';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SummaryData } from './types';

interface SessionSummaryModalProps {
  summaryData: SummaryData;
  onPrint: () => void;
  onFinish: () => void;
}

export function SessionSummaryModal({ summaryData, onPrint, onFinish }: SessionSummaryModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto print:hidden"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-card border border-border rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6 my-8"
      >
        <div className="text-center border-b border-border pb-4">
          <h2 className="text-2xl font-bold font-heading text-foreground">Reporte X/Z de Caja</h2>
          <p className="text-sm text-muted-foreground">Sesión Finalizada con Éxito</p>
        </div>

        <div className="bg-muted/40 border border-dashed border-border p-6 rounded-2xl font-mono text-sm space-y-4 text-foreground">
          <div className="text-center font-bold tracking-widest uppercase mb-2">*** EL CRIOLLITO PANADERIA ***</div>
          <div className="flex justify-between">
            <span>FONDO INICIAL:</span>
            <span>${summaryData.initialAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>VENTAS EFECTIVO:</span>
            <span>+${summaryData.totalSalesCash.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>VENTAS DEBITO:</span>
            <span>+${summaryData.totalDebit.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>VENTAS CREDITO:</span>
            <span>+${summaryData.totalCredit.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>VENTAS QR (M. PAGO):</span>
            <span>+${(summaryData.totalQr || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
            <span>INGRESOS MANUALES:</span>
            <span>+${summaryData.totalIngresos.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-rose-600 dark:text-rose-400">
            <span>EGRESOS MANUALES:</span>
            <span>-${summaryData.totalEgresos.toFixed(2)}</span>
          </div>

          <div className="border-t border-dashed border-border my-2" />

          <div className="flex justify-between font-bold text-base">
            <span>TOTAL TEÓRICO EN CAJA:</span>
            <span>${summaryData.theoreticalTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-base text-primary">
            <span>EFECTIVO CONTADO:</span>
            <span>${summaryData.countedCash.toFixed(2)}</span>
          </div>

          <div className="border-t border-dashed border-border my-2" />

          <div
            className={`flex justify-between font-extrabold text-lg p-2 rounded-lg ${
              summaryData.difference >= 0
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}
          >
            <span>DIFERENCIA:</span>
            <span>
              {summaryData.difference > 0 ? '+' : ''}${summaryData.difference.toFixed(2)}
              {summaryData.difference === 0 ? ' (Cuadrado)' : summaryData.difference > 0 ? ' (Sobrante)' : ' (Faltante)'}
            </span>
          </div>
        </div>

        <div className="flex gap-4">
          <Button variant="outline" onClick={onPrint} className="flex-1 h-14 rounded-2xl border-border flex items-center justify-center gap-2">
            <Printer size={18} />
            <span>Imprimir Ticket</span>
          </Button>
          <Button onClick={onFinish} className="flex-1 h-14 rounded-2xl bg-foreground hover:bg-foreground/90 text-background font-bold">
            Finalizar Turno
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
