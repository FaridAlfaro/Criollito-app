'use client';

import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CloseSessionModalProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export function CloseSessionModal({
  onCancel,
  onConfirm,
}: CloseSessionModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-card border border-border rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6"
      >
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center text-primary mb-4">
            <LogOut size={36} />
          </div>
          <h2 className="text-2xl font-bold font-heading text-foreground">Confirmar Cierre de Caja</h2>
          <p className="text-muted-foreground text-sm mt-2">
            ¿Está seguro que desea cerrar el turno actual? Se generará el reporte final de caja.
          </p>
        </div>

        <div className="flex gap-4">
          <Button variant="outline" onClick={onCancel} className="flex-1 h-12 rounded-xl text-muted-foreground border-border">
            Cancelar
          </Button>
          <Button onClick={onConfirm} className="flex-1 h-12 rounded-xl font-bold bg-primary hover:bg-primary/95 text-primary-foreground">
            Cerrar Turno
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
