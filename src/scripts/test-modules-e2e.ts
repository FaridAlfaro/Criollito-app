/**
 * E2E MODULE INTEGRATION TEST RUNNER
 * ==================================
 * Valida de forma secuencial los 5 subdominios de Criollito SaaS:
 * 1. Identity & Control Horario (PIN, Debounce, API Keys)
 * 2. Kitchen & BOM (Recetas, Deducción Atómica, KDS)
 * 3. Sales & POS (Sesión de Caja, Idempotencia X-Idempotency-Key)
 * 4. Telemetry & Edge CV (Ingesta YOLO, Alertas automáticas)
 *
 * Ejecutar con: npx tsx src/scripts/test-modules-e2e.ts
 */

import 'dotenv/config';
import { db } from '../db';
import { 
  tenants, 
  branches, 
  users, 
  products, 
  employees, 
  apiKeys, 
  alerts, 
  telemetryEvents, 
  recipes, 
  recipeIngredients, 
  bakeQueue, 
  sales, 
  cashSessions 
} from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { createHash } from 'crypto';

// Casos de uso de Identity
import { 
  recordTimeClockUseCase, 
  validateApiKeyUseCase, 
  manageEmployeesUseCase,
  pinHasher,
  apiKeyRepository
} from '../modules/identity';

// Casos de uso de Kitchen
import { 
  createRecipeUseCase, 
  queueBakeOrderUseCase, 
  completeBakeOrderUseCase,
  recipeRepository,
  bakeQueueRepository
} from '../modules/kitchen';

// Casos de uso de Sales
import { 
  openCashSessionUseCase, 
  processSaleUseCase, 
  closeCashSessionUseCase,
  salesRepository
} from '../modules/sales';

// Casos de uso de Telemetry
import { 
  ingestTelemetryUseCase, 
  telemetryRepository 
} from '../modules/telemetry';

import { ConflictError } from '../modules/shared/domain/errors';

