'use client';

import { motion } from 'framer-motion';
import { Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Numpad } from '@/components/ui/Numpad';
import type { Product } from '@/store/useStore';

interface WeightNumpadModalProps {
  product: Product;
  scaleConnected: boolean;
  scaleWeight: number;
  scaleError: string | null;
  isSimulatingScale: boolean;
  simulatedWeight: number;
  onConnectScale: () => void;
  onToggleSimulation: () => void;
  onValueChange: (value: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function WeightNumpadModal({
  product,
  scaleConnected,
  scaleWeight,
  isSimulatingScale,
  simulatedWeight,
  onConnectScale,
  onToggleSimulation,
  onValueChange,
  onConfirm,
  onCancel,
}: WeightNumpadModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 bg-background/80 backdrop-blur-sm flex items-center justify-center print:hidden"
    >
      <div className="flex flex-col items-center gap-4 bg-card border border-border p-6 rounded-3xl shadow-xl">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Scale className="text-primary" /> {product.name}
        </h2>

        {scaleConnected ? (
          <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-xl border border-emerald-500/20 text-sm font-semibold flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            Lectura Balanza: <span className="font-mono text-base font-bold">{scaleWeight.toFixed(3)} kg</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2 items-center">
            <div className="text-xs text-muted-foreground">Balanza Desconectada</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onConnectScale} className="text-xs h-8 border-border">
                Conectar
              </Button>
              <Button
                size="sm"
                variant={isSimulatingScale ? 'default' : 'outline'}
                onClick={onToggleSimulation}
                className="text-xs h-8"
              >
                {isSimulatingScale ? 'Detener Simulación' : 'Simular Peso'}
              </Button>
            </div>
          </div>
        )}

        <Numpad
          onValueChange={onValueChange}
          onConfirm={onConfirm}
          label="Ingrese Peso Manual o espere a Balanza"
          externalValue={scaleConnected ? scaleWeight : isSimulatingScale ? simulatedWeight : undefined}
        />
        <Button variant="ghost" className="text-muted-foreground hover:text-foreground text-sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </motion.div>
  );
}
