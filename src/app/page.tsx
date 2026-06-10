'use client';

import Link from 'next/link';
import { Store, UserCog, ChefHat, LayoutDashboard, ArrowRight } from 'lucide-react';

const ROLES = [
  {
    id: 'admin',
    title: 'Admin (Dueño)',
    description: 'KPIs, rentabilidad y gestión del personal.',
    icon: UserCog,
    href: '/admin',
    color: 'bg-blue-500',
    hover: 'hover:bg-blue-600',
  },
  {
    id: 'supervisor',
    title: 'Supervisor',
    description: 'Control de inventario y sobrantes.',
    icon: LayoutDashboard,
    href: '/supervisor',
    color: 'bg-orange-500',
    hover: 'hover:bg-orange-600',
  },
  {
    id: 'pos',
    title: 'Punto de Venta',
    description: 'Caja, tickets y ventas rápidas.',
    icon: Store,
    href: '/pos',
    color: 'bg-green-500',
    hover: 'hover:bg-green-600',
  },
  {
    id: 'baker',
    title: 'Panadero',
    description: 'Hoja de horneado y alertas de stock.',
    icon: ChefHat,
    href: '/baker',
    color: 'bg-red-500',
    hover: 'hover:bg-red-600',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="max-w-4xl w-full text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4 text-slate-800">
          Criollito <span className="text-orange-500">SaaS</span>
        </h1>
        <p className="text-lg text-slate-600 font-sans">
          Selecciona tu rol para acceder al panel correspondiente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl">
        {ROLES.map((role) => (
          <Link
            key={role.id}
            href={role.href}
            className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col items-center text-center overflow-hidden"
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
        ))}
      </div>
    </div>
  );
}
