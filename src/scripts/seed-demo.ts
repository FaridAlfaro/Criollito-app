/**
 * SCRIPT DE SEED PARA DEMO
 * ========================
 * Crea el primer SUPER_ADMIN y el primer Tenant de prueba.
 * Ejecutar con: npm run db:seed
 *               o bien: npx dotenv-cli -e .env -- npx tsx src/scripts/seed-demo.ts
 *
 * Prerrequisitos:
 *   - Variables de entorno configuradas (.env con DATABASE_URL)
 *   - DB migrada (drizzle-kit migrate)
 */

// Cargar .env automáticamente
import 'dotenv/config';

import { db } from '../db';
import { tenants, users, branches, products as productsTable } from '../db/schema';
import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

async function seed() {
  console.log('\n🌱 Iniciando seed de demo...\n');

  // 1. SUPER ADMIN GLOBAL (SaaS)
  const superAdminEmail = 'superadmin@criollito.com';
  const superAdminPassword = 'Admin1234!';

  let superAdmin = await db.query.users.findFirst({
    where: (u, { and, eq }) => and(eq(u.email, superAdminEmail), eq(u.role, 'SUPER_ADMIN')),
  });

  // Buscar o crear un tenant base para el super admin
  let baseTenant = await db.query.tenants.findFirst();

  if (!baseTenant) {
    [baseTenant] = await db.insert(tenants).values({
      name: 'Criollito Demo',
      businessName: 'Panadería El Criollito SRL',
      cuit: '30-99999999-0',
      puntoVenta: 1,
      plan: 15000,
    }).returning();
    console.log(`  ✅ Tenant creado: ${baseTenant.name} (${baseTenant.id})`);
  } else {
    console.log(`  ℹ️  Tenant existente: ${baseTenant.name} (${baseTenant.id})`);
  }

  if (!superAdmin) {
    [superAdmin] = await db.insert(users).values({
      tenantId: baseTenant.id,
      name: 'Super Administrador',
      email: superAdminEmail,
      passwordHash: hashPassword(superAdminPassword),
      role: 'SUPER_ADMIN',
      isActive: true,
    }).returning();
    console.log(`  ✅ SUPER_ADMIN creado: ${superAdminEmail} / ${superAdminPassword}`);
  } else {
    console.log(`  ℹ️  SUPER_ADMIN ya existe: ${superAdminEmail}`);
  }

  // 2. ADMIN del tenant
  const adminEmail = 'admin@criollito.com';
  const adminPassword = 'Admin1234!';

  let adminUser = await db.query.users.findFirst({
    where: (u, { and, eq }) => and(eq(u.email, adminEmail), eq(u.tenantId, baseTenant!.id)),
  });

  if (!adminUser) {
    [adminUser] = await db.insert(users).values({
      tenantId: baseTenant.id,
      name: 'Administrador Local',
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      role: 'ADMIN',
      isActive: true,
    }).returning();
    console.log(`  ✅ ADMIN creado: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log(`  ℹ️  ADMIN ya existe: ${adminEmail}`);
  }

  // 3. SUCURSAL PRINCIPAL
  let mainBranch = await db.query.branches.findFirst({
    where: (b, { eq }) => eq(b.tenantId, baseTenant!.id),
  });

  if (!mainBranch) {
    [mainBranch] = await db.insert(branches).values({
      tenantId: baseTenant.id,
      name: 'Sucursal Principal',
      address: 'Av. Principal 1234',
      isActive: true,
    }).returning();
    console.log(`  ✅ Sucursal creada: ${mainBranch.name} (${mainBranch.id})`);
  } else {
    console.log(`  ℹ️  Sucursal ya existe: ${mainBranch.name} (${mainBranch.id})`);
  }

  // 4. CAJERO asignado a la sucursal
  const cashierEmail = 'cajero@criollito.com';
  const cashierPassword = 'Cajero1234!';

  let cashierUser = await db.query.users.findFirst({
    where: (u, { and, eq }) => and(eq(u.email, cashierEmail), eq(u.tenantId, baseTenant!.id)),
  });

  if (!cashierUser) {
    [cashierUser] = await db.insert(users).values({
      tenantId: baseTenant.id,
      branchId: mainBranch.id,
      name: 'Cajero Demo',
      email: cashierEmail,
      passwordHash: hashPassword(cashierPassword),
      role: 'CASHIER',
      isActive: true,
    }).returning();
    console.log(`  ✅ CAJERO creado: ${cashierEmail} / ${cashierPassword} → Sucursal: ${mainBranch.name}`);
  } else {
    console.log(`  ℹ️  CAJERO ya existe: ${cashierEmail}`);
  }

  // 5. PANADERO asignado a la sucursal
  const bakerEmail = 'panadero@criollito.com';
  const bakerPassword = 'Baker1234!';

  let bakerUser = await db.query.users.findFirst({
    where: (u, { and, eq }) => and(eq(u.email, bakerEmail), eq(u.tenantId, baseTenant!.id)),
  });

  if (!bakerUser) {
    [bakerUser] = await db.insert(users).values({
      tenantId: baseTenant.id,
      branchId: mainBranch.id,
      name: 'Panadero Demo',
      email: bakerEmail,
      passwordHash: hashPassword(bakerPassword),
      role: 'BAKER',
      isActive: true,
    }).returning();
    console.log(`  ✅ BAKER creado: ${bakerEmail} / ${bakerPassword} → Sucursal: ${mainBranch.name}`);
  } else {
    console.log(`  ℹ️  BAKER ya existe: ${bakerEmail}`);
  }

  // 6. DUEÑO / SUPERVISOR
  const supervisorEmail = 'dueno@criollito.com';
  const supervisorPassword = 'Dueno1234!';

  let supervisorUser = await db.query.users.findFirst({
    where: (u, { and, eq }) => and(eq(u.email, supervisorEmail), eq(u.tenantId, baseTenant!.id)),
  });

  if (!supervisorUser) {
    [supervisorUser] = await db.insert(users).values({
      tenantId: baseTenant.id,
      name: 'Dueño Demo',
      email: supervisorEmail,
      passwordHash: hashPassword(supervisorPassword),
      role: 'SUPERVISOR',
      isActive: true,
    }).returning();
    console.log(`  ✅ SUPERVISOR/DUEÑO creado: ${supervisorEmail} / ${supervisorPassword}`);
  } else {
    console.log(`  ℹ️  SUPERVISOR ya existe: ${supervisorEmail}`);
  }

  // 7. PRODUCTOS DE EJEMPLO
  const existingProducts = await db.select().from(productsTable).where(eq(productsTable.tenantId, baseTenant.id));

  if (existingProducts.length === 0) {
    await db.insert(productsTable).values([
      {
        tenantId: baseTenant.id,
        branchId: mainBranch.id,
        name: 'Medialuna',
        description: 'Medialuna de manteca',
        type: 'UNIT' as const,
        price: '500',
        currentStock: 0,
        minDailyStock: 50,
        optimalBatchSize: 48,
        isActive: true,
      },
      {
        tenantId: baseTenant.id,
        branchId: mainBranch.id,
        name: 'Pan Francés',
        description: 'Pan francés por kg',
        type: 'WEIGHT' as const,
        price: '3500',
        currentStock: 0,
        minDailyStock: 10,
        optimalBatchSize: 5,
        isActive: true,
      },
      {
        tenantId: baseTenant.id,
        branchId: mainBranch.id,
        name: 'Factura Surtida',
        description: 'Factura surtida (unidad)',
        type: 'UNIT' as const,
        price: '800',
        currentStock: 0,
        minDailyStock: 30,
        optimalBatchSize: 48,
        isActive: true,
      },
    ]);
    console.log(`  ✅ 3 productos de ejemplo creados`);
  } else {
    console.log(`  ℹ️  Ya existen ${existingProducts.length} productos`);
  }

  console.log('\n✅ Seed completado exitosamente.\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  CREDENCIALES DE ACCESO AL DEMO:');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  🔑 Super Admin    : ${superAdminEmail}     / ${superAdminPassword}`);
  console.log(`  🔑 Admin Local    : ${adminEmail}         / ${adminPassword}`);
  console.log(`  🔑 Cajero         : ${cashierEmail}       / ${cashierPassword}`);
  console.log(`  🔑 Panadero       : ${bakerEmail}         / ${bakerPassword}`);
  console.log(`  🔑 Dueño/Supervisor: ${supervisorEmail}   / ${supervisorPassword}`);
  console.log('═══════════════════════════════════════════════════════\n');

  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});
