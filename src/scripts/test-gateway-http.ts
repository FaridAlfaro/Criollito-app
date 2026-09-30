/**
 * GATEWAY HTTP INTEGRATION TEST RUNNER
 * ====================================
 * Valida los 4 requerimientos críticos del API Gateway Unificado:
 * 1. Rechazo 401 para peticiones no autenticadas.
 * 2. Autenticación Dual por Bearer API Key con resolución de tenant.
 * 3. Protección estricta anti Tenant-Injection.
 * 4. Control de idempotencia vía header X-Idempotency-Key.
 *
 * Ejecutar con: npx tsx src/scripts/test-gateway-http.ts
 */

import 'dotenv/config';
import { NextRequest } from 'next/server';
import { GET, POST } from '../app/api/v1/[...route]/route';
import { db } from '../db';
import { tenants, branches, products } from '../db/schema';
import { apiKeyRepository } from '../modules/identity';
import { createHash } from 'crypto';

// ANSI Colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ${GREEN}✓ [PASS]${RESET} ${testName}`);
    passed++;
  } else {
    console.error(`  ${RED}✗ [FAIL]${RESET} ${testName}`);
    if (detail) console.error(`    ${RED}Detalle:${RESET} ${detail}`);
    failed++;
  }
}

async function runGatewayTests() {
  console.log(`\n${BOLD}${CYAN}====================================================${RESET}`);
  console.log(`${BOLD}${CYAN} 🌐 CERTIFICACIÓN DEL API GATEWAY UNIFICADO (v1)    ${RESET}`);
  console.log(`${BOLD}${CYAN}====================================================${RESET}\n`);

  // 1. Obtener o crear tenant y producto para tests
  const tenant = await db.query.tenants.findFirst();
  if (!tenant) throw new Error('Se requiere al menos un tenant en la DB');

  let branch = await db.query.branches.findFirst({
    where: (b, { eq }) => eq(b.tenantId, tenant.id),
  });
  if (!branch) {
    [branch] = await db.insert(branches).values({
      tenantId: tenant.id,
      name: 'Sucursal Gateway Test',
      isActive: true,
    }).returning();
  }

  // Crear producto para checkout
  const [testProduct] = await db.insert(products).values({
    tenantId: tenant.id,
    branchId: branch.id,
    name: `Criollo Hojaldre GW ${Date.now()}`,
    type: 'WEIGHT',
    category: 'FINISHED_PRODUCT',
    price: '2500.00',
    cost: '1000.00',
    currentStock: '50.000',
    minDailyStock: '5.000',
    optimalBatchSize: '10.000',
  }).returning();

  // Crear API Key válida
  const rawKey = `crio_live_gw_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  await apiKeyRepository.createApiKey({
    tenantId: tenant.id,
    branchId: branch.id,
    name: 'POS Terminal Gateway Test',
    keyHash,
    keyPrefix: rawKey.slice(0, 10),
    role: 'CASHIER',
  });

  // ==========================================
  // PRUEBA 1: Liveness Probe Público (/api/v1/health)
  // ==========================================
  console.log(`${BOLD}${BLUE}[Test 1] Healthcheck Liveness Probe...${RESET}`);
  const healthReq = new NextRequest('http://localhost:3000/api/v1/health', {
    method: 'GET',
  });
  const healthRes = await GET(healthReq, { params: Promise.resolve({ route: ['health'] }) });
  const healthData = await healthRes.json();
  assert(healthRes.status === 200 && healthData.status === 'UP', 'GET /api/v1/health responde 200 OK con status UP');

  // ==========================================
  // PRUEBA 2: Rechazo 401 a petición no autenticada
  // ==========================================
  console.log(`\n${BOLD}${BLUE}[Test 2] Rechazo de Petición No Autenticada...${RESET}`);
  const unauthReq = new NextRequest('http://localhost:3000/api/v1/sales/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [] }),
  });
  const unauthRes = await POST(unauthReq, { params: Promise.resolve({ route: ['sales', 'checkout'] }) });
  assert(unauthRes.status === 401, 'Petición sin credenciales a /sales/checkout responde 401 Unauthorized');

  // ==========================================
  // PRUEBA 3: Dual Auth con Bearer Token & Anti-Tenant Injection
  // ==========================================
  console.log(`\n${BOLD}${BLUE}[Test 3] Dual Auth Bearer & Protección Anti-Tenant Injection...${RESET}`);
  const fakeTenantId = '00000000-0000-0000-0000-000000000000'; // Intento de inyectar tenant ajeno
  const idempotencyKey = `gw_idemp_${Date.now()}`;

  const checkoutReq = new NextRequest('http://localhost:3000/api/v1/sales/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${rawKey}`,
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      tenantId: fakeTenantId, // Intento malicioso de suplantación
      items: [{
        productId: testProduct.id,
        quantity: 2,
        unitPrice: 2500,
      }],
      paymentMethod: 'CASH',
    }),
  });

  const checkoutRes = await POST(checkoutReq, { params: Promise.resolve({ route: ['sales', 'checkout'] }) });
  const checkoutData = await checkoutRes.json();

  assert(
    checkoutRes.status === 201 && checkoutData.success === true,
    'POST /sales/checkout autenticado con Bearer API Key procesado con éxito (HTTP 201)'
  );

  // Aserción Anti-Tenant Injection: La venta debe pertenecer al tenant de la API Key, NUNCA al fakeTenantId
  assert(
    checkoutData.sale && checkoutData.sale.tenantId === tenant.id && checkoutData.sale.tenantId !== fakeTenantId,
    'Protección Anti-Tenant Injection: El Gateway forzó el tenantId criptográfico de la credencial e ignoró el fakeTenantId'
  );

  // ==========================================
  // PRUEBA 4: Control de Idempotencia X-Idempotency-Key
  // ==========================================
  console.log(`\n${BOLD}${BLUE}[Test 4] Control de Idempotencia (X-Idempotency-Key)...${RESET}`);
  const replayReq = new NextRequest('http://localhost:3000/api/v1/sales/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${rawKey}`,
      'X-Idempotency-Key': idempotencyKey, // Mismo header
    },
    body: JSON.stringify({
      items: [{
        productId: testProduct.id,
        quantity: 2,
        unitPrice: 2500,
      }],
      paymentMethod: 'CASH',
    }),
  });

  const replayRes = await POST(replayReq, { params: Promise.resolve({ route: ['sales', 'checkout'] }) });
  const replayData = await replayRes.json();

  assert(
    replayRes.status === 201 && replayData.isIdempotentReplay === true && replayData.saleId === checkoutData.saleId,
    'Header X-Idempotency-Key: Cobro repetido detectado, responde ticket original sin duplicar venta (isIdempotentReplay = true)'
  );

  // ==========================================
  // PRUEBA 5: Endpoint de Ingesta Telemetría Edge CV (/telemetry/events)
  // ==========================================
  console.log(`\n${BOLD}${BLUE}[Test 5] Ingesta de Telemetría Edge CV...${RESET}`);
  const telemetryReq = new NextRequest('http://localhost:3000/api/v1/telemetry/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${rawKey}`,
    },
    body: JSON.stringify({
      deviceId: 'cam-panaderia-gw-01',
      eventType: 'TRAY_DEPLETION_ALERT',
      confidence: 0.92,
      payload: {
        trayLabel: 'Facturas de Manteca',
        boundingBox: [100, 150, 400, 450],
      },
    }),
  });

  const telemetryRes = await POST(telemetryReq, { params: Promise.resolve({ route: ['telemetry', 'events'] }) });
  const telemetryData = await telemetryRes.json();

  assert(
    telemetryRes.status === 201 && telemetryData.alertTriggered === true,
    'POST /telemetry/events ingesta inferencia YOLO y dispara alerta KDS de reposición'
  );

  // ==========================================
  // RESUMEN
  // ==========================================
  console.log(`\n${BOLD}${CYAN}====================================================${RESET}`);
  console.log(`  Total Gateway Tests: ${passed + failed}`);
  console.log(`  ${GREEN}Aprobadas (PASS)   ${RESET}: ${passed}`);
  console.log(`  ${RED}Falladas  (FAIL)   ${RESET}: ${failed}`);
  console.log(`${BOLD}${CYAN}====================================================${RESET}\n`);

  if (failed === 0) {
    console.log(`${GREEN}${BOLD}🛡️  API GATEWAY UNIFICADO 100% CERTIFICADO Y BLINDADO.${RESET}\n`);
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runGatewayTests().catch(err => {
  console.error('\n💥 Error fatal en test suite de Gateway:', err);
  process.exit(1);
});
