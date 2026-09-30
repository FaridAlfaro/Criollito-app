import 'dotenv/config';
import { db, pool } from '../db';
import { tenants, branches, products, recipes, recipeIngredients, bakeQueue } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { completeBakeOrderUseCase, recipeRepository, bakeQueueRepository } from '../modules/kitchen';
import { TenantContext } from '../modules/shared/domain/tenant-context';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ${RED}✗ [FAIL] ${message}${RESET}`);
    throw new Error(`Aserción fallida: ${message}`);
  }
  console.log(`  ${GREEN}✓ [PASS] ${message}${RESET}`);
}

async function runKitchenTransactionTest() {
  console.log(`\n${BOLD}${BLUE}====================================================${RESET}`);
  console.log(`${BOLD}${BLUE} 🧪 CERTIFICACIÓN TRANSACCIONAL DEL MÓDULO KITCHEN  ${RESET}`);
  console.log(`${BOLD}${BLUE}====================================================${RESET}\n`);

  try {
    // 1. Obtener Tenant y Sucursal
    const tenant = await db.query.tenants.findFirst();
    if (!tenant) throw new Error('No se encontró ningún tenant en la base de datos.');

    const branch = await db.query.branches.findFirst({
      where: (b, { eq }) => eq(b.tenantId, tenant.id),
    });

    const tenantContext: TenantContext = {
      tenantId: tenant.id,
      branchId: branch?.id ?? null,
      userId: '00000000-0000-0000-0000-000000000001',
      role: 'BAKER',
      name: 'Tester Panadero',
    };

    console.log(`[Contexto] Tenant: ${tenant.name} (${tenant.id}), Branch: ${branch?.name ?? 'Sin Sucursal'}`);

    // 2. Preparar Producto Terminado e Insumos (Materia Prima)
    console.log(`\n[Fase 1] Configurando Producto, Receta BOM e Insumos...`);

    // Insumo A: Harina
    let [harina] = await db.select().from(products).where(and(eq(products.tenantId, tenant.id), eq(products.name, 'Harina Test KDS')));
    if (!harina) {
      [harina] = await db.insert(products).values({
        tenantId: tenant.id,
        branchId: branch?.id ?? null,
        name: 'Harina Test KDS',
        type: 'WEIGHT',
        category: 'RAW_MATERIAL',
        price: '800.00',
        currentStock: '100.000',
        minDailyStock: '20.000',
      }).returning();
    } else {
      // Reset stock para el test
      await db.update(products).set({ currentStock: '100.000' }).where(eq(products.id, harina.id));
    }

    // Insumo B: Levadura
    let [levadura] = await db.select().from(products).where(and(eq(products.tenantId, tenant.id), eq(products.name, 'Levadura Test KDS')));
    if (!levadura) {
      [levadura] = await db.insert(products).values({
        tenantId: tenant.id,
        branchId: branch?.id ?? null,
        name: 'Levadura Test KDS',
        type: 'WEIGHT',
        category: 'RAW_MATERIAL',
        price: '1500.00',
        currentStock: '10.000',
        minDailyStock: '2.000',
      }).returning();
    } else {
      await db.update(products).set({ currentStock: '10.000' }).where(eq(products.id, levadura.id));
    }

    // Producto Final: Pan Test KDS
    let [panFinal] = await db.select().from(products).where(and(eq(products.tenantId, tenant.id), eq(products.name, 'Pan Test KDS')));
    if (!panFinal) {
      [panFinal] = await db.insert(products).values({
        tenantId: tenant.id,
        branchId: branch?.id ?? null,
        name: 'Pan Test KDS',
        type: 'WEIGHT',
        category: 'FINISHED_PRODUCT',
        price: '3000.00',
        currentStock: '5.000',
        minDailyStock: '10.000',
      }).returning();
    } else {
      await db.update(products).set({ currentStock: '5.000' }).where(eq(products.id, panFinal.id));
    }

    // Receta BOM para Pan Test KDS: 1 kg de pan requiere 0.8 kg de harina y 0.05 kg de levadura
    let [testRecipe] = await db.select().from(recipes).where(and(eq(recipes.tenantId, tenant.id), eq(recipes.name, 'Receta Pan Test KDS')));
    if (!testRecipe) {
      [testRecipe] = await db.insert(recipes).values({
        tenantId: tenant.id,
        productId: panFinal.id,
        name: 'Receta Pan Test KDS',
        yieldUnits: '1.000',
        unitsPerTray: 20,
        estimatedMinutes: 30,
        isActive: true,
      }).returning();

      await db.insert(recipeIngredients).values([
        {
          tenantId: tenant.id,
          recipeId: testRecipe.id,
          ingredientProductId: harina.id,
          quantityRequired: '0.800',
          unit: 'KG',
          wastePercentage: '0.00',
        },
        {
          tenantId: tenant.id,
          recipeId: testRecipe.id,
          ingredientProductId: levadura.id,
          quantityRequired: '0.050',
          unit: 'KG',
          wastePercentage: '0.00',
        },
      ]);
    }

    // ==========================================
    // PRUEBA 1: CICLO COMPLETO CON RECETA BOM
    // ==========================================
    console.log(`\n[Fase 2] Creando Orden de Horneado en PENDING (con Receta)...`);
    const bakeQty = 10.0; // 10 kg de pan

    const [orderWithRecipe] = await db.insert(bakeQueue).values({
      tenantId: tenant.id,
      branchId: branch?.id ?? null,
      productId: panFinal.id,
      recipeId: testRecipe.id,
      quantityNeeded: bakeQty.toString(),
      status: 'PENDING',
      priority: 1,
      deductedIngredients: false,
    }).returning();

    assert(orderWithRecipe.status === 'PENDING', 'Orden creada exitosamente en estado PENDING');

    // Leer stocks antes de completar
    const [panBefore] = await db.select().from(products).where(eq(products.id, panFinal.id));
    const [harinaBefore] = await db.select().from(products).where(eq(products.id, harina.id));
    const [levaduraBefore] = await db.select().from(products).where(eq(products.id, levadura.id));

    const panStockBefore = parseFloat(panBefore.currentStock);
    const harinaStockBefore = parseFloat(harinaBefore.currentStock);
    const levaduraStockBefore = parseFloat(levaduraBefore.currentStock);

    console.log(`  Stocks Iniciales: Pan=${panStockBefore}, Harina=${harinaStockBefore}, Levadura=${levaduraStockBefore}`);

    console.log(`\n[Fase 3] Ejecutando CompleteBakeOrderUseCase...`);
    const completionResult = await completeBakeOrderUseCase.execute(orderWithRecipe.id, tenantContext);

    assert(completionResult.success === true, 'CompleteBakeOrderUseCase finalizó con success: true');
    assert(completionResult.deductedIngredients === true, 'Se indicó deductedIngredients: true');
    assert(completionResult.stockAdded === bakeQty, `Se reportó stockAdded: ${bakeQty}`);

    // Consultar PostgreSQL directamente con SQL puro
    console.log(`\n[Fase 4] Verificando persistencia real en PostgreSQL con consultas directas...`);
    const [dbOrder] = await db.select().from(bakeQueue).where(eq(bakeQueue.id, orderWithRecipe.id));
    assert(dbOrder.status === 'COMPLETED', `Estado en base de datos es COMPLETED (actual: ${dbOrder.status})`);
    assert(dbOrder.completedAt !== null, 'completed_at registrado con timestamp de servidor');
    assert(dbOrder.deductedIngredients === true, 'deducted_ingredients en base de datos es true');

    const [panAfter] = await db.select().from(products).where(eq(products.id, panFinal.id));
    const [harinaAfter] = await db.select().from(products).where(eq(products.id, harina.id));
    const [levaduraAfter] = await db.select().from(products).where(eq(products.id, levadura.id));

    const panStockAfter = parseFloat(panAfter.currentStock);
    const harinaStockAfter = parseFloat(harinaAfter.currentStock);
    const levaduraStockAfter = parseFloat(levaduraAfter.currentStock);

    console.log(`  Stocks Finales: Pan=${panStockAfter}, Harina=${harinaStockAfter}, Levadura=${levaduraStockAfter}`);

    // Validar incremento de producto final
    assert(
      Math.abs(panStockAfter - (panStockBefore + bakeQty)) < 0.001,
      `Stock de producto terminado aumentó exactamente +${bakeQty} (Esperado: ${panStockBefore + bakeQty}, Obtenido: ${panStockAfter})`
    );

    // Validar decremento de insumos
    const expectedHarinaDeduct = 0.8 * bakeQty; // 8 kg
    const expectedLevaduraDeduct = 0.05 * bakeQty; // 0.5 kg
    assert(
      Math.abs(harinaStockAfter - (harinaStockBefore - expectedHarinaDeduct)) < 0.001,
      `Stock de Harina disminuyó exactamente -${expectedHarinaDeduct} kg (Esperado: ${harinaStockBefore - expectedHarinaDeduct}, Obtenido: ${harinaStockAfter})`
    );
    assert(
      Math.abs(levaduraStockAfter - (levaduraStockBefore - expectedLevaduraDeduct)) < 0.001,
      `Stock de Levadura disminuyó exactamente -${expectedLevaduraDeduct} kg (Esperado: ${levaduraStockBefore - expectedLevaduraDeduct}, Obtenido: ${levaduraStockAfter})`
    );

    // ==========================================
    // PRUEBA 2: CASO SIN RECETA (BOM NULO)
    // ==========================================
    console.log(`\n[Fase 5] Probando caso sin receta (BOM Nulo)...`);
    // Crear producto huérfano sin receta
    let [prodSinReceta] = await db.select().from(products).where(and(eq(products.tenantId, tenant.id), eq(products.name, 'Bizcocho Sin Receta Test')));
    if (!prodSinReceta) {
      [prodSinReceta] = await db.insert(products).values({
        tenantId: tenant.id,
        branchId: branch?.id ?? null,
        name: 'Bizcocho Sin Receta Test',
        type: 'UNIT',
        category: 'FINISHED_PRODUCT',
        price: '200.00',
        currentStock: '0.000',
        minDailyStock: '10.000',
      }).returning();
    }

    const stockSinRecetaBefore = parseFloat(prodSinReceta.currentStock);
    const noRecipeQty = 50;

    const [orderNoRecipe] = await db.insert(bakeQueue).values({
      tenantId: tenant.id,
      branchId: branch?.id ?? null,
      productId: prodSinReceta.id,
      recipeId: null,
      quantityNeeded: noRecipeQty.toString(),
      status: 'PENDING',
      priority: 1,
      deductedIngredients: false,
    }).returning();

    const noRecipeRes = await completeBakeOrderUseCase.execute(orderNoRecipe.id, tenantContext);
    assert(noRecipeRes.success === true, 'Orden sin receta completada sin errores');
    assert(noRecipeRes.deductedIngredients === false, 'deductedIngredients es false al no tener BOM');

    const [dbOrderNoRecipe] = await db.select().from(bakeQueue).where(eq(bakeQueue.id, orderNoRecipe.id));
    assert(dbOrderNoRecipe.status === 'COMPLETED', 'Orden sin receta quedó en status COMPLETED');

    const [prodSinRecetaAfter] = await db.select().from(products).where(eq(products.id, prodSinReceta.id));
    const stockSinRecetaAfter = parseFloat(prodSinRecetaAfter.currentStock);
    assert(
      Math.abs(stockSinRecetaAfter - (stockSinRecetaBefore + noRecipeQty)) < 0.001,
      `Stock de producto sin receta aumentó en +${noRecipeQty} (Esperado: ${stockSinRecetaBefore + noRecipeQty}, Obtenido: ${stockSinRecetaAfter})`
    );

    console.log(`\n${BOLD}${GREEN}====================================================${RESET}`);
    console.log(`${BOLD}${GREEN} 🎉 TODAS LAS ASERCIONES TRANSACCIONALES PASARON!   ${RESET}`);
    console.log(`${BOLD}${GREEN}====================================================${RESET}\n`);

    process.exit(0);
  } catch (err: any) {
    console.error(`\n${BOLD}${RED}💥 ERROR EN CERTIFICACIÓN TRANSACCIONAL:${RESET}`, err?.message || err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runKitchenTransactionTest();
