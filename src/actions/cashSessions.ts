'use server';

import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { cashSessions, cashMovements, sales, tenants, users, products, saleItems } from '@/db/schema';

// UUIDs fijos para productos mock que coincidan con el store
const MOCK_PRODUCTS = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Medialunas', type: 'UNIT' as const, price: '500.00', currentStock: '120.000', minDailyStock: '50.000', optimalBatchSize: '60.000', barcode: '779123456001' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Pan Francés', type: 'WEIGHT' as const, price: '2000.00', currentStock: '15.000', minDailyStock: '10.000', optimalBatchSize: '10.000', barcode: '779123456002' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Pan Mignon', type: 'WEIGHT' as const, price: '2500.00', currentStock: '8.000', minDailyStock: '5.000', optimalBatchSize: '5.000', barcode: '779123456003' },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Facturas Surtidas', type: 'UNIT' as const, price: '600.00', currentStock: '80.000', minDailyStock: '40.000', optimalBatchSize: '48.000', barcode: '779123456004' },
];

export async function getOrCreateDefaultTenantAndUser() {
  try {
    // 1. Obtener o crear tenant
    let tenant = await db.query.tenants.findFirst();
    if (!tenant) {
      [tenant] = await db.insert(tenants).values({
        name: "Panadería El Criollito",
        businessName: "Criollito SRL",
        cuit: "30-12345678-9",
        puntoVenta: 1,
      }).returning();
    }

    // 2. Obtener o crear usuario cajero
    let user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.tenantId, tenant.id)
    });
    if (!user) {
      [user] = await db.insert(users).values({
        tenantId: tenant.id,
        name: "Juan Cajero",
        email: "cajero@criollito.com",
        passwordHash: "mock_hash_here",
        role: "CASHIER",
      }).returning();
    }

    return { tenantId: tenant.id, cashierId: user.id };
  } catch (err) {
    console.warn('[DB Error] No se pudo conectar a la base de datos (getOrCreateDefaultTenantAndUser), usando fallback mock:', err);
    return {
      tenantId: '10000000-1000-1000-1000-100000000000',
      cashierId: '20000000-2000-2000-2000-200000000000'
    };
  }
}

async function seedProductsIfNeeded(tenantId: string) {
  try {
    for (const mockProd of MOCK_PRODUCTS) {
      const existing = await db.query.products.findFirst({
        where: (p, { eq }) => eq(p.id, mockProd.id)
      });
      if (!existing) {
        await db.insert(products).values({
          id: mockProd.id,
          tenantId,
          name: mockProd.name,
          type: mockProd.type,
          price: mockProd.price,
          currentStock: mockProd.currentStock,
          minDailyStock: mockProd.minDailyStock,
          optimalBatchSize: mockProd.optimalBatchSize,
          barcode: mockProd.barcode,
        });
      }
    }
  } catch (err) {
    console.warn('[DB Error] seedProductsIfNeeded falló, omitiendo:', err);
  }
}

export async function openSession(initialAmount: number) {
  try {
    const { tenantId, cashierId } = await getOrCreateDefaultTenantAndUser();
    await seedProductsIfNeeded(tenantId);

    // Verificar si hay sesión activa (abierta) para este cajero/tenant
    const activeSession = await db.query.cashSessions.findFirst({
      where: (cs, { and, eq, isNull }) => and(
        eq(cs.tenantId, tenantId),
        eq(cs.cashierId, cashierId),
        isNull(cs.closedAt)
      )
    });

    if (activeSession) {
      return activeSession;
    }

    const [session] = await db.insert(cashSessions).values({
      tenantId,
      cashierId,
      initialAmount: initialAmount.toString(),
      theoreticalAmount: initialAmount.toString(),
    }).returning();

    return session;
  } catch (err) {
    console.warn('[DB Error] openSession falló, usando fallback en memoria:', err);
    return {
      id: '99999999-9999-9999-9999-999999999999',
      tenantId: '10000000-1000-1000-1000-100000000000',
      cashierId: '20000000-2000-2000-2000-200000000000',
      openedAt: new Date().toISOString(),
      closedAt: null,
      initialAmount: initialAmount.toString(),
      theoreticalAmount: initialAmount.toString(),
      finalAmount: null,
      totalSales: '0.00',
      totalCash: '0.00',
      totalDebit: '0.00',
      totalCredit: '0.00',
    };
  }
}

