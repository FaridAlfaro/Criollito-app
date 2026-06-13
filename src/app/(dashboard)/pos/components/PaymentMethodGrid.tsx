'use client';

import { Banknote, CreditCard, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PaymentMethod } from './types';

interface PaymentMethodGridProps {
  paymentMethod: PaymentMethod;
  onSelectCash: () => void;
  onSelectDebit: () => void;
  onSelectCredit: () => void;
  onSelectQr: () => void;
}

export function PaymentMethodGrid({
  paymentMethod,
  onSelectCash,
  onSelectDebit,
  onSelectCredit,
  onSelectQr,
}: PaymentMethodGridProps) {
  const baseClass =
    'h-16 md:h-20 xl:h-24 font-bold border-2 flex flex-col items-center justify-center gap-1.5 text-sm relative rounded-2xl transition-all shadow-sm';

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-4 gap-2 mb-4">
        <Button
          variant={paymentMethod === 'CASH' ? 'default' : 'outline'}
          className={`${baseClass} ${paymentMethod === 'CASH'
            ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md border-orange-500'
            : 'bg-white hover:bg-orange-50 text-slate-700 border-slate-200 hover:border-orange-300'
            }`}
          onClick={onSelectCash}
        >
          <span className="absolute top-1.5 right-1.5 text-[7px] font-bold font-mono px-0.5 rounded border border-slate-200 bg-slate-50 text-slate-400 shadow-sm">
            E
          </span>
          <Banknote size={26} />
          <span className="font-extrabold">Efectivo</span>
        </Button>

        <Button
          variant={paymentMethod === 'DEBIT' ? 'default' : 'outline'}
          className={`${baseClass} ${paymentMethod === 'DEBIT'
            ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md border-orange-500'
            : 'bg-white hover:bg-orange-50 text-slate-700 border-slate-200 hover:border-orange-300'
            }`}
          onClick={onSelectDebit}
        >
          <span className="absolute top-1.5 right-1.5 text-[7px] font-bold font-mono px-0.5 rounded border border-slate-200 bg-slate-50 text-slate-400 shadow-sm">
            D
          </span>
          <CreditCard size={26} />
          <span className="font-extrabold">Débito</span>
        </Button>

        <Button
          variant={paymentMethod === 'CREDIT' ? 'default' : 'outline'}
          className={`${baseClass} ${paymentMethod === 'CREDIT'
            ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md border-orange-500'
            : 'bg-white hover:bg-orange-50 text-slate-700 border-slate-200 hover:border-orange-300'
            }`}
          onClick={onSelectCredit}
        >
          <span className="absolute top-1.5 right-1.5 text-[7px] font-bold font-mono px-0.5 rounded border border-slate-200 bg-slate-50 text-slate-400 shadow-sm">
            C
          </span>
          <CreditCard size={26} />
          <span className="font-extrabold">Crédito</span>
        </Button>

        <Button
          variant={paymentMethod === 'QR' ? 'default' : 'outline'}
          className={`${baseClass} ${paymentMethod === 'QR'
            ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md border-orange-500'
            : 'bg-white hover:bg-orange-50 text-slate-700 border-slate-200 hover:border-orange-300'
            }`}
          onClick={onSelectQr}
        >
          <span className="absolute top-1.5 right-1.5 text-[7px] font-bold font-mono px-0.5 rounded border border-slate-200 bg-slate-50 text-slate-400 shadow-sm">
            Q
          </span>
          <QrCode size={26} />
          <span className="font-extrabold">QR Pago</span>
        </Button>
      </div>
    </div>
  );
}
