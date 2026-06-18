'use client';

import { useState } from 'react';
import { createEmployee } from '@/actions/employees';
import { Button } from '@/components/ui/button';
import { 
  UserPlus, UserCheck, Mail, Lock, Plus, 
  Sparkles, CheckCircle2, AlertTriangle, Users 
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

interface AdminUsuariosClientProps {
  initialEmployees: Employee[];
  tenantName: string;
}

export default function AdminUsuariosClient({ initialEmployees, tenantName }: AdminUsuariosClientProps) {
  const [employeesList, setEmployeesList] = useState<Employee[]>(initialEmployees);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'cajero' | 'panadero'>('cajero');

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await createEmployee({
        name,
        email,
        password,
        role,
      });

      if (res.success) {
        setSuccessMsg(`¡Empleado "${name}" creado con éxito!`);
        // Reset form
        setName('');
        setEmail('');
        setPassword('');
        setRole('cajero');

        // Add to list
        if (res.data) {
          const newEmp: Employee = {
            id: res.data.id,
            tenantId: '', // not needed in UI table
            name: res.data.name,
            email: res.data.email,
            role: res.data.role,
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

  // Helper to translate roles for display
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-2xl">
              <Users size={28} />
            </div>
            Gestión de Personal - {tenantName}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administra a los cajeros y panaderos que trabajan en esta sucursal.
          </p>
        </div>
      </div>

      {/* Grid Layout: Form and Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6 h-fit">
          <div>
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <UserPlus className="text-orange-500" size={20} />
              <span>Añadir Nuevo Empleado</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Ingresa los datos del nuevo miembro del equipo.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Name */}
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
                  placeholder="email@criollito.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-700 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  required
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Contraseña</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-700 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  required
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              </div>
            </div>

            {/* Role select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Puesto / Rol</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                value={role}
                onChange={(e) => setRole(e.target.value as 'cajero' | 'panadero')}
              >
                <option value="cajero">Cajero</option>
                <option value="panadero">Panadero</option>
              </select>
            </div>

            {/* Feedback Notifications */}
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
                  className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2 text-emerald-600 text-xs font-medium"
                >
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Crear Empleado</span>
                </>
              )}
            </Button>

          </form>
        </div>

        {/* Directory Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 lg:col-span-2 space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Personal Activo en la Sucursal</h3>
            <p className="text-xs text-slate-400">
              Listado del equipo registrado bajo tu cuenta de panadería. Solo puedes ver y gestionar empleados de tu propia empresa.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pl-2">Empleado</th>
                  <th className="pb-3">Puesto / Rol</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3 text-right pr-2">Fecha Registro</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100">
                {employeesList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No hay empleados registrados en esta panadería.
                    </td>
                  </tr>
                ) : (
                  employeesList.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 pl-2 font-bold text-slate-800 flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          emp.role === 'BAKER' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {emp.name[0]}
                        </div>
                        <div>
                          <div>{emp.name}</div>
                          <span className="text-[10px] text-slate-400 block font-normal">{emp.isActive ? 'Activo' : 'Inactivo'}</span>
                        </div>
                      </td>
                      <td className="py-4 font-medium text-slate-600">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          emp.role === 'BAKER' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                        }`}>
                          {translateRole(emp.role)}
                        </span>
                      </td>
                      <td className="py-4 text-slate-500">
                        {emp.email}
                      </td>
                      <td className="py-4 text-right text-slate-400 pr-2">
                        {new Date(emp.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