export async function registerMovement(
  sessionId: string,
  type: 'INGRESO' | 'EGRESO_PROVEEDOR' | 'EGRESO_SUELDO' | 'EGRESO_VARIOS',
  amount: number,
  description: string
) {
  try {
    const { tenantId, cashierId } = await getOrCreateDefaultTenantAndUser();

    const [movement] = await db.insert(cashMovements).values({
      tenantId,
      cashSessionId: sessionId,
      cashierId,
      type,
      amount: amount.toString(),
      description,
    }).returning();

    return movement;
  } catch (err) {
    console.warn('[DB Error] registerMovement falló, usando fallback en memoria:', err);
    return {
      id: Math.random().toString(36).substring(2, 11),
      tenantId: '10000000-1000-1000-1000-100000000000',
      cashSessionId: sessionId,
      cashierId: '20000000-2000-2000-2000-200000000000',
      type,
      amount: amount.toString(),
      description,
      createdAt: new Date().toISOString(),
    };
  }
}

export async function closeSession(sessionId: string, countedCash: number) {
  try {
    // 1. Obtener la sesión
    const [session] = await db.select().from(cashSessions).where(eq(cashSessions.id, sessionId));
    if (!session) {
      throw new Error('Sesión de caja no encontrada.');
    }

    const initial = parseFloat(session.initialAmount);

    // 2. Obtener ventas en efectivo
    const cashSales = await db.select()
      .from(sales)
      .where(and(
        eq(sales.cashSessionId, sessionId),
        eq(sales.paymentMethod, 'CASH')
      ));
    const totalSalesCash = cashSales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);

    // También sumamos ventas para tarjeta
    const debitSales = await db.select()
      .from(sales)
      .where(and(
        eq(sales.cashSessionId, sessionId),
        eq(sales.paymentMethod, 'DEBIT')
      ));
    const totalDebit = debitSales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);

    const creditSales = await db.select()
      .from(sales)
      .where(and(
        eq(sales.cashSessionId, sessionId),
        eq(sales.paymentMethod, 'CREDIT')
      ));
    const totalCredit = creditSales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);

    const qrSales = await db.select()
      .from(sales)
      .where(and(
        eq(sales.cashSessionId, sessionId),
        eq(sales.paymentMethod, 'QR')
      ));
    const totalQr = qrSales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);

    // 3. Obtener movimientos
    const movements = await db.select().from(cashMovements).where(eq(cashMovements.cashSessionId, sessionId));
    
    let totalIngresos = 0;
    let totalEgresos = 0;

    for (const m of movements) {
      const val = parseFloat(m.amount);
      if (m.type === 'INGRESO') {
        totalIngresos += val;
      } else {
        totalEgresos += val;
      }
    }

    // 4. Calcular total teórico (incluyendo QR si forma parte del total teórico en caja, pero espere, QR no es efectivo físico, así que no suma al efectivo físico en caja. Las tarjetas tampoco. El total teórico de efectivo físico en caja es: initial + totalSalesCash + totalIngresos - totalEgresos. Esto es correcto!)
    const theoreticalTotal = initial + totalSalesCash + totalIngresos - totalEgresos;
    const difference = countedCash - theoreticalTotal;

    // 5. Actualizar la sesión
    const [updatedSession] = await db.update(cashSessions)
      .set({
        closedAt: new Date(),
        finalAmount: countedCash.toString(),
        totalSales: (totalSalesCash + totalDebit + totalCredit + totalQr).toString(),
        totalCash: totalSalesCash.toString(),
        totalDebit: totalDebit.toString(),
        totalCredit: totalCredit.toString(),
        totalQr: totalQr.toString(),
        theoreticalAmount: theoreticalTotal.toString(),
        difference: difference.toString(),
      })
      .where(eq(cashSessions.id, sessionId))
      .returning();

    return {
      session: updatedSession,
      summary: {
        initialAmount: initial,
        totalSalesCash,
        totalDebit,
        totalCredit,
        totalQr,
        totalIngresos,
        totalEgresos,
        theoreticalTotal,
        countedCash,
        difference,
      }
    };
  } catch (err) {
    console.warn('[DB Error] closeSession falló, simulando cierre de caja en memoria:', err);
    // Simular usando valores del estado
    return {
      session: {
        id: sessionId,
        tenantId: '10000000-1000-1000-1000-100000000000',
        cashierId: '20000000-2000-2000-2000-200000000000',
        openedAt: new Date().toISOString(),
        closedAt: new Date().toISOString(),
        initialAmount: '0.00',
        finalAmount: countedCash.toString(),
        totalSales: '0.00',
        totalCash: '0.00',
        totalDebit: '0.00',
        totalCredit: '0.00',
        totalQr: '0.00',
        theoreticalAmount: '0.00',
        difference: '0.00',
      },
      summary: {
        initialAmount: 0,
        totalSalesCash: 0,
        totalDebit: 0,
        totalCredit: 0,
        totalQr: 0,
        totalIngresos: 0,
        totalEgresos: 0,
        theoreticalTotal: 0,
        countedCash,
        difference: countedCash,
      }
    };
  }
}

