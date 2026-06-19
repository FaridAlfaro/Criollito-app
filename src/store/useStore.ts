import { create } from 'zustand';
import { persist, StateStorage, createJSONStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { openSession as openSessionAction, registerMovement as registerMovementAction, closeSession as closeSessionAction } from '@/actions/cashSessions';
import { procesarVenta } from '@/actions/procesarVenta';

// ==========================================
// TIPOS
// ==========================================

export type ProductType = 'UNIT' | 'WEIGHT';

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  price: number;
  currentStock: number;
  minDailyStock: number;
  optimalBatchSize: number;
  barcode?: string;
  branchId?: string;
}

export type AlertType = 'LOW_STOCK' | 'SYSTEM';

export interface Alert {
  id: string;
  tenantId: string;
  targetBranchId?: string | null;
  type: AlertType;
  message: string;
  isRead: boolean;
  createdAt: Date | string;
}

export interface BakeTask {
  id: string;
  tenantId: string;
  branchId?: string | null;
  productId: string;
  productName: string;
  productType: string;
  quantityNeeded: number | string;
  status: 'PENDING' | 'BAKING' | 'COMPLETED';
  requestedAt: Date | string;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMinutes?: number;
}

export interface CashSession {
  id: string;
  tenantId: string;
  branchId?: string | null;
  cashierId: string;
  openedAt: Date | string;
  closedAt: Date | string | null;
  initialAmount: string;
  finalAmount: string | null;
  totalSales: string | null;
  totalCash: string | null;
  totalDebit: string | null;
  totalCredit: string | null;
  totalQr: string | null;
  theoreticalAmount: string | null;
  difference: string | null;
}

export interface CashMovement {
  id: string;
  tenantId: string;
  cashSessionId: string;
  cashierId: string;
  type: 'INGRESO' | 'EGRESO_PROVEEDOR' | 'EGRESO_SUELDO' | 'EGRESO_VARIOS';
  amount: string;
  description: string | null;
  createdAt: Date | string;
}

export interface PendingSale {
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
  }[];
  paymentMethod: 'CASH' | 'DEBIT' | 'CREDIT' | 'QR';
  customerDoc?: string;
  comprobanteTipo?: 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C' | null;
  cae?: string;
  caeExpiration?: string;
  numeroComprobante?: number;
  qrCodeData?: string;
  createdAt: string;
}

export interface UserSession {
  id: string;
  tenantId: string;
  branchId: string | null;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISOR' | 'BAKER' | 'CASHIER';
}

export interface Employee {
  id: string;
  tenantId: string;
  branchId?: string | null;
  name: string;
  email: string;
  role: string;
  baseSalary: number;
  hourlyRate: number;
}

export interface Shift {
  id: string;
  tenantId: string;
  branchId?: string | null;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  day: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  shiftType: 'morning' | 'afternoon' | 'night';
}

// ==========================================
// STORAGE (IndexedDB)
// ==========================================

const customStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    try {
      const value = await idbGet(name);
      return value ? JSON.stringify(value) : null;
    } catch (err) {
      console.error('Error leyendo IndexedDB:', err);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      await idbSet(name, JSON.parse(value));
    } catch (err) {
      console.error('Error escribiendo en IndexedDB:', err);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      await idbDel(name);
    } catch (err) {
      console.error('Error borrando de IndexedDB:', err);
    }
  },
};

// ==========================================
// TIPOS DE RESULTADO
// ==========================================

export interface CloseSessionResult {
  session: CashSession;
  summary: {
    initialAmount: number;
    totalSalesCash: number;
    totalDebit: number;
    totalCredit: number;
    totalQr: number;
    totalIngresos: number;
    totalEgresos: number;
    theoreticalTotal: number;
    countedCash: number;
    difference: number;
  };
}

// ==========================================
// INTERFAZ DEL STORE
// ==========================================

interface AppState {
  // Products - cargados desde DB, no persistidos localmente
  products: Product[];
  setProducts: (products: Product[]) => void;

  // Alerts - cargadas desde DB, no persistidas localmente
  alerts: Alert[];
  setAlerts: (alerts: Alert[]) => void;
  markAsRead: (id: string) => void;
  clearAlerts: () => void;

  // Bake Queue - cargada desde DB, no persistida localmente
  bakeQueue: BakeTask[];
  setBakeQueue: (queue: BakeTask[]) => void;
  startBaking: (taskId: string, durationMinutes?: number) => void;
  finishBaking: (taskId: string) => void;

