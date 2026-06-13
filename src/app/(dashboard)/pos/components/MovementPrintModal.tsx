'use client';

import { CheckCircle2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MovementPrintPreview } from './PrintPreviews';

interface MovementPrintModalProps {
  movement: any;
  onPrint: () => void;
  onClose: () => void;
}

export function MovementPrintModal({ movement, onPrint, onClose }: MovementPrintModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
      <div className="bg-card border border-border rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
        <CheckCircle2 className="mx-auto text-emerald-500" size={48} />
        <h3 className="text-xl font-bold">Comprobante de Caja</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Se ha generado el vale de caja para el movimiento.</p>

        <div className="border border-border p-3 bg-muted/20 rounded-xl">
          <MovementPrintPreview movement={movement} />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onPrint}>
            <Printer size={16} className="mr-1" /> Imprimir
          </Button>
          <Button className="flex-1" onClick={onClose}>
            Aceptar
          </Button>
        </div>
      </div>
    </div>
  );
}
