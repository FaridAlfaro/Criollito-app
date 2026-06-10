'use client';

import Link from 'next/link';
import { Home, Bell } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { alerts, markAsRead } = useStore();
  const unreadAlerts = alerts.filter(a => !a.isRead);
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-screen bg-muted text-foreground font-sans">
      <header className="bg-background border-b px-6 py-4 flex justify-between items-center shadow-sm">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
          <Home size={20} />
          <span className="font-semibold font-heading">Volver al Inicio</span>
        </Link>
        
        <div className="relative group cursor-pointer">
          <div className="flex items-center gap-2">
            <Bell size={24} className="text-muted-foreground" />
            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold">
                {unreadAlerts.length}
              </span>
            )}
          </div>

          <div className="absolute right-0 mt-2 w-80 bg-background border border-border shadow-xl rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <div className="p-4 border-b border-border bg-muted/50 rounded-t-xl">
              <h3 className="font-bold font-heading">Notificaciones</h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">No hay notificaciones</div>
              ) : (
                alerts.map(alert => (
                  <div 
                    key={alert.id} 
                    className={`p-4 border-b border-muted text-sm transition-colors ${alert.isRead ? 'opacity-50' : 'bg-primary/10 hover:bg-primary/20'}`}
                    onClick={() => markAsRead(alert.id)}
                  >
                    <div className="flex justify-between mb-1">
                      <span className={`font-bold ${alert.type === 'LOW_STOCK' ? 'text-destructive' : 'text-primary'}`}>
                        {alert.type === 'LOW_STOCK' ? 'Alerta de Stock' : 'Sistema'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-foreground">{alert.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.main 
          key={pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="flex-1 overflow-y-auto p-6"
        >
          {children}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