  // Cash Sessions & Movements
  currentSession: CashSession | null;
  pendingSales: PendingSale[];
  salesHistory: any[];
  movementsHistory: any[];
  posActiveTab: 'cobros' | 'movimientos' | 'historial';
  setCurrentSession: (session: CashSession | null) => void;
  setPosActiveTab: (tab: 'cobros' | 'movimientos' | 'historial') => void;
  openSession: (initialAmount: number) => Promise<CashSession>;
  registerMovement: (type: 'INGRESO' | 'EGRESO_PROVEEDOR' | 'EGRESO_SUELDO' | 'EGRESO_VARIOS', amount: number, description: string) => Promise<CashMovement>;
  closeSession: (countedCash: number) => Promise<CloseSessionResult>;
  fetchHistory: () => Promise<void>;

  // User Auth - reflects real DB session
  currentUser: UserSession | null;
  setSessionUser: (user: UserSession) => void;
  logoutUser: () => void;

  // Global Actions
  processSale: (
    items: { productId: string, quantity: number }[],
    paymentMethod: 'CASH' | 'DEBIT' | 'CREDIT' | 'QR',
    customerDoc?: string,
    comprobanteTipo?: 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C' | null,
    caeData?: { cae: string; expiration: string; numero: number; qr: string }
  ) => Promise<void>;
  syncOfflineSales: () => Promise<void>;

  // Staff & Shifts - cargados desde DB
  employees: Employee[];
  shifts: Shift[];
  setEmployees: (employees: Employee[]) => void;
  setShifts: (shifts: Shift[]) => void;
}

