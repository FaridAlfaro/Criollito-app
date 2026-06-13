'use client';

import { Button } from '@/components/ui/button';
import { LogOut, Wifi, WifiOff, Printer } from 'lucide-react';

interface PosStatusBarProps {
  hasSession: boolean;
  isOnline: boolean;
  pendingCount: number;
  isPrinterConnected: boolean;
  onTogglePrinter: () => void;
  onCloseSession: () => void;
}

export function PosStatusBar({ hasSession, isOnline, pendingCount, isPrinterConnected, onTogglePrinter, onCloseSession }: PosStatusBarProps) {
  return (
    <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 print:hidden m-2">
      {hasSession && (
        <Button
          variant="destructive"
          onClick={onCloseSession}
          className="h-10 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl relative pr-8 pl-3 shadow-lg"
        >
          <LogOut size={14} className="mr-1.5" />
          Cerrar Turno
          <span className="absolute top-1 right-1 text-[8px] font-bold font-mono px-1 rounded border border-rose-500 bg-rose-700/60 text-rose-100">
            T
          </span>
        </Button>
      )}
      <div
        className={`flex items-center gap-1.5 text-[10px] font-bold px-3 h-10 rounded-xl border shadow-sm ${isOnline
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
      >
        {isOnline ? (
          <>
            <Wifi size={12} className="text-emerald-500" />
            <span>ONLINE {pendingCount > 0 && `(${pendingCount} P.)`}</span>
          </>
        ) : (
          <>
            <WifiOff size={12} className="text-rose-500" />
            <span>OFFLINE ({pendingCount})</span>
          </>
        )}
      </div>
      <button
        onClick={onTogglePrinter}
        className={`flex items-center gap-1.5 text-[10px] font-bold px-3 h-10 rounded-xl border shadow-sm transition-colors ${isPrinterConnected
          ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
          }`}
      >
        <span className={`w-2 h-2 rounded-full ${isPrinterConnected ? 'bg-blue-500 animate-pulse' : 'bg-slate-400'}`}></span>
        {isPrinterConnected ? 'Impresora Conectada' : 'Sin Impresora'}
      </button>
    </div>
  );
}
