'use client';

import { RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QUICK_CASH_BUTTONS } from './utils';

interface CashChangePanelProps {
  total: number;
  cashReceived: string;
  changeToGive: number | null;
  isCashInsufficient: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onCashReceivedChange: (value: string) => void;
  onQuickCash: (amount: number) => void;
  onClose: () => void;
}

export function CashChangePanel({
  total,
  cashReceived,
  changeToGive,
  isCashInsufficient,
  inputRef,
  onCashReceivedChange,
  onQuickCash,
  onClose,
}: CashChangePanelProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white border border-slate-200 rounded-[32px] shadow-2xl p-6 max-w-sm w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="text-base font-extrabold text-slate-800">Efectivo Recibido</label>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Total a cobrar: ${total.toFixed(2)}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Cerrar panel de efectivo"
            >
              <X size={18} />
            </button>
          </div>

          <input
            ref={inputRef}
            type="number"
            autoFocus
            value={cashReceived}
            onChange={(e) => onCashReceivedChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isCashInsufficient && cashReceived !== '') {
                e.preventDefault();
                onClose();
              }
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 font-mono text-3xl text-center text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none font-bold shadow-inner mb-3"
            placeholder="0.00"
          />

          <div className="grid grid-cols-3 gap-4 mt-10">
            {QUICK_CASH_BUTTONS.map((b) => (
              <Button
                key={b.label}
                variant="outline"
                onClick={() => onQuickCash(b.val)}
                className="h-12 font-bold border-slate-200 bg-white relative text-sm hover:bg-orange-50 hover:border-orange-200"
              >
                {b.label}
                <span className="absolute top-0.5 right-0.5 text-[7px] text-slate-400 font-mono">{b.key}</span>
              </Button>
            ))}
          </div>

          {cashReceived !== '' && (
            <div className="mt-3">
              {isCashInsufficient ? (
                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm font-semibold flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>Insuficiente — faltan ${(total - parseFloat(cashReceived)).toFixed(2)}</span>
                </div>
              ) : changeToGive !== null ? (
                <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl flex items-center justify-between m-4">
                  <span className="text-sm font-bold text-emerald-700">Vuelto a entregar:</span>
                  <span className="text-3xl font-extrabold font-mono text-emerald-600">${changeToGive.toFixed(2)}</span>
                </div>
              ) : null}

              {!isCashInsufficient && (
                <Button
                  onClick={onClose}
                  className="w-full mt-3 h-12 text-base font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md transition-all mt-4"
                >
                  Confirmar Efectivo
                </Button>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