// ==========================================
// STORE
// ==========================================

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ---- Products: VACÍO, se hidrata desde DB ----
      products: [],
      setProducts: (products) => set({ products }),

      // ---- Alerts: VACÍO, se hidrata desde DB ----
      alerts: [],
      setAlerts: (alerts) => set({ alerts }),
      markAsRead: (id) => set((state) => ({
        alerts: state.alerts.map(alert =>
          alert.id === id ? { ...alert, isRead: true } : alert
        )
      })),
      clearAlerts: () => set({ alerts: [] }),

      // ---- Bake Queue: VACÍO, se hidrata desde DB ----
      bakeQueue: [],
      setBakeQueue: (bakeQueue) => set({ bakeQueue }),
      startBaking: (taskId, durationMinutes) => set((state) => ({
        bakeQueue: state.bakeQueue.map(task =>
          task.id === taskId ? {
            ...task,
            status: 'BAKING' as const,
            startedAt: new Date().toISOString(),
            durationMinutes: durationMinutes || 15
          } : task
        )
      })),
      finishBaking: (taskId) => set((state) => {
        const task = state.bakeQueue.find(t => t.id === taskId);
        if (!task) return state;
        return {
          bakeQueue: state.bakeQueue.filter(t => t.id !== taskId),
        };
      }),

      // ---- Employees & Shifts: VACÍO, se hidrata desde DB ----
      employees: [],
      shifts: [],
      setEmployees: (employees) => set({ employees }),
      setShifts: (shifts) => set({ shifts }),

      // ---- Cash Sessions ----
      currentSession: null,
      pendingSales: [],
      salesHistory: [],
      movementsHistory: [],
      posActiveTab: 'cobros',

      setCurrentSession: (session) => set({ currentSession: session }),
      setPosActiveTab: (tab) => set({ posActiveTab: tab }),

      openSession: async (initialAmount) => {
        const session = await openSessionAction(initialAmount);
        set({ currentSession: session as CashSession, salesHistory: [], movementsHistory: [] });
        return session as CashSession;
      },

      registerMovement: async (type, amount, description) => {
        const session = get().currentSession;
        if (!session) throw new Error('No hay una sesión de caja activa.');

        const movement = await registerMovementAction(session.id, type, amount, description);
        const newMov = {
          id: movement.id,
          type: movement.type,
          amount: parseFloat(movement.amount),
          description: movement.description,
          createdAt: movement.createdAt,
        };
        set(state => ({
          movementsHistory: [newMov, ...state.movementsHistory]
        }));
        return movement as CashMovement;
      },

      closeSession: async (countedCash) => {
        const session = get().currentSession;
        if (!session) throw new Error('No hay una sesión de caja activa.');

        const result = await closeSessionAction(session.id, countedCash);
        set({ currentSession: null, salesHistory: [], movementsHistory: [] });
        return result;
      },

      fetchHistory: async () => {
        const session = get().currentSession;
        if (!session) return;
        try {
          const { getSessionHistory } = await import('@/actions/cashSessions');
          const history = await getSessionHistory(session.id);
          set({
            salesHistory: history.sales,
            movementsHistory: history.movements,
          });
        } catch (err) {
          console.error('Error fetching history:', err);
        }
      },

      // ---- User Auth ----
      currentUser: null,
      setSessionUser: (user) => set({ currentUser: user }),
      logoutUser: () => {
        set({ currentUser: null, currentSession: null });
      },

      // ---- Process Sale ----
      processSale: async (items, paymentMethod, customerDoc, comprobanteTipo, caeData) => {
        const session = get().currentSession;

        const saleItemsInput = items.map(item => {
          const prod = get().products.find(p => p.id === item.productId);
          return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: prod ? prod.price : 0,
          };
        });

        // Actualización optimista local del stock
        const updatedProducts = get().products.map(product => {
          const saleItem = items.find(i => i.productId === product.id);
          if (!saleItem) return product;
          return { ...product, currentStock: product.currentStock - saleItem.quantity };
        });

        const totalAmount = saleItemsInput.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        const newSaleObj = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          totalAmount,
          paymentMethod,
          comprobanteTipo: comprobanteTipo || null,
          clienteDocumento: customerDoc || null,
          cae: caeData?.cae || null,
          caeExpiration: caeData?.expiration || null,
          numeroComprobante: caeData?.numero || null,
          qrCodeData: caeData?.qr || null,
          items: saleItemsInput.map(item => {
            const prod = get().products.find(p => p.id === item.productId);
            return {
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.quantity * item.unitPrice,
              name: prod ? prod.name : 'Producto',
            };
          }),
        };

        set({
          products: updatedProducts,
          salesHistory: [newSaleObj, ...get().salesHistory],
        });

        // Procesar en servidor
        const isOnline = typeof window !== 'undefined' ? navigator.onLine : true;

        if (!isOnline) {
          set((state) => ({
            pendingSales: [
              ...state.pendingSales,
              {
                items: saleItemsInput,
                paymentMethod,
                customerDoc,
                comprobanteTipo,
                cae: caeData?.cae,
                caeExpiration: caeData?.expiration,
                numeroComprobante: caeData?.numero,
                qrCodeData: caeData?.qr,
                createdAt: new Date().toISOString()
              }
            ]
          }));
        } else {
          try {
            // tenantId y cashierId ahora los lee el servidor de la sesión
            const res = await procesarVenta(
              saleItemsInput,
              paymentMethod,
              session?.id,
              customerDoc,
              comprobanteTipo,
              caeData?.cae,
              caeData?.expiration ? new Date(caeData.expiration) : undefined,
              caeData?.numero,
              caeData?.qr
            );
            if (res && !res.success) {
              throw new Error(res.error);
            }
          } catch (err) {
            console.error('Error procesando venta en servidor, guardando offline:', err);
            set((state) => ({
              pendingSales: [
                ...state.pendingSales,
                {
                  items: saleItemsInput,
                  paymentMethod,
                  customerDoc,
                  comprobanteTipo,
                  cae: caeData?.cae,
                  caeExpiration: caeData?.expiration,
                  numeroComprobante: caeData?.numero,
                  qrCodeData: caeData?.qr,
                  createdAt: new Date().toISOString()
                }
              ]
            }));
          }
        }
      },

      syncOfflineSales: async () => {
        const pending = get().pendingSales;
        if (pending.length === 0) return;

        const session = get().currentSession;
        console.log(`[Sync] Sincronizando ${pending.length} ventas offline...`);

        for (const sale of pending) {
          try {
            const res = await procesarVenta(
              sale.items,
              sale.paymentMethod,
              session?.id,
              sale.customerDoc,
              sale.comprobanteTipo,
              sale.cae,
              sale.caeExpiration ? new Date(sale.caeExpiration) : undefined,
              sale.numeroComprobante,
              sale.qrCodeData
            );
            if (res && !res.success) {
              throw new Error(res.error);
            }
          } catch (err) {
            console.error('Error sincronizando venta:', err);
          }
        }

        set({ pendingSales: [] });
        console.log('[Sync] Sincronización completada.');
      },
    }),
    {
      name: 'criollito-store-persisted',
      storage: createJSONStorage(() => customStorage),
      // Solo persistir la sesión de caja activa y las ventas pendientes offline
      // products, alerts, bakeQueue, employees, shifts se cargan FRESCOS desde DB
      partialize: (state) => ({
        currentSession: state.currentSession,
        pendingSales: state.pendingSales,
        currentUser: state.currentUser,
        posActiveTab: state.posActiveTab,
      }),
    }
  )
);
