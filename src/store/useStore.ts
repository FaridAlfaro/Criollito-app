import { create } from 'zustand';

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
  requestedAt: Date;
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
  startBaking: (taskId: string) => void;
  finishBaking: (taskId: string) => void;

  // Global Actions
  processSale: (items: { productId: string, quantity: number }[], customerDoc?: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  products: [
    { id: '1', name: 'Medialunas', type: 'UNIT', price: 500, currentStock: 120, minDailyStock: 50, optimalBatchSize: 60, barcode: '779123456001' },
    { id: '2', name: 'Pan Francés', type: 'WEIGHT', price: 2000, currentStock: 15, minDailyStock: 10, optimalBatchSize: 10, barcode: '779123456002' },
    { id: '3', name: 'Pan Mignon', type: 'WEIGHT', price: 2500, currentStock: 8, minDailyStock: 5, optimalBatchSize: 5, barcode: '779123456003' },
    { id: '4', name: 'Facturas Surtidas', type: 'UNIT', price: 600, currentStock: 80, minDailyStock: 40, optimalBatchSize: 48, barcode: '779123456004' },
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
  startBaking: (taskId) => set((state) => ({
    bakeQueue: state.bakeQueue.map(task => 
      task.id === taskId ? { ...task, status: 'BAKING' as const } : task
    )
  })),
  finishBaking: (taskId) => set((state) => {
    const task = state.bakeQueue.find(t => t.id === taskId);
    if (!task) return state;

    // Aumentar stock del producto al finalizar horneado
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

  processSale: (items) => set((state) => {
    let newAlerts = [...state.alerts];
    let newBakeQueue = [...state.bakeQueue];
    
    const updatedProducts = state.products.map(product => {
      const saleItem = items.find(i => i.productId === product.id);
      if (!saleItem) return product;

      const newStock = product.currentStock - saleItem.quantity;
      
      // Si el nuevo stock baja del minimo, generar alerta y tarea si no existe
      if (newStock < product.minDailyStock) {
        newAlerts.unshift({
          id: crypto.randomUUID(),
          type: 'LOW_STOCK',
          message: `Stock Crítico: ${product.name} bajó a ${newStock}`,
          isRead: false,
          createdAt: new Date(),
        });

        // Verificar si ya está en la cola
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

    return {
      products: updatedProducts,
      alerts: newAlerts,
      bakeQueue: newBakeQueue
    };
  })
}));