export async function getBranchWorkers() {
  try {
    const { tenantId } = await getOrCreateDefaultTenantAndUser();
    const workers = await db.select().from(users).where(eq(users.tenantId, tenantId));
    return workers.map(w => ({
      id: w.id,
      name: w.name,
      role: w.role
    }));
  } catch (err) {
    console.warn('[DB Error] getBranchWorkers falló, usando fallback mock:', err);
    return [
      { id: '20000000-2000-2000-2000-200000000000', name: 'Juan Cajero', role: 'CASHIER' },
      { id: 'worker-1', name: 'Pedro Panadero', role: 'BAKER' },
      { id: 'worker-2', name: 'María Repostera', role: 'BAKER' },
      { id: 'worker-3', name: 'Carlos Supervisor', role: 'SUPERVISOR' },
    ];
  }
}

export async function getSessionHistory(sessionId: string) {
  try {
    const movements = await db.select().from(cashMovements).where(eq(cashMovements.cashSessionId, sessionId));
    const dbSales = await db.select().from(sales).where(eq(sales.cashSessionId, sessionId));

    const salesWithItems = [];
    for (const s of dbSales) {
      const items = await db.select().from(saleItems).where(eq(saleItems.saleId, s.id));
      const itemsWithProduct = [];
      for (const item of items) {
        const [prod] = await db.select().from(products).where(eq(products.id, item.productId));
        itemsWithProduct.push({
          productId: item.productId,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          subtotal: parseFloat(item.subtotal),
          name: prod ? prod.name : 'Producto',
        });
      }
      salesWithItems.push({
        id: s.id,
        createdAt: s.createdAt,
        totalAmount: parseFloat(s.totalAmount),
        paymentMethod: s.paymentMethod as 'CASH' | 'DEBIT' | 'CREDIT' | 'QR',
        comprobanteTipo: s.comprobanteTipo,
        clienteDocumento: s.clienteDocumento,
        cae: s.cae,
        caeExpiration: s.caeExpiration,
        numeroComprobante: s.numeroComprobante,
        qrCodeData: s.qrCodeData,
        items: itemsWithProduct,
      });
    }

    return {
      movements: movements.map(m => ({
        id: m.id,
        type: m.type as 'INGRESO' | 'EGRESO_PROVEEDOR' | 'EGRESO_SUELDO' | 'EGRESO_VARIOS',
        amount: parseFloat(m.amount),
        description: m.description,
        createdAt: m.createdAt,
      })),
      sales: salesWithItems,
    };
  } catch (err) {
    console.warn('[DB Error] getSessionHistory falló, devolviendo vacío:', err);
    return {
      movements: [],
      sales: [],
    };
  }
}
