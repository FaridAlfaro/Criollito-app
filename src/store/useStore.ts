import { create } from 'zustand';
import { persist, StateStorage, createJSONStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { openSession as openSessionAction, registerMovement as registerMovementAction, closeSession as closeSessionAction } from '@/actions/cashSessions';
import { procesarVenta } from '@/actions/procesarVenta';

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
}

export type AlertType = 'LOW_STOCK' | 'SYSTEM';

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface BakeTask {
  id: string;
  productId: string;
  productName: string;
  quantityNeeded: number;
  status: 'PENDING' | 'BAKING' | 'COMPLETED';
  requestedAt: Date | string;
  startedAt?: string;
  durationMinutes?: number;
}

export interface CashSession {
  id: string;
  tenantId: string;
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
  role: 'admin' | 'cajero' | 'panadero' | 'dueño' | 'fuser' | 'superadmin';
  name: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'cajero' | 'panadero' | 'dueño' | 'fuser' | 'superadmin';
  baseSalary: number; 
  hourlyRate: number;
}

export interface Shift {
  id: string;
  employeeId: string;
  day: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  shiftType: 'morning' | 'afternoon' | 'night';
}

// Configuración de almacenamiento personalizado usando IndexedDB (idb-keyval)
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
      console.error('Error delating in IndexedDB:', err);
    }
  },
};

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

interface AppState {
  // Products
  products: Product[];
  
  // Alerts
  alerts: Alert[];
  addAlert: (alert: Omit<Alert, 'id' | 'isRead' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  clearAlerts: () => void;
  
  // Bake Queue
  bakeQueue: BakeTask[];
  startBaking: (taskId: string, durationMinutes?: number) => void;
  finishBaking: (taskId: string) => void;

  // Cash Sessions & Movements State
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

  // User Auth State
  currentUser: UserSession | null;
  loginUser: (role: 'admin' | 'cajero' | 'panadero' | 'dueño' | 'fuser' | 'superadmin', pin: string) => boolean;
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

  // Staff & Shifts
  employees: Employee[];
  shifts: Shift[];
  updateEmployeeSalary: (id: string, baseSalary: number, hourlyRate: number) => void;
  assignShift: (employeeId: string, day: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo', shiftType: 'morning' | 'afternoon' | 'night') => void;
  removeShift: (shiftId: string) => void;
  requestBakeTask: (productId: string, quantityNeeded: number) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      products: [
        { id: '11111111-1111-1111-1111-111111111111', name: 'Medialunas', type: 'UNIT', price: 500, currentStock: 120, minDailyStock: 50, optimalBatchSize: 60, barcode: '779123456001' },
        { id: '22222222-2222-2222-2222-222222222222', name: 'Pan Francés', type: 'WEIGHT', price: 2000, currentStock: 15, minDailyStock: 10, optimalBatchSize: 10, barcode: '779123456002' },
        { id: '33333333-3333-3333-3333-333333333333', name: 'Pan Mignon', type: 'WEIGHT', price: 2500, currentStock: 8, minDailyStock: 5, optimalBatchSize: 5, barcode: '779123456003' },
        { id: '44444444-4444-4444-4444-444444444444', name: 'Facturas Surtidas', type: 'UNIT', price: 600, currentStock: 80, minDailyStock: 40, optimalBatchSize: 48, barcode: '779123456004' },
      ],
      
      employees: [
        { id: 'emp-1', name: 'Juan Perez', email: 'juan.perez@criollito.com', role: 'cajero', baseSalary: 180000, hourlyRate: 1200 },
        { id: 'emp-2', name: 'Carlos Horno', email: 'carlos.horno@criollito.com', role: 'panadero', baseSalary: 220000, hourlyRate: 1500 },
        { id: 'emp-3', name: 'Pedro Panadero', email: 'pedro@criollito.com', role: 'panadero', baseSalary: 210000, hourlyRate: 1450 },
        { id: 'emp-4', name: 'María Repostera', email: 'maria@criollito.com', role: 'panadero', baseSalary: 200000, hourlyRate: 1400 },
        { id: 'emp-5', name: 'Juan Cajero', email: 'juan@criollito.com', role: 'cajero', baseSalary: 175000, hourlyRate: 1150 }
      ],
      shifts: [
        { id: 's-1', employeeId: 'emp-1', day: 'Lunes', shiftType: 'morning' },
        { id: 's-2', employeeId: 'emp-2', day: 'Lunes', shiftType: 'afternoon' },
        { id: 's-3', employeeId: 'emp-3', day: 'Martes', shiftType: 'morning' },
        { id: 's-4', employeeId: 'emp-5', day: 'Miércoles', shiftType: 'morning' },
        { id: 's-5', employeeId: 'emp-4', day: 'Jueves', shiftType: 'afternoon' },
        { id: 's-6', employeeId: 'emp-2', day: 'Viernes', shiftType: 'morning' },
        { id: 's-7', employeeId: 'emp-1', day: 'Sábado', shiftType: 'morning' },
      ],
      
      alerts: [],
      addAlert: (alertData) => set((state) => ({
        alerts: [
          {
            ...alertData,
            id: crypto.randomUUID(),
            isRead: false,
            createdAt: new Date(),
          },
          ...state.alerts,
        ]
      })),
      markAsRead: (id) => set((state) => ({
        alerts: state.alerts.map(alert => 
          alert.id === id ? { ...alert, isRead: true } : alert
        )
      })),
      clearAlerts: () => set({ alerts: [] }),

      bakeQueue: [],
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

        const updatedProducts = state.products.map(p => 
          p.id === task.productId ? { ...p, currentStock: p.currentStock + task.quantityNeeded } : p
        );

        return {
          products: updatedProducts,
          bakeQueue: state.bakeQueue.filter(t => t.id !== taskId),
          alerts: [
            {
              id: crypto.randomUUID(),
              type: 'SYSTEM',
              message: `Horneado listo: ${task.productName} (${task.quantityNeeded} ${state.products.find(p=>p.id===task.productId)?.type === 'WEIGHT' ? 'kg' : 'uds'})`,
              isRead: false,
              createdAt: new Date(),
            },
            ...state.alerts
          ]
        };
      }),

