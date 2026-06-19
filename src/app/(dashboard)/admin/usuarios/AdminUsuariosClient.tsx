'use client';

import { useState, useEffect } from 'react';
import { createEmployee } from '@/actions/employees';
import { fetchBranches } from '@/actions/branches';
import { Button } from '@/components/ui/button';
import {
  UserPlus, UserCheck, Mail, Lock, Plus,
  Sparkles, CheckCircle2, AlertTriangle, Users, MapPin, RefreshCw, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Employee {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISOR' | 'BAKER' | 'CASHIER';
  isActive: boolean;
  createdAt: Date;
}

interface Branch {
  id: string;
  name: string;
  address: string | null;
}

interface AdminUsuariosClientProps {
  initialEmployees: Employee[];
  tenantName: string;
}

export default function AdminUsuariosClient({ initialEmployees, tenantName }: AdminUsuariosClientProps) {
  const [employeesList, setEmployeesList] = useState<Employee[]>(initialEmployees);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isBranchesLoading, setIsBranchesLoading] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'CASHIER' | 'BAKER'>('CASHIER');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadBranches() {
      try {
        const list = await fetchBranches();
        setBranches(list as Branch[]);
        if (list.length > 0) setSelectedBranchId(list[0].id);
      } catch (err) {
        console.error('[AdminUsuarios] Error cargando sucursales:', err);
      } finally {
        setIsBranchesLoading(false);
      }
    }
    loadBranches();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((role === 'CASHIER' || role === 'BAKER') && !selectedBranchId) {
      setError('Debes asignar una sucursal a los cajeros y panaderos.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await createEmployee({
        name,
        email,
        password,
        role,
        branchId: selectedBranchId || null,
      });

      if (res.success) {
        setSuccessMsg(`¡Empleado "${name}" creado con éxito!`);
        setName(''); setEmail(''); setPassword('');

        if (res.data) {
          const newEmp: Employee = {
            id: res.data.id,
            tenantId: '',
            name: res.data.name,
            email: res.data.email,
            role: res.data.role as Employee['role'],
            isActive: true,
            createdAt: new Date(res.data.createdAt),
          };
          setEmployeesList(prev => [newEmp, ...prev]);
        }
      } else {
        setError(res.error || 'Ocurrió un error al crear el empleado.');
      }
    } catch (err: any) {
      setError(err.message || 'Error en la petición.');
    } finally {
      setLoading(false);
    }
  };

  const translateRole = (roleStr: string) => {
    const map: Record<string, string> = {
      SUPER_ADMIN: 'SaaS Super Admin',
      ADMIN: 'Administrador Local',
      SUPERVISOR: 'Dueño (Supervisor)',
      BAKER: 'Panadero',
      CASHIER: 'Cajero',
    };
    return map[roleStr] || roleStr;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 font-sans text-slate-800">

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold font-heading text-slate-800 tracking-tight flex items-center gap-3">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-2xl">
            <Users size={28} />
          </div>
          Gestión de Personal — {tenantName}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Crea cajeros y panaderos asignándolos a una sucursal. Sin sucursal asignada, no podrán operar.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Formulario */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-5 h-fit">
          <div>
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <UserPlus className="text-orange-500" size={20} />
              <span>Añadir Nuevo Empleado</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Todos los campos son obligatorios.</p>
          </div>

          {/* Alerta sin sucursales */}
          {!isBranchesLoading && branches.length === 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-medium">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>No hay sucursales registradas. Crea una sucursal primero desde la pestaña "Sucursales" del panel Admin.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Nombre Completo</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-700 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  required
                />
                <UserCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="empleado@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-700 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  required
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Contraseña</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-700 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  required
                  minLength={6}
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              </div>
            </div>

            {/* Rol */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Puesto / Rol</label>
              <div className="grid grid-cols-2 gap-2">
                {(['CASHIER', 'BAKER'] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-bold border-2 transition-all ${role === r ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    {r === 'CASHIER' ? '🏪 Cajero' : '🍞 Panadero'}
                  </button>
                ))}
              </div>
            </div>

            {/* Sucursal */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                <MapPin size={12} />
                Sucursal Asignada <span className="text-red-500 ml-0.5">*</span>
              </label>
              {isBranchesLoading ? (
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 text-sm">
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Cargando sucursales...</span>
                </div>
              ) : branches.length === 0 ? (
                <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs text-center">
                  Sin sucursales disponibles
                </div>
              ) : (
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  required
                >
                  <option value="">Seleccionar sucursal...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}{b.address ? ` — ${b.address}` : ''}</option>
                  ))}
                </select>
              )}
              <p className="text-[11px] text-amber-600 font-medium flex items-start gap-1">
                <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                Sin sucursal asignada, el empleado no puede operar en el POS ni en la panadería.
              </p>
            </div>

            {/* Feedback */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-600 text-xs font-medium"
                >
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}
              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 bg-green-50 border border-green-100 rounded-xl flex items-start gap-2 text-green-600 text-xs font-medium"
                >
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              disabled={loading || branches.length === 0}
              className="w-full h-12 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              <span>{loading ? 'Creando...' : 'Crear Empleado'}</span>
            </Button>
          </form>
        </div>

        {/* Directorio de Empleados */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Building2 size={20} className="text-orange-500" />
              Directorio de Personal
            </h3>
            <span className="text-xs text-slate-400 font-medium">{employeesList.length} usuarios registrados</span>
          </div>

          {employeesList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 gap-3">
              <Users size={40} className="text-slate-300" />
              <p className="text-base font-semibold text-slate-600">Sin empleados registrados</p>
              <p className="text-sm text-slate-400 text-center max-w-xs">
                Use el formulario de la izquierda para agregar el primer cajero o panadero.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pl-4">Empleado</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3 text-center">Rol</th>
                    <th className="pb-3 text-center">Estado</th>
                    <th className="pb-3 text-right pr-4">Alta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employeesList.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 pl-4 font-bold text-slate-800">{emp.name}</td>
                      <td className="py-4 text-slate-500 font-mono text-xs">{emp.email}</td>
                      <td className="py-4 text-center">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          emp.role === 'BAKER' ? 'bg-orange-100 text-orange-700' :
                          emp.role === 'CASHIER' ? 'bg-green-100 text-green-700' :
                          emp.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' :
                          emp.role === 'SUPERVISOR' ? 'bg-purple-100 text-purple-700' :
                          'bg-indigo-100 text-indigo-700'
                        }`}>
                          {translateRole(emp.role)}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          emp.isActive ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {emp.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-4 text-right pr-4 text-xs text-slate-400 font-mono">
                        {new Date(emp.createdAt).toLocaleDateString('es-AR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
