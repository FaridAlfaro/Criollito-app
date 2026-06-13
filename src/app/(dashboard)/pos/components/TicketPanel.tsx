'use client';

import { RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Minus, Plus, ShoppingCart, Trash2, UserSquare2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CashChangePanel } from './CashChangePanel';
import { PaymentMethodGrid } from './PaymentMethodGrid';
import type { CartItem, PaymentMethod } from './types';

interface TicketPanelProps {
  cart: CartItem[];
  total: number;
  showSuccess: boolean;
  paymentMethod: PaymentMethod;
  customerDoc: string;
  requiresDoc: boolean;
  cashReceived: string;
  changeToGive: number | null;
  isCashInsufficient: boolean;
  canConfirm: boolean;
  customerDocInputRef: RefObject<HTMLInputElement | null>;
  cashReceivedInputRef: RefObject<HTMLInputElement | null>;
  onClearCart: () => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onCustomerDocChange: (value: string) => void;
  onCustomerDocValidate: (value: string) => void;
  onSelectCash: () => void;
  onSelectDebit: () => void;
  onSelectCredit: () => void;
  onSelectQr: () => void;
  onCloseCashPanel: () => void;
  onCashReceivedChange: (value: string) => void;
  onQuickCash: (amount: number) => void;
  onConfirmSale: () => void;
}

export function TicketPanel({
  cart,
  total,
  showSuccess,
  paymentMethod,
  customerDoc,
  requiresDoc,
  cashReceived,
  changeToGive,
  isCashInsufficient,
  canConfirm,
  customerDocInputRef,
  cashReceivedInputRef,
  onClearCart,
  onUpdateQuantity,
  onRemoveFromCart,
  onCustomerDocChange,
  onCustomerDocValidate,
  onSelectCash,
  onSelectDebit,
  onSelectCredit,
  onSelectQr,
  onCloseCashPanel,
  onCashReceivedChange,
  onQuickCash,
  onConfirmSale,
}: TicketPanelProps) {
  return (
    <div className="w-[450px] bg-card rounded-2xl shadow-sm p-4 flex flex-col border border-slate-200 relative overflow-hidden h-full">
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute inset-0 z-20 bg-orange-500 flex flex-col items-center justify-center text-white"
          >
            <CheckCircle2 size={64} className="mb-4 text-white" />
            <h2 className="text-3xl font-extrabold font-heading">Venta Registrada</h2>
            <p className="mt-2 text-white/95 font-semibold">Factura ARCA procesada con éxito</p>
          </motion.div>
        )}
      </AnimatePresence>



      <div className="flex justify-between items-center mb-2 text-slate-800 border-b border-border pb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart size={22} className="text-orange-500" />
          <h2 className="text-xl font-extrabold font-heading tracking-tight">Ticket Actual</h2>
        </div>
        {cart.length > 0 && (
          <button
            onClick={onClearCart}
            className="text-xs text-slate-400 hover:text-red-500 font-bold transition-colors border border-slate-200 px-2 py-1 rounded bg-slate-50 relative pr-6 flex items-center"
          >
            Vaciar Ticket
            <span className="absolute top-0.5 right-1 text-[7px] font-bold font-mono text-slate-400 bg-slate-100 border border-slate-200 px-0.5 rounded">
              V
            </span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 mb-2 pr-1 space-y-2">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
            <ShoppingCart size={40} className="mb-3 text-slate-300 animate-bounce" />
            <p className="font-semibold text-sm">Escanea o selecciona productos</p>
          </div>
        ) : (
          <AnimatePresence>
            {cart.map((item) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                key={item.product.id}
                className="flex flex-col gap-1.5 p-2.5 bg-muted/30 rounded-lg border border-border/50"
              >
                <div className="flex justify-between font-semibold text-foreground text-sm">
                  <span>{item.product.name}</span>
                  <span>${(item.product.price * item.quantity).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2.5 bg-background px-2 py-1 rounded-md border border-border">
                    <button
                      onClick={() => onUpdateQuantity(item.product.id, item.product.type === 'WEIGHT' ? -0.1 : -1)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="font-bold w-14 text-center text-foreground text-xs">
                      {item.quantity} {item.product.type === 'WEIGHT' ? 'kg' : 'ud'}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.product.id, item.product.type === 'WEIGHT' ? 0.1 : 1)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <button
                    onClick={() => onRemoveFromCart(item.product.id)}
                    className="text-muted-foreground hover:text-destructive p-1.5 rounded-md hover:bg-destructive/10 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={14} /> <span className="text-xs font-semibold">Eliminar</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="border-t border-slate-200 pt-2 bg-white z-10 flex flex-col flex-shrink-0">
        <div className="flex justify-between font-extrabold text-2xl mb-3 text-slate-800 font-heading">
          <span>Total</span>
          <span className="text-orange-500">${total.toFixed(2)}</span>
        </div>

        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold flex items-center gap-1.5 text-slate-700">
                <UserSquare2 size={13} className="text-slate-400" />
                DNI/CUIT Cliente
                <span className="text-[8px] font-bold font-mono px-1 rounded border border-slate-200 bg-slate-50 text-slate-400 shadow-sm ml-1">
                  0
                </span>
              </label>
              {requiresDoc && (
                <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-extrabold uppercase border border-red-200">
                  <AlertCircle size={9} className="inline" /> Req. ARCA
                </span>
              )}
            </div>
            <input
              ref={customerDocInputRef}
              type="number"
              placeholder={requiresDoc ? 'Obligatorio (Total > $10M)' : 'Opcional (Consumidor Final)'}
              value={customerDoc}
              onChange={(e) => onCustomerDocChange(e.target.value)}
              onBlur={(e) => onCustomerDocValidate(e.target.value)}
              className={`w-full bg-slate-50 border ${requiresDoc && customerDoc.length < 7 ? 'border-red-400 ring-1 ring-red-400/20' : 'border-slate-200'
                } rounded-xl p-2.5 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-slate-400 font-medium`}
            />
          </div>

          <PaymentMethodGrid
            paymentMethod={paymentMethod}
            onSelectCash={onSelectCash}
            onSelectDebit={onSelectDebit}
            onSelectCredit={onSelectCredit}
            onSelectQr={onSelectQr}
          />

          {paymentMethod === 'CASH' && cashReceived !== '' && changeToGive !== null && !isCashInsufficient && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-emerald-700">Vuelto:</span>
              <span className="text-lg font-extrabold font-mono text-emerald-600">${changeToGive.toFixed(2)}</span>
            </div>
          )}
        </div>

        <Button
          size="lg"
          className="w-full h-14 text-base font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-2xl shadow-xl transition-all disabled:opacity-50 relative flex items-center justify-center gap-1 mt-2 flex-shrink-0"
          disabled={!canConfirm}
          onClick={onConfirmSale}
        >
          {!paymentMethod
            ? 'Selecciona método de pago'
            : requiresDoc && customerDoc.length < 7
              ? 'Ingrese DNI/CUIT (ARCA)'
              : isCashInsufficient
                ? 'Efectivo insuficiente'
                : 'Cerrar Venta'}
          {canConfirm && (
            <span className="absolute top-1 right-1 text-[8px] font-bold font-mono px-1 py-0.5 rounded border border-orange-400 bg-orange-600/60 text-white shadow-inner">
              Enter
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