      // Cash Sessions & Movements Actions
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

      // User Auth
      currentUser: null,
      loginUser: (role, pin) => {
        if (pin === '1234') {
          const names: Record<string, string> = {
            admin: 'Administrador',
            cajero: 'Juan Cajero',
            panadero: 'Pedro Panadero',
            dueño: 'Dueño Negocio',
            fuser: 'Fuser',
            superadmin: 'Super Administrador'
          };
          set({ currentUser: { role, name: names[role] || role.toUpperCase() } });
          return true;
        }
        return false;
      },
      logoutUser: () => {
        set({ currentUser: null, currentSession: null });
      },

      processSale: async (items, paymentMethod, customerDoc, comprobanteTipo, caeData) => {
        const session = get().currentSession;
        
        // 1. Obtener los detalles completos de los items para descontar stock localmente
        const saleItemsInput = items.map(item => {
          const prod = get().products.find(p => p.id === item.productId);
          return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: prod ? prod.price : 0,
          };
        });

        // 2. Modificar el stock de forma local en el cliente (Optimistic update)
        const newAlerts = [...get().alerts];
        const newBakeQueue = [...get().bakeQueue];
        
        const updatedProducts = get().products.map(product => {
          const saleItem = items.find(i => i.productId === product.id);
          if (!saleItem) return product;

          const newStock = product.currentStock - saleItem.quantity;
          
          if (newStock < product.minDailyStock) {
            newAlerts.unshift({
              id: crypto.randomUUID(),
              type: 'LOW_STOCK',
              message: `Stock Crítico: ${product.name} bajó a ${newStock}`,
              isRead: false,
              createdAt: new Date(),
            });

            const inQueue = newBakeQueue.some(t => t.productId === product.id);
            if (!inQueue) {
              newBakeQueue.push({
                id: crypto.randomUUID(),
                productId: product.id,
                productName: product.name,
                quantityNeeded: product.optimalBatchSize,
                status: 'PENDING',
                requestedAt: new Date(),
              });
            }
          }

          return { ...product, currentStock: newStock };
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
          alerts: newAlerts,
          bakeQueue: newBakeQueue,
          salesHistory: [newSaleObj, ...get().salesHistory],
        });

