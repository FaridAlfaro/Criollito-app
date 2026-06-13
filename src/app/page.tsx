'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Store, UserCog, ChefHat, LayoutDashboard, ArrowRight, Lock, LogOut } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

const ROLES = [
  {
    id: 'admin',
    title: 'Admin',
    description: 'Gestión de personal y configuraciones.',
    icon: UserCog,
    href: '/admin',
    color: 'bg-blue-500',
    hover: 'hover:bg-blue-600',
  },
  {
    id: 'dueño',
    title: 'Dueño (Supervisor)',
    description: 'KPIs, rentabilidad y control general.',
    icon: LayoutDashboard,
    href: '/supervisor',
    color: 'bg-orange-500',
    hover: 'hover:bg-orange-600',
  },
  {
    id: 'cajero',
    title: 'Punto de Venta (POS)',
    description: 'Apertura, caja, tickets y ventas rápidas.',
    icon: Store,
    href: '/pos',
    color: 'bg-green-500',
    hover: 'hover:bg-green-600',
  },
  {
    id: 'panadero',
    title: 'Panadero',
    description: 'Hoja de horneado y alertas de stock.',
    icon: ChefHat,
    href: '/baker',
    color: 'bg-red-500',
    hover: 'hover:bg-red-600',
  },
];

export default function Home() {
  const { currentUser, loginUser, logoutUser } = useStore();
  const [selectedRole, setSelectedRole] = useState<'admin' | 'cajero' | 'panadero' | 'dueño'>('cajero');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    
    const success = loginUser(selectedRole, pin);
    if (!success) {
      setError(true);
      setPin('');
    }
  };

  const handlePinChange = (val: string) => {
    setError(false);
    if (val.length <= 4 && /^\d*$/.test(val)) {
      setPin(val);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  // 1. PANTALLA DE LOGIN (Si no ha iniciado sesión)
  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-100 space-y-6"
        >
          <div className="text-center">
            <h1 className="text-3xl font-extrabold font-heading text-slate-800">
              Criollito <span className="text-orange-500">SaaS</span>
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Ingrese el PIN de acceso de 4 dígitos para ingresar
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Seleccionar Rol</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as 'admin' | 'cajero' | 'panadero' | 'dueño')}
              >
                <option value="cajero">Cajero (POS)</option>
                <option value="admin">Administrador (Admin)</option>
                <option value="dueño">Dueño (Supervisor)</option>
                <option value="panadero">Panadero</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">PIN de Seguridad</label>
              <div className="relative">
                <input 
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className={`w-full bg-slate-50 border ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-orange-500'} rounded-2xl p-4 text-center font-mono text-3xl tracking-widest text-slate-800 focus:ring-2 focus:outline-none placeholder:text-slate-300 placeholder:text-base placeholder:tracking-normal`}
                  placeholder="Ingrese PIN"
                  value={pin}
                  onChange={(e) => handlePinChange(e.target.value)}
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              </div>
              <AnimatePresence>
                {error && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs font-semibold text-red-500 mt-1 text-center"
                  >
                    PIN incorrecto. Intente de nuevo (PIN actual: 1234)
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <Button 
              type="submit"
              disabled={pin.length < 4}
              className="w-full h-14 text-lg font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-2xl shadow-md transition-transform hover:scale-[1.01]"
            >
              Iniciar Sesión
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  // 2. PANTALLA DE ROLES (Si ya ha iniciado sesión)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 font-sans">
      
      {/* Header flotante de sesión */}
      <div className="absolute top-6 right-6 flex items-center gap-4 bg-white border border-slate-100 px-5 py-3 rounded-2xl shadow-sm">
        <div className="text-right">
          <p className="text-xs text-slate-500 font-medium">Sesión activa</p>
          <p className="text-sm font-bold text-slate-800">{currentUser.name} ({currentUser.role.toUpperCase()})</p>
        </div>
        <button 
          onClick={logoutUser}
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
          Panel de Accesos Autorizados para {currentUser.name}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl">
        {ROLES.map((role) => {
          // Validar accesos según el rol de la sesión
          const isAllowed = 
            (currentUser.role === 'admin' && role.id === 'admin') ||
            (currentUser.role === 'dueño' && (role.id === 'dueño' || role.id === 'admin')) ||
            (currentUser.role === 'cajero' && role.id === 'cajero') ||
            (currentUser.role === 'panadero' && role.id === 'panadero');

          return (
            <div key={role.id} className="relative flex">
              {isAllowed ? (
                // Permitido
                <Link
                  href={role.href}
                  className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col items-center text-center overflow-hidden w-full"
                >
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white mb-6 transition-transform group-hover:scale-110 ${role.color}`}>
                    <role.icon size={32} />
                  </div>
                  <h2 className="text-xl font-bold font-heading mb-2 text-slate-800">
                    {role.title}
                  </h2>
                  <p className="text-sm text-slate-500 font-sans mb-6 flex-grow">
                    {role.description}
                  </p>
                  <div className="flex items-center text-orange-500 font-semibold group-hover:gap-2 transition-all">
                    <span>Ingresar</span>
                    <ArrowRight size={18} className="ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </div>
                </Link>
              ) : (
                // Bloqueado
                <div className="bg-slate-100/50 rounded-2xl p-6 border border-dashed border-slate-200 flex flex-col items-center text-center opacity-60 w-full relative group">
                  <div className="absolute inset-0 bg-slate-200/10 backdrop-blur-[0.5px] rounded-2xl"></div>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-slate-300 text-slate-500 mb-6 z-10">
                    <Lock size={32} />
                  </div>
                  <h2 className="text-xl font-bold font-heading mb-2 text-slate-500 z-10">
                    {role.title}
                  </h2>
                  <p className="text-sm text-slate-400 font-sans mb-6 flex-grow z-10">
                    No tiene permisos para acceder a esta sección.
                  </p>
                  <div className="text-slate-400 text-xs font-bold border border-slate-200 px-3 py-1.5 rounded-lg bg-white shadow-sm z-10">
                    Bloqueado
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
