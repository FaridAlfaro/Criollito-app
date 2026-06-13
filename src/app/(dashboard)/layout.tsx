'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Home, Bell, LogOut, ShieldAlert } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { alerts, markAsRead, currentUser, logoutUser, posActiveTab, setPosActiveTab } = useStore();
  const unreadAlerts = alerts.filter(a => !a.isRead);
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // 1. SI NO HAY SESIÓN INICIADA: Bloquear acceso y mostrar aviso de login
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center space-y-6"
        >
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-500">
            <ShieldAlert size={36} />
          </div>
          <h2 className="text-2xl font-bold font-heading text-slate-800">Acceso No Autorizado</h2>
          <p className="text-slate-500 text-sm">
            Debe iniciar sesión para acceder al panel.
          </p>
          <Link href="/" className="block">
            <Button className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-xl">
              Iniciar Sesión
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  // 2. CONTROL DE ROLES: Verificar si el rol tiene acceso a esta sección
  // admin -> /admin
  // dueño -> /supervisor o /admin
  // cajero -> /pos
  // panadero -> /baker
  const isAllowed = 
    (currentUser.role === 'admin' && pathname.startsWith('/admin')) ||
    (currentUser.role === 'dueño' && (pathname.startsWith('/supervisor') || pathname.startsWith('/admin'))) ||
    (currentUser.role === 'cajero' && pathname.startsWith('/pos')) ||
    (currentUser.role === 'panadero' && pathname.startsWith('/baker'));

  if (!isAllowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center space-y-6"
        >
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-500">
            <ShieldAlert size={36} />
          </div>
          <h2 className="text-2xl font-bold font-heading text-slate-800">Sección Bloqueada</h2>
          <p className="text-slate-500 text-sm">
            Tu rol de **{currentUser.role.toUpperCase()}** no tiene permisos para acceder a **{pathname}**.
          </p>
          <div className="flex gap-4">
            <Button 
              variant="outline"
              onClick={() => {
                logoutUser();
                router.push('/');
              }}
              className="flex-1 h-12 rounded-xl border-slate-200 text-slate-600"
            >
              Cerrar Sesión
            </Button>
            <Link href="/" className="flex-1">
              <Button className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-xl">
                Volver al Inicio
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-muted text-foreground font-sans">
      <header className="bg-background border-b px-6 py-4 flex justify-between items-center shadow-sm z-30">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
          <Home size={20} />
          <span className="font-semibold font-heading">Panel de Accesos</span>
        </Link>

        {pathname === '/pos' && (
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200">
            <button
              onClick={() => setPosActiveTab('cobros')}
              className={`flex items-center gap-2 pr-8 pl-4 py-1.5 text-xs font-bold rounded-lg transition-all relative ${
                posActiveTab === 'cobros'
                  ? 'bg-white text-orange-600 shadow-sm border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span>Cobros</span>
              <span className="absolute top-0.5 right-1 text-[8px] font-bold px-0.5 rounded font-mono border border-slate-200 bg-slate-50 text-slate-400">F1</span>
            </button>
            <button
              onClick={() => setPosActiveTab('movimientos')}
              className={`flex items-center gap-2 pr-8 pl-4 py-1.5 text-xs font-bold rounded-lg transition-all relative ${
                posActiveTab === 'movimientos'
                  ? 'bg-white text-orange-600 shadow-sm border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span>Movimientos</span>
              <span className="absolute top-0.5 right-1 text-[8px] font-bold px-0.5 rounded font-mono border border-slate-200 bg-slate-50 text-slate-400">F2</span>
            </button>
            <button
              onClick={() => setPosActiveTab('historial')}
              className={`flex items-center gap-2 pr-8 pl-4 py-1.5 text-xs font-bold rounded-lg transition-all relative ${
                posActiveTab === 'historial'
                  ? 'bg-white text-orange-600 shadow-sm border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span>Historial</span>
              <span className="absolute top-0.5 right-1 text-[8px] font-bold px-0.5 rounded font-mono border border-slate-200 bg-slate-50 text-slate-400">F3</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-6">
          {/* Info Cajero/Sesión */}
          <div className="text-right hidden sm:block">
            <span className="text-xs text-muted-foreground block font-medium">Sesión activa</span>
            <span className="text-sm font-bold text-foreground">{currentUser.name}</span>
          </div>

          {/* Notificaciones */}
          <div className="relative group cursor-pointer">
            <div className="flex items-center gap-2">
              <Bell size={22} className="text-muted-foreground hover:text-primary transition-colors" />
              {unreadAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] w-4.5 h-4.5 flex items-center justify-center rounded-full font-bold">
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
                      className={`p-4 border-b border-muted text-sm transition-colors cursor-pointer ${alert.isRead ? 'opacity-50' : 'bg-primary/10 hover:bg-primary/20'}`}
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

          {/* Botón Logout */}
          <button 
            onClick={() => {
              logoutUser();
              router.push('/');
            }}
            className="flex items-center justify-center p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
            title="Cerrar Sesión"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.main 
          key={pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className={`flex-1 ${pathname === '/pos' ? 'overflow-hidden p-0' : 'overflow-y-auto p-6'}`}
        >
          {children}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