        // 3. Procesamiento en el Servidor (Online vs Offline)
        const isOnline = typeof window !== 'undefined' ? navigator.onLine : true;

        if (!isOnline) {
          // Si estamos offline, agregamos la venta a la cola pendiente
          console.warn('[Offline Mode] Venta guardada localmente en la cola.');
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
          // Si estamos online, ejecutamos la venta directamente en la base de datos
          const tenantId = session?.tenantId || 'default-tenant-id';
          const cashierId = session?.cashierId || 'default-cashier-id';

          try {
            const res = await procesarVenta(
              tenantId,
              cashierId,
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
            console.error('Error al procesar la venta en el servidor, guardando en cola offline:', err);
            // Fallback en caso de error de conexión/servidor
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
        const tenantId = session?.tenantId || 'default-tenant-id';
        const cashierId = session?.cashierId || 'default-cashier-id';

        console.log(`[Sync] Sincronizando ${pending.length} ventas offline...`);

        // Procesar cada venta en orden cronológico
        for (const sale of pending) {
          try {
            const res = await procesarVenta(
              tenantId,
              cashierId,
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
        console.log('[Sync] Sincronización de ventas completada con éxito.');
      },

      updateEmployeeSalary: (id, baseSalary, hourlyRate) => set((state) => ({
        employees: state.employees.map(emp => 
          emp.id === id ? { ...emp, baseSalary, hourlyRate } : emp
        )
      })),
      
      assignShift: (employeeId, day, shiftType) => set((state) => {
        const exists = state.shifts.some(s => s.employeeId === employeeId && s.day === day && s.shiftType === shiftType);
        if (exists) return state;
        const newShift = {
          id: crypto.randomUUID(),
          employeeId,
          day,
          shiftType
        };
        return {
          shifts: [...state.shifts, newShift]
        };
      }),

      removeShift: (shiftId) => set((state) => ({
        shifts: state.shifts.filter(s => s.id !== shiftId)
      })),

      requestBakeTask: (productId, quantityNeeded) => set((state) => {
        const prod = state.products.find(p => p.id === productId);
        if (!prod) return state;
        const inQueue = state.bakeQueue.some(t => t.productId === productId && t.status === 'PENDING');
        if (inQueue) return state;
        const newTask = {
          id: crypto.randomUUID(),
          productId,
          productName: prod.name,
          quantityNeeded,
          status: 'PENDING' as const,
          requestedAt: new Date()
        };
        return {
          bakeQueue: [...state.bakeQueue, newTask],
          alerts: [
            {
              id: crypto.randomUUID(),
              type: 'SYSTEM' as const,
              message: `Solicitud manual de horneado: ${prod.name} (${quantityNeeded} ${prod.type === 'WEIGHT' ? 'kg' : 'uds'})`,
              isRead: false,
              createdAt: new Date(),
            },
            ...state.alerts
          ]
        };
      })
    }),
    {
      name: 'criollito-store-persisted',
      storage: createJSONStorage(() => customStorage),
      partialize: (state) => ({
        products: state.products,
        alerts: state.alerts,
        bakeQueue: state.bakeQueue,
        currentSession: state.currentSession,
        pendingSales: state.pendingSales,
        currentUser: state.currentUser,
        employees: state.employees,
        shifts: state.shifts,
      }),
    }
  )
);
