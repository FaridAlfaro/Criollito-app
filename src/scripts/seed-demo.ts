/**
 * SCRIPT DE SEED PARA DEMO (Estrictamente Idempotente)
 * ====================================================
 * Crea o actualiza el SUPER_ADMIN, Tenant, Sucursal, Usuarios operativos (Admin, Cajero, Panadero, Dueño)
 * y Catálogo base de Productos y Recetas con paridad completa de esquema.
 *
 * Ejecutar con:
 *   npm run db:seed
 *   o bien:
 *   npx tsx src/scripts/seed-demo.ts
 */

import 'dotenv/config';
import { db } from '../db';
import { 
  tenants, 
  users, 
  branches, 
  products as productsTable, 
  employees as employeesTable,
  recipes as recipesTable 
} from '../db/schema';
import { createHash } from 'crypto';
import { eq, and } from 'drizzle-orm';

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

async function seed() {
  console.log('\n🌱 Iniciando seed determinista e idempotente...\n');

  // 1. TENANT BASE
  let baseTenant = await db.query.tenants.findFirst();

  if (!baseTenant) {
    [baseTenant] = await db.insert(tenants).values({
      name: 'Criollito Demo',
      businessName: 'Panadería El Criollito SRL',
      cuit: '30-99999999-0',
      puntoVenta: 1,
      plan: 14,
    }).returning();
    console.log(`  ✅ Tenant creado: ${baseTenant.name} (${baseTenant.id})`);
  } else {
    console.log(`  ℹ️  Tenant existente: ${baseTenant.name} (${baseTenant.id})`);
  }

  // 2. SUCURSAL PRINCIPAL
  let mainBranch = await db.query.branches.findFirst({
    where: (b, { eq }) => eq(b.tenantId, baseTenant!.id),
  });

  if (!mainBranch) {
    [mainBranch] = await db.insert(branches).values({
      tenantId: baseTenant.id,
      name: 'Sucursal Central',
      address: 'Av. Corrientes 1234, CABA',
      isActive: true,
    }).returning();
    console.log(`  ✅ Sucursal creada: ${mainBranch.name} (${mainBranch.id})`);
  } else {
    console.log(`  ℹ️  Sucursal existente: ${mainBranch.name} (${mainBranch.id})`);
  }

  // Helper para upsert de usuario garantizando contraseñas y vinculaciones
  async function upsertUser(
    email: string,
    plainPassword: string,
    name: string,
    role: 'SUPER_ADMIN' | 'ADMIN' | 'CASHIER' | 'BAKER' | 'SUPERVISOR',
    branchId: string | null
  ) {
    const existing = await db.query.users.findFirst({
      where: (u, { and, eq }) => and(eq(u.email, email), eq(u.tenantId, baseTenant!.id)),
    });

    const passwordHash = hashPassword(plainPassword);

    if (!existing) {
      const [created] = await db.insert(users).values({
        tenantId: baseTenant!.id,
        branchId,
        name,
        email,
        passwordHash,
        role,
        isActive: true,
      }).returning();
      console.log(`  ✅ Usuario ${role} creado: ${email} (Sucursal: ${branchId ? mainBranch!.name : 'Global'})`);
      return created;
    } else {
      // Actualizar para asegurar paridad de contraseña, rol y sucursal
      const [updated] = await db.update(users).set({
        name,
        passwordHash,
        role,
        branchId: branchId || existing.branchId,
        isActive: true,
        updatedAt: new Date(),
      }).where(eq(users.id, existing.id)).returning();
      console.log(`  ℹ️  Usuario ${role} actualizado/verificado: ${email}`);
      return updated;
    }
  }

  // 3. USUARIOS OPERATIVOS REQUERIDOS
  const superAdminEmail = 'superadmin@criollito.com';
  const superAdmin = await upsertUser(
    superAdminEmail,
    'Admin1234!',
    'Super Administrador Global',
    'SUPER_ADMIN',
    mainBranch.id
  );

  const adminEmail = 'admin@criollito.com';
  const adminUser = await upsertUser(
    adminEmail,
    'Admin1234!',
    'Administrador de Sucursal',
    'ADMIN',
    mainBranch.id
  );

  const cashierEmail = 'cajero@criollito.com';
  const cashierUser = await upsertUser(
    cashierEmail,
    'Cajero1234!',
    'Cajero Principal',
    'CASHIER',
    mainBranch.id
  );

  const bakerEmail = 'panadero@criollito.com';
  const bakerUser = await upsertUser(
    bakerEmail,
    'Baker1234!',
    'Maestro Panadero',
    'BAKER',
    mainBranch.id
  );

  const supervisorEmail = 'dueno@criollito.com';
  const supervisorUser = await upsertUser(
    supervisorEmail,
    'Dueno1234!',
    'Dueño / Supervisor',
    'SUPERVISOR',
    mainBranch.id
  );

  // 4. REGISTROS DE EMPLEADOS (Reloj de fichadas y turnos)
  const employeeConfigs = [
    { user: cashierUser, name: 'Cajero Principal', email: cashierEmail, role: 'CASHIER' as const, baseSalary: '450000', hourlyRate: '2800' },
    { user: bakerUser, name: 'Maestro Panadero', email: bakerEmail, role: 'BAKER' as const, baseSalary: '550000', hourlyRate: '3400' },
    { user: adminUser, name: 'Administrador de Sucursal', email: adminEmail, role: 'ADMIN' as const, baseSalary: '700000', hourlyRate: '4200' },
  ];

  for (const emp of employeeConfigs) {
    const existingEmp = await db.query.employees.findFirst({
      where: (e, { and, eq }) => and(eq(e.tenantId, baseTenant!.id), eq(e.userId, emp.user.id)),
    });

    if (!existingEmp) {
      await db.insert(employeesTable).values({
        tenantId: baseTenant!.id,
        branchId: mainBranch.id,
        userId: emp.user.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        baseSalary: emp.baseSalary,
        hourlyRate: emp.hourlyRate,
        isActive: true,
      });
      console.log(`  ✅ Empleado creado en nómina: ${emp.name} (${emp.role})`);
    } else {
      await db.update(employeesTable).set({
        branchId: mainBranch.id,
        baseSalary: emp.baseSalary,
        hourlyRate: emp.hourlyRate,
        isActive: true,
        updatedAt: new Date(),
      }).where(eq(employeesTable.id, existingEmp.id));
      console.log(`  ℹ️  Empleado sincronizado en nómina: ${emp.name}`);
    }
  }

  // 5. CATÁLOGO DE PRODUCTOS (Idempotente)
  const defaultProducts = [
    {
      name: 'Medialuna',
      description: 'Medialuna artesanal de manteca',
      type: 'UNIT' as const,
      category: 'FINISHED_PRODUCT' as const,
      price: '500.00',
      cost: '180.00',
      currentStock: '120.000',
      minDailyStock: '50.000',
      optimalBatchSize: '48.000',
      barcode: '200000100000',
    },
    {
      name: 'Pan Francés',
      description: 'Pan francés crocante por kilo',
      type: 'WEIGHT' as const,
      category: 'FINISHED_PRODUCT' as const,
      price: '3500.00',
      cost: '1200.00',
      currentStock: '45.000',
      minDailyStock: '15.000',
      optimalBatchSize: '10.000',
      barcode: '200000200000',
    },
    {
      name: 'Factura Surtida',
      description: 'Facturas surtidas de crema y dulce de leche',
      type: 'UNIT' as const,
      category: 'FINISHED_PRODUCT' as const,
      price: '800.00',
      cost: '290.00',
      currentStock: '80.000',
      minDailyStock: '30.000',
      optimalBatchSize: '48.000',
      barcode: '200000300000',
    },
  ];

  const seededProducts: (typeof productsTable.$inferSelect)[] = [];

  for (const prod of defaultProducts) {
    const existing = await db.query.products.findFirst({
      where: (p, { and, eq }) => and(eq(p.tenantId, baseTenant!.id), eq(p.name, prod.name)),
    });

    if (!existing) {
      const [created] = await db.insert(productsTable).values({
        tenantId: baseTenant!.id,
        branchId: mainBranch.id,
        name: prod.name,
        type: prod.type,
        category: prod.category,
        price: prod.price,
        cost: prod.cost,
        currentStock: prod.currentStock,
        minDailyStock: prod.minDailyStock,
        optimalBatchSize: prod.optimalBatchSize,
        barcode: prod.barcode,
      }).returning();
      seededProducts.push(created);
      console.log(`  ✅ Producto creado: ${prod.name} ($${prod.price})`);
    } else {
      seededProducts.push(existing);
      console.log(`  ℹ️  Producto existente: ${prod.name}`);
    }
  }

  // 6. RECETA DE PRODUCCIÓN BASE (KDS / Unidades por bandeja)
  const medialunaProd = seededProducts.find(p => p.name === 'Medialuna');
  if (medialunaProd) {
    const existingRecipe = await db.query.recipes.findFirst({
      where: (r, { and, eq }) => and(eq(r.tenantId, baseTenant!.id), eq(r.productId, medialunaProd.id)),
    });

    if (!existingRecipe) {
      await db.insert(recipesTable).values({
        tenantId: baseTenant.id,
        productId: medialunaProd.id,
        name: 'Receta Tradicional de Medialunas',
        yieldUnits: '48.000',
        unitsPerTray: 24,
        estimatedMinutes: 45,
        instructions: 'Amasado de hojaldre con manteca, 3 vueltas simples, reposo de 2 horas y horneado a 190°C.',
        isActive: true,
      });
      console.log(`  ✅ Receta base creada para Medialuna (24 unidades/bandeja)`);
    } else {
      console.log(`  ℹ️  Receta existente para Medialuna`);
    }
  }

  console.log('\n✅ Seed determinista completado exitosamente.\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  CREDENCIALES ACTIVAS VERIFICADAS:');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  🔑 Super Admin     : ${superAdminEmail}     / Admin1234!`);
  console.log(`  🔑 Admin Sucursal  : ${adminEmail}         / Admin1234!`);
  console.log(`  🔑 Cajero          : ${cashierEmail}       / Cajero1234!`);
  console.log(`  🔑 Maestro Panadero: ${bakerEmail}         / Baker1234!`);
  console.log(`  🔑 Dueño/Supervisor: ${supervisorEmail}   / Dueno1234!`);
  console.log('═══════════════════════════════════════════════════════\n');

  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Error fatal en seed:', err);
  process.exit(1);
});
