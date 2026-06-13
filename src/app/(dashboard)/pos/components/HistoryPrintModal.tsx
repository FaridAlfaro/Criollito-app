'use client';

import { CheckCircle2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HistoryReportPrintPreview } from './PrintPreviews';

interface HistoryPrintModalProps {
  sales: any[];
  movements: any[];
  currentSession: any;
  onPrint: () => void;
  onClose: () => void;
}

export function HistoryPrintModal({ sales, movements, currentSession, onPrint, onClose }: HistoryPrintModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
      <div className="bg-card border border-border rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
        <CheckCircle2 className="mx-auto text-emerald-500" size={48} />
        <h3 className="text-xl font-bold">Reporte de Turno</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Se ha generado el resumen del turno.</p>

        <div className="border border-border p-3 bg-muted/20 rounded-xl overflow-y-auto max-h-[300px] scrollbar-thin">
          <HistoryReportPrintPreview sales={sales} movements={movements} currentSession={currentSession} />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onPrint}>
            <Printer size={16} className="mr-1" /> Imprimir
          </Button>
          <Button className="flex-1" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