// ANSI Colors para consola
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ${GREEN}✓ [PASS]${RESET} ${testName}`);
    passedTests++;
  } else {
    console.error(`  ${RED}✗ [FAIL]${RESET} ${testName}`);
    if (detail) console.error(`    ${RED}Detalle:${RESET} ${detail}`);
    failedTests++;
  }
}

async function runTestSuite() {
  console.log(`\n${BOLD}${CYAN}====================================================${RESET}`);
  console.log(`${BOLD}${CYAN} 🧪 PROTOCOLO DE CERTIFICACIÓN E2E DE SUBDOMINIOS  ${RESET}`);
  console.log(`${BOLD}${CYAN}====================================================${RESET}\n`);

  const startTime = Date.now();

  // ==========================================
  // 0. PREPARACIÓN DE TENANT Y SUCURSAL BASE
  // ==========================================
  console.log(`${BOLD}${BLUE}[0/4] Preparando contexto Tenant & Branch...${RESET}`);

  let tenant = await db.query.tenants.findFirst();
  if (!tenant) {
    [tenant] = await db.insert(tenants).values({
      name: 'QA Test Bakery',
      businessName: 'QA Panaderia SRL',
      cuit: '30-11111111-9',
      puntoVenta: 1,
      plan: 14,
    }).returning();
  }

  let branch = await db.query.branches.findFirst({
    where: (b, { eq }) => eq(b.tenantId, tenant!.id),
  });
  if (!branch) {
    [branch] = await db.insert(branches).values({
      tenantId: tenant.id,
      name: 'Sucursal Central QA',
      address: 'Calle Falsa 123',
      isActive: true,
    }).returning();
  }

  let user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.tenantId, tenant!.id),
  });
  if (!user) {
    [user] = await db.insert(users).values({
      tenantId: tenant.id,
      branchId: branch.id,
      name: 'QA Admin Tester',
      email: 'qa.admin@criollito.com',
      passwordHash: 'dummy-hash',
      role: 'ADMIN',
      isActive: true,
    }).returning();
  }

  const tenantContext = {
    tenantId: tenant.id,
    branchId: branch.id,
    userId: user.id,
    role: user.role,
    name: user.name,
  };

  console.log(`  Tenant: ${tenant.name} (${tenant.id})`);
  console.log(`  Branch: ${branch.name} (${branch.id})`);
  console.log(`  User  : ${user.name} (${user.id})\n`);

  // ==========================================
  // 1. MÓDULO IDENTITY (PIN, Debounce, API Keys)
  // ==========================================
  console.log(`${BOLD}${BLUE}[1/4] Testeando Módulo IDENTITY & Fichado por PIN...${RESET}`);

  // Empleado fresco con PIN para cada ejecución de test suite
  const testPin = Math.floor(1000 + Math.random() * 9000).toString();
  const hashedPin = await pinHasher.hashPin(testPin);

  const [testEmp] = await db.insert(employees).values({
    tenantId: tenant.id,
    branchId: branch.id,
    name: `Juan QA Empleado ${Date.now()}`,
    email: `qa.empleado.${Date.now()}@criollito.com`,
    role: 'CASHIER',
    pinHash: hashedPin,
    isActive: true,
  }).returning();

  // 1.1 Fichada exitosa CLOCK_IN
  const clockResult = await recordTimeClockUseCase.execute({
    pin: testPin,
    eventType: 'CLOCK_IN',
    branchId: branch.id,
    deviceInfo: 'POS-Tactil-QA-01',
    notes: 'Prueba de entrada matutina',
  }, tenantContext);

  assert(
    clockResult.success && clockResult.log.eventType === 'CLOCK_IN',
    'Fichada exitosa CLOCK_IN registrada con timestamp de servidor'
  );

  // 1.2 Debounce de 60 segundos (debe rechazar marca idéntica)
  let debounceRejected = false;
  try {
    await recordTimeClockUseCase.execute({
      pin: testPin,
      eventType: 'CLOCK_IN',
      branchId: branch.id,
      deviceInfo: 'POS-Tactil-QA-01',
    }, tenantContext);
  } catch (err) {
    if (err instanceof ConflictError) {
      debounceRejected = true;
    }
  }
  assert(debounceRejected, 'Debounce de 60 segundos previene doble marca accidental (ConflictError)');

  // 1.3 Validación de API Keys
  const rawApiKey = `crio_live_testkey_${Date.now()}`;
  const keyHash = createHash('sha256').update(rawApiKey).digest('hex');

  await apiKeyRepository.createApiKey({
    tenantId: tenant.id,
    branchId: branch.id,
    name: 'POS Terminal Edge QA',
    keyHash,
    keyPrefix: rawApiKey.slice(0, 10),
    role: 'CASHIER',
  });

  const validKeyResult = await validateApiKeyUseCase.execute(`Bearer ${rawApiKey}`);
  assert(
    validKeyResult.isValid && validKeyResult.tenantId === tenant.id,
    'Validación criptográfica SHA-256 de API Key para terminales Edge/POS'
  );

  const invalidKeyResult = await validateApiKeyUseCase.execute('Bearer crio_invalid_key_999');
  assert(!invalidKeyResult.isValid, 'Rechazo inmediato de API Key inválida');

  console.log('');

  // ==========================================
  // 2. MÓDULO KITCHEN & BOM (Recetas y Deducción)
  // ==========================================
  console.log(`${BOLD}${BLUE}[2/4] Testeando Módulo KITCHEN & Escandallos BOM...${RESET}`);

  // Crear materia prima A: Harina 000 (100 kg)
  const [harina] = await db.insert(products).values({
    tenantId: tenant.id,
    branchId: branch.id,
    name: `Harina 000 QA ${Date.now()}`,
    type: 'WEIGHT',
    category: 'RAW_MATERIAL',
    price: '0.00',
    cost: '500.00',
    currentStock: '100.000',
    minDailyStock: '10.000',
    optimalBatchSize: '50.000',
  }).returning();

  // Crear materia prima B: Levadura (10 kg)
  const [levadura] = await db.insert(products).values({
    tenantId: tenant.id,
    branchId: branch.id,
    name: `Levadura Fresca QA ${Date.now()}`,
    type: 'WEIGHT',
    category: 'RAW_MATERIAL',
    price: '0.00',
    cost: '1200.00',
    currentStock: '10.000',
    minDailyStock: '2.000',
    optimalBatchSize: '5.000',
  }).returning();

  // Crear producto terminado: Pan Francés Especial
  const [panFrances] = await db.insert(products).values({
    tenantId: tenant.id,
    branchId: branch.id,
    name: `Pan Francés QA ${Date.now()}`,
    type: 'WEIGHT',
    category: 'FINISHED_PRODUCT',
    price: '3500.00',
    cost: '1800.00',
    currentStock: '0.000',
    minDailyStock: '15.000',
    optimalBatchSize: '20.000',
  }).returning();

  // Crear Receta (BOM) para producir 10 kg de Pan Francés:
  // Requiere: 8 kg Harina (con 5% merma) y 0.5 kg Levadura (sin merma)
  const recipe = await createRecipeUseCase.execute({
    productId: panFrances.id,
    name: 'Fórmula Pan Francés Clásico QA',
    yieldUnits: 10, // Rinde 10 kg
    estimatedMinutes: 30,
    ingredients: [
      {
        ingredientProductId: harina.id,
        quantityRequired: 8.000,
        unit: 'KG',
        wastePercentage: 5.0, // 5% de merma técnica -> 8 * 1.05 = 8.4 kg
      },
      {
        ingredientProductId: levadura.id,
        quantityRequired: 0.500,
        unit: 'KG',
        wastePercentage: 0.0, // 0.5 kg
      }
    ]
  }, tenantContext);

  assert(recipe.id !== undefined && recipe.ingredients?.length === 2, 'Receta BOM creada con 2 materias primas y merma técnica');

  // Encolar tanda de 20 kg (batchMultiplier = 20 / 10 = 2)
  const bakeOrder = await queueBakeOrderUseCase.execute({
    productId: panFrances.id,
    recipeId: recipe.id,
    quantityNeeded: 20, // 2 tandas
  }, tenantContext);

  assert(bakeOrder !== null && bakeOrder.status === 'PENDING', 'Orden de horneado encolada en KDS');

  // Completar la orden y disparar deducción BOM
  const completeResult = await completeBakeOrderUseCase.execute(bakeOrder!.id, tenantContext);
  assert(completeResult.success && completeResult.deductedIngredients, 'Orden completada con deducción atómica de ingredientes');

  // Aserción Matemática de Stock:
  // Harina inicial: 100 kg. Deducción: 8 kg * 2 tandas * 1.05 = 16.800 kg -> Restante esperado: 83.200 kg
  // Levadura inicial: 10 kg. Deducción: 0.5 kg * 2 tandas = 1.000 kg -> Restante esperado: 9.000 kg
  // Pan Francés inicial: 0 kg. Incremento: 20 kg -> Restante esperado: 20.000 kg
  const [updatedHarina] = await db.select().from(products).where(eq(products.id, harina.id));
  const [updatedLevadura] = await db.select().from(products).where(eq(products.id, levadura.id));
  const [updatedPan] = await db.select().from(products).where(eq(products.id, panFrances.id));

  const stockHarina = parseFloat(updatedHarina.currentStock);
  const stockLevadura = parseFloat(updatedLevadura.currentStock);
  const stockPan = parseFloat(updatedPan.currentStock);

  assert(
    Math.abs(stockHarina - 83.200) < 0.001,
    `Stock Harina descontado con precisión (Esperado: 83.20 kg, Real: ${stockHarina.toFixed(3)} kg)`
  );
  assert(
    Math.abs(stockLevadura - 9.000) < 0.001,
    `Stock Levadura descontado con precisión (Esperado: 9.00 kg, Real: ${stockLevadura.toFixed(3)} kg)`
  );
  assert(
    Math.abs(stockPan - 20.000) < 0.001,
    `Stock Pan Francés incrementado (Esperado: 20.00 kg, Real: ${stockPan.toFixed(3)} kg)`
  );

  // Validar Idempotencia de cocción (no volver a descontar si se llama otra vez)
  await completeBakeOrderUseCase.execute(bakeOrder!.id, tenantContext);
  const [recheckedHarina] = await db.select().from(products).where(eq(products.id, harina.id));
  assert(
    parseFloat(recheckedHarina.currentStock) === stockHarina,
    'Idempotencia KDS: segunda ejecución no descuenta doble stock'
  );

  console.log('');

  // ==========================================
  // 3. MÓDULO SALES & POS (Idempotencia y Arqueos)
  // ==========================================
  console.log(`${BOLD}${BLUE}[3/4] Testeando Módulo SALES & Idempotencia POS...${RESET}`);

  // Abrir sesión de caja con $10.000 iniciales
  const session = await openCashSessionUseCase.execute({
    initialAmount: 10000,
  }, tenantContext);

  assert(session.id !== undefined && parseFloat(session.initialAmount) === 10000, 'Sesión de caja abierta con $10.000');

  // Procesar venta de 2 kg de Pan Francés ($7.000) con idempotencyKey UUID
  const saleIdempotencyKey = `idemp_pos_${Date.now()}`;
  const saleRes1 = await processSaleUseCase.execute({
    items: [{
      productId: panFrances.id,
      quantity: 2,
      unitPrice: 3500,
    }],
    paymentMethod: 'CASH',
    cashSessionId: session.id,
    idempotencyKey: saleIdempotencyKey,
  }, tenantContext);

  assert(saleRes1.success && !saleRes1.isIdempotentReplay, 'Venta procesada exitosamente');

  const [panAfterSale] = await db.select().from(products).where(eq(products.id, panFrances.id));
  const stockPanAfterSale = parseFloat(panAfterSale.currentStock);
  assert(
    Math.abs(stockPanAfterSale - 18.000) < 0.001,
    `Stock de Pan descontado en venta (20 kg - 2 kg = 18 kg)`
  );

  // Re-ejecutar cobro con el MISMO idempotencyKey
  const saleRes2 = await processSaleUseCase.execute({
    items: [{
      productId: panFrances.id,
      quantity: 2,
      unitPrice: 3500,
    }],
    paymentMethod: 'CASH',
    cashSessionId: session.id,
    idempotencyKey: saleIdempotencyKey,
  }, tenantContext);

  assert(
    saleRes2.success && saleRes2.isIdempotentReplay && saleRes2.saleId === saleRes1.saleId,
    'Idempotencia en Cobro POS: solicitud repetida retorna el ticket original (isIdempotentReplay = true)'
  );

  const [panAfterReplay] = await db.select().from(products).where(eq(products.id, panFrances.id));
  assert(
    parseFloat(panAfterReplay.currentStock) === 18.000,
    'Aserción Crítica: El stock NO volvió a descontarse en el reintento de cobro'
  );

  // Cerrar sesión con arqueo de $17.000 ($10.000 inicial + $7.000 venta en efectivo)
  const closeRes = await closeCashSessionUseCase.execute({
    sessionId: session.id,
    countedCash: 17000,
  }, tenantContext);

  assert(
    closeRes.summary.difference === 0 && closeRes.summary.totalSalesCash === 7000,
    'Cierre y arqueo de caja con balance exacto (Diferencia = $0)'
  );

  console.log('');

  // ==========================================
  // 4. MÓDULO TELEMETRY & EDGE CV (YOLO)
  // ==========================================
  console.log(`${BOLD}${BLUE}[4/4] Testeando Módulo TELEMETRY & Visión Artificial Edge...${RESET}`);

  // 4.1 Ingesta con confianza alta (0.85) en bandeja vacía -> debe persistir y disparar alerta
  const highConfResult = await ingestTelemetryUseCase.execute({
    deviceId: 'cam-mostrador-criollos-01',
    eventType: 'TRAY_DEPLETION_ALERT',
    confidence: 0.88,
    payload: {
      label: 'Criollos Hojaldrados',
      trayId: 'tray_04',
      remainingPercentage: 0.05,
      cameraFps: 30,
    },
    branchId: branch.id,
  }, tenantContext);

  assert(
    highConfResult.success && highConfResult.alertTriggered,
    'Evento Edge CV con confianza alta (>0.80) dispara alerta automática a la sucursal'
  );

  // 4.2 Ingesta con confianza baja (0.50) -> debe persistir pero NO disparar alerta
  const lowConfResult = await ingestTelemetryUseCase.execute({
    deviceId: 'cam-mostrador-criollos-01',
    eventType: 'TRAY_DEPLETION_ALERT',
    confidence: 0.50,
    payload: {
      label: 'Criollos Hojaldrados',
      trayId: 'tray_04',
    },
    branchId: branch.id,
  }, tenantContext);

  assert(
    lowConfResult.success && !lowConfResult.alertTriggered,
    'Evento con confianza baja (<0.80) es auditado en telemetría sin generar alertas falsas'
  );

  // ==========================================
  // RESUMEN FINAL
  // ==========================================
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n${BOLD}${CYAN}====================================================${RESET}`);
  console.log(`${BOLD} RESUMEN DE PRUEBAS E2E (Duración: ${duration}s)${RESET}`);
  console.log(`${BOLD}${CYAN}====================================================${RESET}`);
  console.log(`  Total Asignadas : ${passedTests + failedTests}`);
  console.log(`  ${GREEN}Aprobadas (PASS)${RESET}: ${passedTests}`);
  console.log(`  ${RED}Falladas  (FAIL)${RESET}: ${failedTests}`);

  if (failedTests === 0) {
    console.log(`\n${GREEN}${BOLD}🎉 TODOS LOS MÓDULOS DEL MONOLITO DDD CERTIFICADOS EXITOSAMENTE.${RESET}\n`);
    process.exit(0);
  } else {
    console.error(`\n${RED}${BOLD}❌ EXISTEN PRUEBAS FALLADAS QUE DEBEN CORREGIRSE.${RESET}\n`);
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('\n💥 Error fatal en test suite:', err);
  process.exit(1);
});
