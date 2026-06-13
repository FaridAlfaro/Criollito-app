'use client';

import { RefObject } from 'react';
import { motion } from 'framer-motion';
import { Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OpenSessionModalProps {
  initialAmountInput: string;
  onAmountChange: (value: string) => void;
  onConfirm: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

export function OpenSessionModal({
  initialAmountInput,
  onAmountChange,
  onConfirm,
  inputRef,
}: OpenSessionModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-4 print:hidden"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-card border border-border rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6"
      >
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
            <Banknote size={36} />
          </div>
          <h2 className="text-3xl font-extrabold font-heading text-foreground tracking-tight">Apertura de Turno</h2>
          <p className="text-muted-foreground text-sm mt-2">
            Por favor, ingrese el efectivo inicial disponible en caja para comenzar a facturar.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground">Fondo Inicial ($)</label>
          <input
            ref={inputRef}
            type="number"
            className="w-full bg-background border border-border rounded-xl p-4 text-3xl font-mono text-center text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
            value={initialAmountInput}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <Button
          onClick={onConfirm}
          className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/95 text-primary-foreground rounded-2xl shadow-lg transition-transform hover:scale-[1.01]"
        >
          Abrir Caja y Comenzar
        </Button>
      </motion.div>
    </motion.div>
  );
}
