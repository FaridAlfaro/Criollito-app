'use client';

import { motion } from 'framer-motion';
import { Check, CheckCircle2, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';

interface QrPaymentModalProps {
  total: number;
  qrData: string;
  isProcessing: boolean;
  isPaid: boolean;
  onSimulateSuccess: () => void;
  onCancel: () => void;
}

export function QrPaymentModal({
  total,
  qrData,
  isProcessing,
  isPaid,
  onSimulateSuccess,
  onCancel,
}: QrPaymentModalProps) {
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
        className="bg-card border border-border rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6 text-center"
      >
        <div>
          <h3 className="text-xl font-bold flex items-center justify-center gap-2 text-foreground">
            <QrCode className="text-primary" /> Cobro QR Dinámico
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Escanee el código QR para abonar ${total.toFixed(2)}</p>
        </div>

        <div className="flex justify-center bg-white p-6 rounded-2xl border border-border shadow-inner relative overflow-hidden">
          {isProcessing ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <span className="text-xs font-semibold text-slate-500">Generando QR...</span>
            </div>
          ) : isPaid ? (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="h-48 flex flex-col items-center justify-center gap-2 text-emerald-500 font-bold"
            >
              <CheckCircle2 size={54} className="animate-bounce" />
              <span>¡Pago Aprobado!</span>
            </motion.div>
          ) : qrData ? (
            <QRCodeSVG value={qrData} size={192} />
          ) : (
            <div className="text-xs text-destructive">Error al obtener el código QR de Mercado Pago.</div>
          )}
        </div>

        {!isPaid && !isProcessing && (
          <Button
            onClick={onSimulateSuccess}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2"
          >
            <Check size={18} /> Simular Escaneo Exitoso
          </Button>
        )}

        <Button variant="ghost" onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground">
          Cancelar Operación
        </Button>
      </motion.div>
    </motion.div>
  );
}
