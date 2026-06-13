'use client';

import { motion } from 'framer-motion';
import { FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CheckoutModalProps {
  onSelectFactura: () => void;
  onSelectRecibo: () => void;
  onSelectNinguno: () => void;
}

export function CheckoutModal({ onSelectFactura, onSelectRecibo, onSelectNinguno }: CheckoutModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-card border border-slate-200 rounded-[32px] p-8 max-w-lg w-full shadow-2xl space-y-6"
      >
        <div className="text-center">
          <h3 className="text-2xl font-extrabold font-heading text-slate-800 tracking-tight">Cerrar Venta</h3>
          <p className="text-sm text-slate-500 mt-2">
            Seleccione si desea imprimir comprobante fiscal, recibo de cortesía o no imprimir.
          </p>
        </div>

        <div className="space-y-6">
          <Button
            onClick={onSelectFactura}
            className="w-full h-32 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-3xl flex items-center justify-between px-8 shadow-lg relative transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center gap-4">
              <Printer size={32} />
              <div className="text-left">
                <p className="text-xl font-extrabold">Emitir Factura</p>
                <p className="text-sm opacity-90 font-medium">Facturación Electrónica AFIP Oficial</p>
              </div>
            </div>
            <span className="absolute top-2 right-2 text-xs font-bold font-mono px-2 py-0.5 rounded bg-orange-600/50 text-white border border-orange-400/30 shadow-sm">
              F
            </span>
          </Button>

          <Button
            onClick={onSelectRecibo}
            variant="outline"
            className="w-full h-32 border-2 border-slate-200 text-slate-800 hover:bg-slate-50 font-bold rounded-3xl flex items-center justify-between px-8 shadow-md relative transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center gap-4">
              <FileText size={32} className="text-orange-500" />
              <div className="text-left">
                <p className="text-xl font-extrabold">Imprimir Recibo</p>
                <p className="text-sm text-slate-500 font-medium">Ticket de cortesía sin validez fiscal</p>
              </div>
            </div>
            <span className="absolute top-2 right-2 text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-300 shadow-sm">
              B
            </span>
          </Button>

          <Button
            onClick={onSelectNinguno}
            variant="ghost"
            className="w-full h-20 text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-bold rounded-2xl flex items-center justify-between px-8 relative transition-all border border-dashed border-slate-200"
          >
            <span className="text-base font-bold">No emitir comprobante</span>
            <span className="absolute top-2 right-2 text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200 shadow-sm">
              Enter
            </span>
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
