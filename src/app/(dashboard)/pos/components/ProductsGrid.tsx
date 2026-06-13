'use client';

import { motion } from 'framer-motion';
import { ScanLine, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Product } from '@/store/useStore';
import { getProductKeys } from './utils';

interface ProductsGridProps {
  products: Product[];
  currentSession: { initialAmount: string } | null;
  scaleConnected: boolean;
  scaleWeight: number;
  scaleError: string | null;
  onAddToCart: (product: Product, quantity?: number) => void;
  onConnectScale: () => void;
  onDisconnectScale: () => void;
}

export function ProductsGrid({
  products,
  currentSession,
  scaleConnected,
  scaleWeight,
  scaleError,
  onAddToCart,
  onConnectScale,
  onDisconnectScale,
}: ProductsGridProps) {
  return (
    <div className="flex-1 bg-card rounded-2xl shadow-sm p-6 flex flex-col border border-slate-200 overflow-hidden h-full">
      <div className="flex justify-between items-center mb-4 border-b border-border pb-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-extrabold font-heading text-slate-800 tracking-tight">Productos Rápidos</h2>
          {currentSession && (
            <p className="text-xs text-slate-400 font-semibold">
              Caja abierta con Fondo Inicial de{' '}
              <span className="font-bold text-slate-600">${parseFloat(currentSession.initialAmount).toFixed(2)}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1 items-end">
            <Button
              onClick={scaleConnected ? onDisconnectScale : onConnectScale}
              variant="outline"
              size="sm"
              className={`text-xs h-9 font-semibold border-slate-200 flex items-center gap-1.5 rounded-xl ${scaleConnected
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20'
                  : 'bg-white hover:bg-slate-50 text-slate-700'
                }`}
            >
              <Scale size={14} />
              <span>{scaleConnected ? `Balanza: ${scaleWeight.toFixed(3)} kg` : 'Conectar Balanza'}</span>
            </Button>
            {scaleError && (
              <span className="text-[10px] text-destructive font-semibold max-w-[150px] truncate" title={scaleError}>
                {scaleError}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
            <ScanLine size={16} className="text-orange-500 animate-pulse" />
            <span>Lectores Activos</span>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto p-1 pr-3 pb-3 min-h-0">
        {products.map((product) => {
          const keys = getProductKeys(product.id);
          return (
            <motion.div
              whileHover={{ scale: 1.01, borderColor: '#f97316' }}
              key={product.id}
              className="p-3.5 border border-slate-200 rounded-2xl bg-white flex flex-col justify-between h-40 select-none shadow-sm relative group overflow-hidden"
            >
              <div
                className="cursor-pointer flex-1 flex flex-col justify-between"
                onClick={() => onAddToCart(product)}
                title={`Agregar ${product.name}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 leading-tight text-sm md:text-base group-hover:text-orange-600 transition-colors">
                      {product.name}
                    </h3>
                    {product.barcode && <p className="text-[10px] text-slate-400 font-medium mt-0.5">{product.barcode}</p>}
                  </div>
                  {keys && (
                    <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200/50 shadow-inner">
                      {keys.main}
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center mt-1 pb-1">
                  <span className="text-orange-500 font-extrabold text-base">${product.price}</span>
                  <span className="text-[9px] text-slate-400 font-bold bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                    {product.type === 'WEIGHT' ? 'x kg' : 'x ud'}
                  </span>
                </div>
              </div>

              {product.type === 'UNIT' && keys && (
                <div className="flex gap-1.5 mt-1.5 pt-1.5 border-t border-dashed border-slate-100">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCart(product, 6);
                    }}
                    className="flex-1 h-7 text-[10px] font-bold bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center gap-1 border border-orange-200/30 relative"
                  >
                    <span>+6</span>
                    <span className="text-[8px] font-bold font-mono bg-orange-100/80 text-orange-500 px-0.5 rounded border border-orange-200/30">
                      {keys.p6}
                    </span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCart(product, 12);
                    }}
                    className="flex-1 h-7 text-[10px] font-bold bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center gap-1 border border-orange-200/30 relative"
                  >
                    <span>+12</span>
                    <span className="text-[8px] font-bold font-mono bg-orange-100/80 text-orange-500 px-0.5 rounded border border-orange-200/30">
                      {keys.p12}
                    </span>
                  </Button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
