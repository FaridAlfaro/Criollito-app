'use client';

import { useStore } from '@/store/useStore';
import { motion } from 'framer-motion';

export default function FuserPage() {
  const { currentUser } = useStore();

  return (
    <motion.main
      className="flex-1 p-6 overflow-y-auto"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <section className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-center text-foreground">
          Panel Fuser
        </h1>
        <p className="text-center text-muted-foreground mb-6">
          Bienvenido, {currentUser?.name ?? 'Usuario'} ({currentUser?.role.toUpperCase()})
        </p>
        {/* Placeholder content – can be expanded with actual UI */}
        <div className="grid grid-cols-1 gap-4">
          <div className="p-4 bg-white rounded-lg shadow-sm border border-slate-100">
            <h2 className="text-xl font-semibold mb-2">Demo de funcionalidades</h2>
            <p className="text-sm text-muted-foreground">
              Aquí puedes agregar los componentes que necesites para mostrar KPIs, controles de stock, etc.
            </p>
          </div>
        </div>
      </section>
    </motion.main>
  );
}
