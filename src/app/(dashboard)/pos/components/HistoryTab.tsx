'use client';

import { ArrowUpDown, History, Printer, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HistoryTabProps {
  salesHistory: any[];
  movementsHistory: any[];
  onPrintAll: () => void;
  onPrintSale: (sale: any) => void;
  onPrintMovement: (movement: any) => void;
}

export function HistoryTab({
  salesHistory,
  movementsHistory,
  onPrintAll,
  onPrintSale,
  onPrintMovement,
}: HistoryTabProps) {
  return (
    <div className="flex-grow flex flex-col gap-6 min-h-0 print:hidden">
      <div className="flex justify-between items-center pb-4 border-b border-border">
        <div>
          <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
            <History className="text-primary" /> Historial de Turno Actual
          </h2>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            Visualice las ventas y movimientos registrados en esta sesión de caja
          </p>
        </div>

        <Button
          onClick={onPrintAll}
          className="h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center gap-2"
          disabled={salesHistory.length === 0 && movementsHistory.length === 0}
        >
          <Printer size={16} />
          <span>Imprimir Historial Completo</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto pr-2 pb-6 flex-1">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <h3 className="text-lg font-bold font-heading text-foreground flex items-center gap-2 border-b border-border pb-3">
            <ShoppingCart size={18} className="text-primary" /> Ventas Registradas ({salesHistory.length})
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-[400px] pr-1 scrollbar-thin">
            {salesHistory.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm italic font-medium">
                No se han registrado ventas aún en esta sesión.
              </div>
            ) : (
              salesHistory.map((sale) => (
                <div
                  key={sale.id}
                  className="p-4 bg-muted/20 border border-border rounded-xl flex flex-col gap-2 relative group hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase font-mono">
                        {sale.comprobanteTipo || 'TICKET'}
                      </span>
                      {sale.numeroComprobante && (
                        <span className="text-[10px] font-bold text-muted-foreground ml-2 font-mono">
                          #{String(sale.numeroComprobante).padStart(5, '0')}
                        </span>
                      )}
                    </div>
                    <span className="text-base font-extrabold font-mono text-primary">
                      ${parseFloat(sale.totalAmount).toFixed(2)}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground font-medium flex gap-4">
                    <span>
                      Pago: <span className="font-bold text-foreground font-mono">{sale.paymentMethod}</span>
                    </span>
                    <span>Fecha: {new Date(sale.createdAt).toLocaleTimeString('es-AR')}</span>
                  </div>

                  <div className="text-[10px] text-muted-foreground mt-1 border-t border-border/50 pt-1">
                    <span className="font-bold">Detalle:</span>{' '}
                    {sale.items?.map((it: any) => `${it.name} x${it.quantity}`).join(', ')}
                  </div>

                  <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-border/50">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPrintSale(sale)}
                      className="h-8 text-[10px] font-bold border-border rounded-lg bg-background hover:bg-muted"
                    >
                      <Printer size={12} className="mr-1" /> Imprimir
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <h3 className="text-lg font-bold font-heading text-foreground flex items-center gap-2 border-b border-border pb-3">
            <ArrowUpDown size={18} className="text-primary" /> Movimientos Manuales ({movementsHistory.length})
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-[400px] pr-1 scrollbar-thin">
            {movementsHistory.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm italic font-medium">
                No se han registrado movimientos de caja aún.
              </div>
            ) : (
              movementsHistory.map((mov) => (
                <div
                  key={mov.id}
                  className="p-4 bg-muted/20 border border-border rounded-xl flex flex-col gap-2 relative group hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${
                          mov.type === 'INGRESO'
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                        }`}
                      >
                        {mov.type}
                      </span>
                    </div>
                    <span
                      className={`text-base font-extrabold font-mono ${
                        mov.type === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {mov.type === 'INGRESO' ? '+' : '-'}${parseFloat(mov.amount).toFixed(2)}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground font-semibold">
                    Concepto: <span className="text-foreground italic font-medium">{mov.description || 'Sin concepto'}</span>
                  </div>

                  <div className="text-[10px] text-muted-foreground font-mono">
                    Fecha: {new Date(mov.createdAt).toLocaleTimeString('es-AR')}
                  </div>

                  <div className="flex justify-end gap-2 mt-1 pt-1 border-t border-border/50">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPrintMovement(mov)}
                      className="h-8 text-[10px] font-bold border-border rounded-lg bg-background hover:bg-muted"
                    >
                      <Printer size={12} className="mr-1" /> Imprimir Vale
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
