'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Store, UserCog, ChefHat, LayoutDashboard, ArrowRight, LogOut, Printer, ShieldAlert, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { loginAction, clearSessionAction } from '@/actions/auth';
import { useRouter } from 'next/navigation';

// Mapa de rutas según rol de DB
const ROLE_ROUTES: Record<string, { href: string; title: string; description: string; icon: any; color: string }> = {
  SUPER_ADMIN: { href: '/superadmin', title: 'Super Admin', description: 'Control global del SaaS.', icon: ShieldAlert, color: 'bg-indigo-600' },
  ADMIN:       { href: '/admin',      title: 'Administrador', description: 'Gestión de personal y configuraciones.', icon: UserCog, color: 'bg-blue-500' },
  SUPERVISOR:  { href: '/supervisor', title: 'Panel del Dueño', description: 'KPIs, rentabilidad y control general.', icon: LayoutDashboard, color: 'bg-orange-500' },
  CASHIER:     { href: '/pos',        title: 'Punto de Venta', description: 'Apertura, caja, tickets y ventas rápidas.', icon: Store, color: 'bg-green-500' },
  BAKER:       { href: '/baker',      title: 'Panadería', description: 'Hoja de horneado y alertas de stock.', icon: ChefHat, color: 'bg-red-500' },
};

export default function Home() {
  const { currentUser, setSessionUser, logoutUser } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await loginAction(email.trim(), password);
      if (result.success && result.user) {
        setSessionUser({
          id: result.user.id,
          name: result.user.name,
          role: result.user.role,
          tenantId: result.user.tenantId,
          branchId: result.user.branchId ?? null,
        });
      } else {
        setError(result.error || 'Error al iniciar sesión.');
        setPassword('');
      }
    } catch (err) {
      setError('Error de conexión. Intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    logoutUser();
    await clearSessionAction();
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  // ==========================================
  // PANTALLA DE LOGIN
  // ==========================================
  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 font-sans">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-100 space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-500 mx-auto">
              <Store size={36} />
            </div>
            <h1 className="text-3xl font-extrabold font-heading text-slate-800">
              Criollito <span className="text-orange-500">SaaS</span>
            </h1>
            <p className="text-sm text-slate-500">
              Ingrese sus credenciales para acceder al panel.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-slate-800 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="usuario@empresa.com"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-12 py-3.5 text-slate-800 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full h-14 text-lg font-bold bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-2xl shadow-md"
            >
              {isLoading ? 'Verificando...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  // ==========================================
  // PANTALLA DE ACCESO POR ROL (post-login)
  // ==========================================
  const roleRoute = ROLE_ROUTES[currentUser.role];
  const dbRole = currentUser.role as keyof typeof ROLE_ROUTES;

  // Roles con acceso múltiple
  const accessibleRoutes = Object.entries(ROLE_ROUTES).filter(([role]) => {
    if (dbRole === 'SUPER_ADMIN') return true;
    if (dbRole === 'ADMIN') return ['ADMIN'].includes(role);
    if (dbRole === 'SUPERVISOR') return ['SUPERVISOR', 'ADMIN'].includes(role);
    if (dbRole === 'CASHIER') return ['CASHIER'].includes(role);
    if (dbRole === 'BAKER') return ['BAKER'].includes(role);
    return false;
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 font-sans">

      {/* Header flotante */}
      <div className="absolute top-6 right-6 flex items-center gap-4 bg-white border border-slate-100 px-5 py-3 rounded-2xl shadow-sm">
        <div className="text-right">
          <p className="text-xs text-slate-500 font-medium">Sesión activa</p>
          <p className="text-sm font-bold text-slate-800">
            {currentUser.name}
            {currentUser.branchId && <span className="text-orange-500 ml-1 text-xs font-medium">· Sucursal asignada</span>}
          </p>
          <p className="text-xs text-slate-400">{currentUser.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
          title="Cerrar Sesión"
        >
          <LogOut size={20} />
        </button>
      </div>

      <div className="max-w-4xl w-full text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4 text-slate-800">
          Criollito <span className="text-orange-500">SaaS</span>
        </h1>
        <p className="text-lg text-slate-600 font-sans">
          Bienvenido, <strong>{currentUser.name}</strong>. Seleccione el módulo de trabajo.
        </p>
        {!currentUser.branchId && (dbRole === 'CASHIER' || dbRole === 'BAKER') && (
          <div className="mt-4 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-amber-700 text-sm font-medium">
            <ShieldAlert size={16} />
            <span>Su usuario no tiene sucursal asignada. Contacte al administrador antes de operar.</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
        {accessibleRoutes.map(([role, route]) => {
          const Icon = route.icon;
          // Bloquear POS y Baker si no tiene sucursal
          const needsBranch = role === 'CASHIER' || role === 'BAKER';
          const isBlocked = needsBranch && !currentUser.branchId;

          return (
            <div key={role} className="relative flex">
              {isBlocked ? (
                <div className="bg-slate-100/70 rounded-2xl p-6 border border-dashed border-amber-200 flex flex-col items-center text-center w-full opacity-80 relative">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-amber-100 text-amber-500 mb-4">
                    <Lock size={28} />
                  </div>
                  <h2 className="text-lg font-bold font-heading mb-2 text-slate-700">{route.title}</h2>
                  <p className="text-sm text-slate-500 font-sans mb-4 flex-grow">
                    Requiere estar asignado a una sucursal.
                  </p>
                  <div className="text-amber-600 text-xs font-bold border border-amber-200 px-3 py-1.5 rounded-lg bg-amber-50">
                    Sin Sucursal
                  </div>
                </div>
              ) : (
                <Link
                  href={route.href}
                  className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col items-center text-center overflow-hidden w-full"
                >
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white mb-4 transition-transform group-hover:scale-110 ${route.color}`}>
                    <Icon size={32} />
                  </div>
                  <h2 className="text-xl font-bold font-heading mb-2 text-slate-800">{route.title}</h2>
                  <p className="text-sm text-slate-500 font-sans mb-6 flex-grow">{route.description}</p>
                  <div className="flex items-center text-orange-500 font-semibold group-hover:gap-2 transition-all">
                    <span>Ingresar</span>
                    <ArrowRight size={18} className="ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </div>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
