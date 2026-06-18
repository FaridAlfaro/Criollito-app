'use client';

import { useState, useMemo } from 'react';
import { createNewTenant } from '@/actions/onboarding';
import { 
  updateTenantDetails, getTenantUsers, addAdminToTenant, 
  deleteUser, sendPaymentNotification, createSubscriptionPayment, 
  markPaymentPaid, bulkIssueInvoices 
} from '@/actions/superadmin-actions';
import { Button } from '@/components/ui/button';
import { 
  Building2, UserCheck, Mail, Lock, Plus, 
  Sparkles, CheckCircle2, AlertTriangle, ShieldCheck,
  Edit2, Trash2, Send, DollarSign, Calendar, 
  CreditCard, LayoutGrid, ListFilter, Users, RefreshCw,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Tenant {
  id: string;
  name: string;
  businessName: string | null;
  cuit: string | null;
  plan: number;
  createdAt: Date;
}

interface AdminUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

interface SubscriptionPayment {
  id: string;
  tenantId: string;
  amount: number;
  period: string;
  status: 'PENDING' | 'PAID';
  dueDate: Date;
  paidAt: Date | null;
  createdAt: Date;
}

interface UserDetail {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISOR' | 'BAKER' | 'CASHIER';
  isActive: boolean;
  createdAt: Date;
}

interface SuperAdminClientProps {
  initialTenants: Tenant[];
  initialAdmins: AdminUser[];
  initialPayments: SubscriptionPayment[];
}

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

const formatPeriodToSpanish = (periodStr: string) => {
  if (!periodStr || !periodStr.includes('-')) return periodStr;
  const [year, month] = periodStr.split('-');
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const idx = parseInt(month, 10) - 1;
  if (idx >= 0 && idx < 12) {
    return `${months[idx]} ${year}`;
  }
  return periodStr;
};

export default function SuperAdminClient({ initialTenants, initialAdmins, initialPayments }: SuperAdminClientProps) {
  const [activeTab, setActiveTab] = useState<'onboarding' | 'clientes' | 'pagos'>('clientes');

  // Lists state
  const [tenantsList, setTenantsList] = useState<Tenant[]>(initialTenants);
  const [adminsList, setAdminsList] = useState<AdminUser[]>(initialAdmins);
  const [paymentsList, setPaymentsList] = useState<SubscriptionPayment[]>(initialPayments);

  // Selected client/tenant state
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantUsers, setTenantUsers] = useState<UserDetail[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Forms state
  // 1. Onboarding Form
  const [panaderiaName, setPanaderiaName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<number>(14);

  // 2. Tenant Editing Form
  const [editName, setEditName] = useState('');
  const [editBusinessName, setEditBusinessName] = useState('');
  const [editCuit, setEditCuit] = useState('');
  const [editPlan, setEditPlan] = useState<number>(14);

  // 3. Add User Form
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');

  // 4. Send Notification Form
  const [notificationMsg, setNotificationMsg] = useState('');

  // 5. Bulk Invoice Period Input
  const [billingPeriod, setBillingPeriod] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  // Status notifications
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Trigger auto-dismiss toast
  const triggerToast = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setTimeout(() => setError(null), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // Group tenants / payments by CUIT
  const cuitGroups = useMemo(() => {
    const groups: Record<string, { cuit: string, name: string, planTotal: number, branches: Tenant[] }> = {};
    tenantsList.forEach(t => {
      const cuitKey = t.cuit || 'SIN-CUIT';
      if (!groups[cuitKey]) {
        groups[cuitKey] = {
          cuit: cuitKey,
          name: t.businessName || t.name,
          planTotal: 0,
          branches: []
        };
      }
      groups[cuitKey].branches.push(t);
      groups[cuitKey].planTotal += t.plan;
    });
    return Object.values(groups);
  }, [tenantsList]);

  // Load selected tenant details
  const handleSelectTenant = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setEditName(tenant.name);
    setEditBusinessName(tenant.businessName || tenant.name);
    setEditCuit(tenant.cuit || '');
    setEditPlan(tenant.plan);
    setTenantUsers([]);
    setNotificationMsg('');
    setLoadingUsers(true);

    try {
      const res = await getTenantUsers(tenant.id);
      if (res.success && res.data) {
        setTenantUsers(res.data as UserDetail[]);
      } else {
        triggerToast(res.error || 'Error al obtener usuarios', true);
      }
    } catch (e) {
      console.error(e);
      triggerToast('Error de red al obtener usuarios', true);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Handle Client Onboarding (Initial User is SUPERVISOR / Dueño)
  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await createNewTenant({
        panaderiaName,
        adminName,
        adminEmail,
        adminPassword,
        plan: selectedPlan,
      });

      if (res.success && res.data) {
        triggerToast(`¡Cliente "${panaderiaName}" y Dueño "${adminName}" creados con éxito!`);
        // Reset form
        setPanaderiaName('');
        setAdminName('');
        setAdminEmail('');
        setAdminPassword('');
        setSelectedPlan(14);

        // Update local list
        const newTenant: Tenant = {
          id: res.data.tenantId,
          name: panaderiaName,
          businessName: panaderiaName,
          cuit: 'Generado',
          plan: selectedPlan,
          createdAt: new Date(),
        };
        const newAdmin: AdminUser = {
          id: res.data.adminId,
          tenantId: res.data.tenantId,
          name: adminName,
          email: adminEmail,
          role: 'SUPERVISOR',
          createdAt: new Date(),
        };
        setTenantsList(prev => [newTenant, ...prev]);
        setAdminsList(prev => [newAdmin, ...prev]);
        
        // Auto-select
        handleSelectTenant(newTenant);
        setActiveTab('clientes');
      } else {
        triggerToast(res.error || 'Error en onboarding', true);
      }
    } catch (err: any) {
      triggerToast(err.message || 'Error en la petición.', true);
    } finally {
      setLoading(false);
    }
  };

  // Handle Client Details & Plan Update
  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setLoading(true);

    try {
      const res = await updateTenantDetails(selectedTenant.id, {
        name: editName,
        businessName: editBusinessName,
        cuit: editCuit,
        plan: editPlan,
      });

      if (res.success) {
        triggerToast('Datos del cliente y plan de suscripción actualizados.');
        // Update local state
        setTenantsList(prev => prev.map(t => t.id === selectedTenant.id ? { 
          ...t, 
          name: editName, 
          businessName: editBusinessName, 
          cuit: editCuit,
          plan: editPlan
        } : t));
        setSelectedTenant(prev => prev ? { 
          ...prev, 
          name: editName, 
          businessName: editBusinessName, 
          cuit: editCuit,
          plan: editPlan
        } : null);
      } else {
        triggerToast(res.error || 'Error al actualizar', true);
      }
    } catch (err: any) {
      triggerToast(err.message || 'Error de conexión', true);
    } finally {
      setLoading(false);
    }
  };

  // Handle Add Admin (ADMIN role)
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setLoading(true);

    try {
      const res = await addAdminToTenant(selectedTenant.id, {
        name: newAdminName,
        email: newAdminEmail,
        password: newAdminPassword,
      });

      if (res.success) {
        triggerToast(`Administrador "${newAdminName}" añadido correctamente.`);
        // Refresh users list
        const usersRes = await getTenantUsers(selectedTenant.id);
        if (usersRes.success && usersRes.data) {
          setTenantUsers(usersRes.data as UserDetail[]);
        }
        setNewAdminName('');
        setNewAdminEmail('');
        setNewAdminPassword('');
      } else {
        triggerToast(res.error || 'Error al asignar administrador', true);
      }
    } catch (err: any) {
      triggerToast(err.message || 'Error de conexión', true);
    } finally {
      setLoading(false);
    }
  };

  // Handle User Deletion
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario de la sucursal del cliente?')) return;
    if (!selectedTenant) return;

    try {
      const res = await deleteUser(userId);
      if (res.success) {
        triggerToast('Usuario eliminado correctamente.');
        setTenantUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        triggerToast(res.error || 'No se pudo eliminar el usuario', true);
      }
    } catch (err: any) {
      triggerToast(err.message || 'Error al conectar', true);
    }
  };

  // Handle Send Payment Notification Alert
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setLoading(true);

    try {
      const res = await sendPaymentNotification(selectedTenant.id, {
        message: notificationMsg,
      });

      if (res.success) {
        triggerToast('Notificación de cobro enviada al cliente.');
        setNotificationMsg('');
      } else {
        triggerToast(res.error || 'Error al enviar alerta', true);
      }
    } catch (err: any) {
      triggerToast(err.message || 'Error al conectar', true);
    } finally {
      setLoading(false);
    }
  };

  // Handle Bulk Group Billing Invoicing (Monthly Subscription)
  const handleBulkInvoice = async (cuit: string, clientName: string) => {
    const spanishPeriod = formatPeriodToSpanish(billingPeriod);
    if (!confirm(`¿Deseas emitir la factura del período "${spanishPeriod}" para todas las sucursales del cliente "${clientName}" (CUIT: ${cuit})?`)) return;
    setLoading(true);

    try {
      const res = await bulkIssueInvoices(cuit, spanishPeriod);

      if (res.success && res.data) {
        triggerToast(`Facturación mensual emitida para "${clientName}" y alertas de pago enviadas.`);
        
        // Append newly created invoices to local list state
        const formattedNewPayments: SubscriptionPayment[] = res.data.map(p => ({
          id: p.id,
          tenantId: p.tenantId,
          amount: p.amount,
          period: p.period,
          status: p.status,
          dueDate: new Date(p.dueDate),
          paidAt: p.paidAt ? new Date(p.paidAt) : null,
          createdAt: new Date(p.createdAt),
        }));

        setPaymentsList(prev => [...formattedNewPayments, ...prev]);
      } else {
        triggerToast(res.error || 'Error al emitir facturación agrupada', true);
      }
    } catch (err: any) {
      triggerToast(err.message || 'Error al conectar', true);
    } finally {
      setLoading(false);
    }
  };

  // Handle Mark Invoice as Paid
  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      const res = await markPaymentPaid(paymentId);
      if (res.success) {
        triggerToast('Pago de suscripción marcado como RECIBIDO.');
        setPaymentsList(prev => prev.map(p => p.id === paymentId ? {
          ...p,
          status: 'PAID',
          paidAt: new Date()
        } : p));
      } else {
        triggerToast(res.error || 'Error al registrar pago', true);
      }
    } catch (err: any) {
      triggerToast(err.message || 'Error al conectar', true);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans text-slate-800">
      
      {/* Toast Alert overlay */}
      <AnimatePresence>
        {(successMsg || error) && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 font-bold px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border ${
              error ? 'bg-red-500 text-white border-red-400' : 'bg-indigo-600 text-white border-indigo-500'
            }`}
          >
            <Sparkles size={18} />
            <span>{successMsg || error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-2xl">
              <ShieldCheck size={28} />
            </div>
            Panel de Operaciones SaaS
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestión centralizada de Clientes, asignación de cuentas de Dueños y facturación de abonos mensuales.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 border border-slate-200 w-fit shrink-0">
          <button
            onClick={() => setActiveTab('clientes')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'clientes'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 size={16} />
            <span>Ver Clientes</span>
          </button>
          <button
            onClick={() => setActiveTab('onboarding')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'onboarding'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus size={16} />
            <span>Nuevo Cliente (Dueño)</span>
          </button>
          <button
            onClick={() => setActiveTab('pagos')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'pagos'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard size={16} />
            <span>Suscripciones / Cobros</span>
          </button>
        </div>
      </div>

      {/* Main Tab Renderings */}
      <AnimatePresence mode="wait">
        
        {/* Tab 1: ONBOARDING */}
        {activeTab === 'onboarding' && (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Split onboarding card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6 lg:col-span-2 max-w-2xl">
              <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Plus className="text-indigo-500" size={20} />
                  <span>Dar de alta nueva Sucursal de Cliente</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Registra un nuevo establecimiento de panadería y asocia la cuenta del propietario con rol de **Dueño**.
                </p>
              </div>

              <form onSubmit={handleOnboardingSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Name */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Nombre de la Sucursal</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ej. Panadería Criollo Palermo"
                        value={panaderiaName}
                        onChange={(e) => setPanaderiaName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                        required
                      />
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    </div>
                  </div>

                  {/* Plan Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Plan Mensual</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                      value={selectedPlan}
                      onChange={(e) => setSelectedPlan(parseInt(e.target.value))}
                    >
                      <option value={14}>Plan Básico ($14 / mes)</option>
                      <option value={28}>Plan Estándar ($28 / mes)</option>
                      <option value={48}>Plan Premium ($48 / mes)</option>
                    </select>
                  </div>
                </div>

                <hr className="border-slate-150 my-2" />
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Usuario Dueño Principal</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Nombre Completo</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ej. Carlos Gomez"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                        required
                      />
                      <UserCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Email de Ingreso</label>
                    <div className="relative">
                      <input
                        type="email"
                        placeholder="dueno@panaderia.com"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                        required
                      />
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Contraseña</label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                      required
                    />
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer w-full md:w-auto px-8"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Registrar Cliente y Plan</span>
                    </>
                  )}
                </Button>
              </form>
            </div>
          </motion.div>
        )}

        {/* Tab 2: CLIENTES DIRECTORY & MANAGEMENT */}
        {activeTab === 'clientes' && (
          <motion.div
            key="clientes"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* List of Clients */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4 lg:col-span-1 h-fit">
              <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Building2 size={20} className="text-indigo-600" />
                  <span>Clientes y Sucursales</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Selecciona una sucursal para editar su ficha, ver su personal o enviar notificaciones.</p>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {tenantsList.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">No hay clientes registrados.</div>
                ) : (
                  tenantsList.map(t => {
                    const isSelected = selectedTenant?.id === t.id;
                    const admins = adminsList.filter(a => a.tenantId === t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleSelectTenant(t)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left space-y-1 ${
                          isSelected 
                            ? 'bg-indigo-50 border-indigo-250 shadow-sm'
                            : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        <div className="font-bold text-sm text-slate-800 flex justify-between items-center">
                          <span>{t.name}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">${t.plan}</span>
                        </div>
                        <div className="text-[10px] font-medium text-slate-500">CUIT: {t.cuit || 'Sin CUIT'}</div>
                        <div className="text-[10px] text-slate-400 flex justify-between items-center pt-1">
                          <span>{admins.length} Cuentas principales</span>
                          <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Selected Client Management Console */}
            <div className="lg:col-span-2 space-y-6">
              {selectedTenant ? (
                <div className="space-y-6">
                  
                  {/* Detailed Client Editor */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                    <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">Modificar Ficha de Cliente</h3>
                        <span className="font-mono text-[9px] text-slate-450">ID Sucursal: {selectedTenant.id}</span>
                      </div>
                      <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full capitalize">
                        {selectedTenant.name}
                      </span>
                    </div>

                    <form onSubmit={handleUpdateDetails} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Nombre Sucursal</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">CUIT / NIT</label>
                        <input
                          type="text"
                          value={editCuit}
                          onChange={(e) => setEditCuit(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">Plan de Suscripción</label>
                        <select
                          value={editPlan}
                          onChange={(e) => setEditPlan(parseInt(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-850 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                        >
                          <option value={14}>Plan $14</option>
                          <option value={28}>Plan $28</option>
                          <option value={48}>Plan $48</option>
                        </select>
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Razón Social</label>
                        <input
                          type="text"
                          value={editBusinessName}
                          onChange={(e) => setEditBusinessName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                        />
                      </div>
                      <div className="md:col-span-4 pt-2 text-right">
                        <Button
                          type="submit"
                          disabled={loading}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold h-9 px-4 cursor-pointer"
                        >
                          Guardar Cambios
                        </Button>
                      </div>
                    </form>
                  </div>

                  {/* Split Action Panels */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* User Manager */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                      <div>
                        <h4 className="font-bold text-slate-800 text-base flex items-center gap-2">
                          <Users size={18} className="text-slate-600" />
                          <span>Personal del Cliente</span>
                        </h4>
                        <p className="text-[10px] text-slate-400">Usuarios dueños, administradores o empleados de la sucursal.</p>
                      </div>

                      {loadingUsers ? (
                        <div className="flex justify-center items-center py-12">
                          <RefreshCw size={24} className="animate-spin text-slate-400" />
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                          {tenantUsers.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-xs italic">Cargando personal...</div>
                          ) : (
                            tenantUsers.map(u => (
                              <div key={u.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100/20 transition-colors">
                                <div>
                                  <div className="font-bold text-xs text-slate-800">{u.name}</div>
                                  <div className="text-[10px] text-slate-500">{u.email}</div>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block capitalize ${
                                    u.role === 'SUPERVISOR' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-700'
                                  }`}>
                                    {u.role === 'SUPERVISOR' ? 'Dueño' : translateRole(u.role)}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                  title="Eliminar usuario"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions Form Grid */}
                    <div className="space-y-6">
                      
                      {/* Form: Add Admin */}
                      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">Asignar Administrador de Sucursal</h4>
                          <p className="text-[10px] text-slate-450">Añade otra cuenta administrativa secundaria para esta sucursal.</p>
                        </div>

                        <form onSubmit={handleAddAdmin} className="space-y-2 text-xs">
                          <input
                            type="text"
                            placeholder="Nombre del Administrador"
                            value={newAdminName}
                            onChange={(e) => setNewAdminName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            required
                          />
                          <input
                            type="email"
                            placeholder="email@sucursal.com"
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            required
                          />
                          <input
                            type="password"
                            placeholder="Contraseña"
                            value={newAdminPassword}
                            onChange={(e) => setNewAdminPassword(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            required
                          />
                          <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold h-8 cursor-pointer mt-1"
                          >
                            Asignar Administrador
                          </Button>
                        </form>
                      </div>

                      {/* Form: Send Alert notification */}
                      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                            <Send size={14} className="text-orange-500" />
                            <span>Enviar Notificación de Cobro Directo</span>
                          </h4>
                          <p className="text-[10px] text-slate-450">Manda un mensaje directo sobre el estado de pago al campanario del cliente.</p>
                        </div>

                        <form onSubmit={handleSendNotification} className="space-y-2">
                          <textarea
                            placeholder="Ej. Recordamos que tu pago de abono mensual por las sucursales Criollo se encuentra próximo a vencer el día 10. Por favor, regularizar..."
                            value={notificationMsg}
                            onChange={(e) => setNotificationMsg(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs h-16 resize-none"
                            required
                          />
                          <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[10px] font-bold h-8 cursor-pointer"
                          >
                            Enviar Alerta de Pago
                          </Button>
                        </form>
                      </div>

                    </div>
                  </div>

                </div>
              ) : (
                <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-100 text-center flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <Building2 size={40} className="text-slate-350" />
                  <p className="font-semibold text-sm">Ningún cliente seleccionado</p>
                  <p className="text-xs">Elige una sucursal de la lista de la izquierda para ver su personal y modificar sus configuraciones.</p>
                </div>
              )}
            </div>

          </motion.div>
        )}

        {/* Tab 3: SUBSCRIPTIONS & GROUP BILLING */}
        {activeTab === 'pagos' && (
          <motion.div
            key="pagos"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Split layout: Billing controls & Invoice Directory */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-fit space-y-4 lg:col-span-1">
              <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <DollarSign className="text-indigo-500" size={20} />
                  <span>Facturar Período</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Selecciona el período de facturación. Todas las facturas generadas vencerán automáticamente el **día 10 de este mes**.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Seleccionar Mes y Año</label>
                  <input
                    type="month"
                    value={billingPeriod}
                    onChange={(e) => setBillingPeriod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div className="p-3 bg-indigo-50 border border-indigo-150 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold text-indigo-700 block uppercase">Regla de Vencimiento</span>
                  <p className="text-[10px] text-indigo-900 leading-normal">
                    Al emitir la factura para un cliente, se enviará una notificación a sus sucursales y la fecha de cobro se fijará para el **10 de este mes**.
                  </p>
                </div>
              </div>
            </div>

            {/* List of Payments Grouped by CUIT */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 lg:col-span-2 space-y-6">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Historial de Suscripciones por Clientes</h3>
                <p className="text-xs text-slate-400">
                  Resumen de abonos agrupados por CUIT. Puedes ver el total consolidado mensual y emitir facturas en lote para todas sus sucursales en un solo clic.
                </p>
              </div>

              <div className="space-y-6 max-h-[550px] overflow-y-auto pr-1">
                {cuitGroups.length === 0 ? (
                  <div className="text-center py-12 text-slate-405 text-sm italic">No hay clientes ni sucursales registrados.</div>
                ) : (
                  cuitGroups.map(group => {
                    // Filter payments belonging to all branches of this group (same CUIT)
                    const branchIds = group.branches.map(b => b.id);
                    const groupPayments = paymentsList.filter(p => branchIds.includes(p.tenantId));

                    return (
                      <div key={group.cuit} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/20 space-y-3">
                        
                        {/* Owner Header showing consolidated values */}
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-slate-100 pb-2.5 gap-3">
                          <div>
                            <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider">Cliente Propietario</span>
                            <h4 className="font-extrabold text-base text-slate-850">{group.name}</h4>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] text-slate-450 font-mono bg-slate-100 px-2 py-0.5 rounded">CUIT: {group.cuit}</span>
                              <span className="text-[10px] text-slate-500 font-bold">{group.branches.length} Sucursal(es)</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {/* Consolidated Plan Price */}
                            <div className="text-right">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase">Total Consolidado</span>
                              <div className="font-black text-slate-800 text-lg">
                                ${group.planTotal} <span className="text-xs font-normal text-slate-500">/ mes</span>
                              </div>
                            </div>

                            {/* Emit Factura Button */}
                            <button
                              onClick={() => handleBulkInvoice(group.cuit, group.name)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold px-4 py-2 flex items-center gap-1 shadow-sm cursor-pointer hover:scale-[1.01] transition-all"
                            >
                              <Coins size={14} />
                              <span>Emitir Factura</span>
                            </button>
                          </div>
                        </div>

                        {/* List of branches detail */}
                        <div className="flex flex-wrap gap-2 pt-0.5">
                          {group.branches.map(b => (
                            <span key={b.id} className="text-[9px] font-bold px-2.5 py-0.5 rounded bg-indigo-50 border border-indigo-100/30 text-indigo-600 select-none">
                              🏡 {b.name} (${b.plan})
                            </span>
                          ))}
                        </div>

                        {/* Group Payments Ledger */}
                        <div className="overflow-x-auto pt-1">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-100/70 text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                                <th className="pb-2 pl-1">Sucursal</th>
                                <th className="pb-2">Período</th>
                                <th className="pb-2 text-right">Monto</th>
                                <th className="pb-2 text-center">Vence</th>
                                <th className="pb-2 text-center">Estado</th>
                                <th className="pb-2 text-right pr-1">Acción</th>
                              </tr>
                            </thead>
                            <tbody className="text-[11px] divide-y divide-slate-100/50">
                              {groupPayments.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="py-4 text-center text-slate-400 text-xs italic">
                                    Sin facturas emitidas para este cliente en el historial.
                                  </td>
                                </tr>
                              ) : (
                                groupPayments.map(p => {
                                  const bName = group.branches.find(b => b.id === p.tenantId)?.name || 'Sucursal';
                                  const isPaid = p.status === 'PAID';
                                  
                                  return (
                                    <tr key={p.id} className="hover:bg-slate-100/10 transition-colors">
                                      <td className="py-3 pl-1 font-bold text-slate-700 truncate max-w-[120px]" title={bName}>
                                        {bName}
                                      </td>
                                      <td className="py-3 text-slate-500 font-medium">
                                        {p.period}
                                      </td>
                                      <td className="py-3 text-right font-black text-slate-800">
                                        ${p.amount.toLocaleString()}
                                      </td>
                                      <td className="py-3 text-center text-slate-400 font-mono text-[10px]">
                                        {new Date(p.dueDate).toLocaleDateString()}
                                      </td>
                                      <td className="py-3 text-center">
                                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                                          isPaid 
                                            ? 'bg-emerald-100 text-emerald-700' 
                                            : 'bg-amber-100 text-amber-700 border border-amber-250 animate-pulse'
                                        }`}>
                                          {isPaid ? 'Cobrado' : 'Pendiente'}
                                        </span>
                                      </td>
                                      <td className="py-3 text-right pr-1">
                                        {!isPaid ? (
                                          <button
                                            onClick={() => handleMarkAsPaid(p.id)}
                                            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-[9px] font-bold px-2.5 py-1 shadow-sm transition-all cursor-pointer hover:scale-[1.02]"
                                          >
                                            Cobrar
                                          </button>
                                        ) : (
                                          <span className="text-[9px] text-slate-400 font-medium" title={`Cobrado el ${new Date(p.paidAt!).toLocaleString()}`}>
                                            ✅ Recibido
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
