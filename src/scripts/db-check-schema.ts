import "dotenv/config";
import fs from "fs";
import path from "path";
import { Pool } from "pg";

/**
 * Pre-Flight Schema Verification Script
 * Valida la existencia real de todas las tablas y columnas críticas en la base de datos PostgreSQL remota
 * contrastando tanto una lista explícita de campos de alta criticidad como el último snapshot de Drizzle.
 */

interface MissingField {
  table: string;
  column: string;
}

// Lista explícita de tablas y columnas críticas del negocio
const CRITICAL_SCHEMA_REQUIREMENTS: Record<string, string[]> = {
  cash_sessions: [
    "id",
    "tenant_id",
    "branch_id",
    "cashier_id",
    "opened_at",
    "closed_at",
    "initial_amount",
    "final_amount",
    "total_sales",
    "total_cash",
    "total_debit",
    "total_credit",
    "total_qr",
    "theoretical_amount",
    "difference",
  ],
  sales: [
    "id",
    "tenant_id",
    "branch_id",
    "cash_session_id",
    "cashier_id",
    "employee_id",
    "idempotency_key",
    "total_amount",
    "payment_method",
  ],
  recipes: [
    "id",
    "tenant_id",
    "product_id",
    "name",
    "yield_units",
    "units_per_tray",
    "estimated_minutes",
    "instructions",
    "is_active",
  ],
  bake_queue: [
    "id",
    "tenant_id",
    "branch_id",
    "product_id",
    "recipe_id",
    "quantity_needed",
    "priority",
    "status",
    "notes",
    "deducted_ingredients",
  ],
  products: [
    "id",
    "tenant_id",
    "branch_id",
    "name",
    "type",
    "category",
    "price",
    "cost",
    "current_stock",
    "min_daily_stock",
    "optimal_batch_size",
  ],
  time_clock_logs: [
    "id",
    "tenant_id",
    "branch_id",
    "employee_id",
    "event_type",
    "timestamp",
    "device_info",
  ],
  telemetry_events: [
    "id",
    "tenant_id",
    "branch_id",
    "device_id",
    "event_type",
    "confidence",
    "payload",
    "processed",
  ],
  employees: [
    "id",
    "tenant_id",
    "branch_id",
    "user_id",
    "name",
    "email",
    "role",
    "base_salary",
    "hourly_rate",
    "pin_hash",
    "is_active",
  ],
  users: [
    "id",
    "tenant_id",
    "branch_id",
    "name",
    "email",
    "password_hash",
    "role",
    "pin_hash",
  ],
  api_keys: [
    "id",
    "tenant_id",
    "branch_id",
    "name",
    "key_hash",
    "key_prefix",
    "role",
    "is_active",
  ],
  waste_logs: [
    "id",
    "tenant_id",
    "branch_id",
    "product_id",
    "quantity",
    "cost",
    "reason",
    "reported_by_user_id",
  ],
  shifts: [
    "id",
    "tenant_id",
    "branch_id",
    "employee_id",
    "day",
    "shift_type",
  ],
  cash_movements: [
    "id",
    "tenant_id",
    "branch_id",
    "cash_session_id",
    "cashier_id",
    "type",
    "amount",
  ],
  tenants: [
    "id",
    "name",
    "business_name",
    "cuit",
    "punto_venta",
    "plan",
  ],
  branches: [
    "id",
    "tenant_id",
    "name",
    "address",
    "is_active",
  ],
};

async function verifySchema(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("[DB_CHECK] ERROR FATAL: DATABASE_URL no está definida en el entorno.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    console.log("[DB_CHECK] Iniciando verificación pre-flight de esquema contra PostgreSQL...");

    // 1. Obtener tablas existentes en public
    const { rows: tableRows } = await client.query<{ table_name: string }>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    const existingTables = new Set(tableRows.map((r) => r.table_name));

    // 2. Obtener todas las columnas existentes en public
    const { rows: columnRows } = await client.query<{ table_name: string; column_name: string }>(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public';
    `);

    const tableColumnsMap = new Map<string, Set<string>>();
    for (const row of columnRows) {
      if (!tableColumnsMap.has(row.table_name)) {
        tableColumnsMap.set(row.table_name, new Set());
      }
      tableColumnsMap.get(row.table_name)!.add(row.column_name);
    }

    const missingTables: string[] = [];
    const missingColumns: MissingField[] = [];

    // Validar requerimientos críticos explícitos
    for (const [tableName, requiredCols] of Object.entries(CRITICAL_SCHEMA_REQUIREMENTS)) {
      if (!existingTables.has(tableName)) {
        missingTables.push(tableName);
        continue;
      }
      const existingCols = tableColumnsMap.get(tableName) || new Set<string>();
      for (const col of requiredCols) {
        if (!existingCols.has(col)) {
          missingColumns.push({ table: tableName, column: col });
        }
      }
    }

    // Validar complementariamente contra el último snapshot de Drizzle si existe
    try {
      const journalPath = path.resolve(process.cwd(), "drizzle/meta/_journal.json");
      if (fs.existsSync(journalPath)) {
        const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
        const lastEntry = journal.entries[journal.entries.length - 1];
        if (lastEntry) {
          const snapshotIndex = String(lastEntry.idx).padStart(4, "0");
          const snapshotPath = path.resolve(process.cwd(), `drizzle/meta/${snapshotIndex}_snapshot.json`);
          if (fs.existsSync(snapshotPath)) {
            const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
            for (const [, tableDef] of Object.entries<any>(snapshot.tables || {})) {
              const tblName = tableDef.name;
              if (!existingTables.has(tblName)) {
                if (!missingTables.includes(tblName)) missingTables.push(tblName);
                continue;
              }
              const existingCols = tableColumnsMap.get(tblName) || new Set<string>();
              for (const [, colDef] of Object.entries<any>(tableDef.columns || {})) {
                if (!existingCols.has(colDef.name)) {
                  const alreadyFlagged = missingColumns.some(
                    (m) => m.table === tblName && m.column === colDef.name
                  );
                  if (!alreadyFlagged) {
                    missingColumns.push({ table: tblName, column: colDef.name });
                  }
                }
              }
            }
          }
        }
      }
    } catch (e: any) {
      console.warn("[DB_CHECK] Advertencia al leer snapshot de Drizzle:", e.message);
    }

    // Evaluación de resultados
    if (missingTables.length > 0 || missingColumns.length > 0) {
      console.error("\n❌ ========================================================");
      console.error("❌ FALLO DE VERIFICACIÓN PRE-FLIGHT DE BASE DE DATOS");
      console.error("❌ ========================================================");
      if (missingTables.length > 0) {
        console.error(`\n[!] Tablas faltantes en la base de datos (${missingTables.length}):`);
        missingTables.forEach((t) => console.error(`    - ${t}`));
      }
      if (missingColumns.length > 0) {
        console.error(`\n[!] Columnas faltantes en la base de datos (${missingColumns.length}):`);
        missingColumns.forEach((c) => console.error(`    - Tabla: "${c.table}" | Columna: "${c.column}"`));
      }
      console.error("\nAcción requerida: Ejecute 'npm run db:migrate' para sincronizar el esquema.\n");
      process.exit(1);
    }

    console.log("[DB_CHECK] ✅ Verificación exitosa: Todas las tablas y columnas críticas existen en la base de datos.");
    process.exit(0);
  } finally {
    client.release();
    await pool.end();
  }
}

verifySchema().catch((err) => {
  console.error("[DB_CHECK] Error inesperado durante la verificación de esquema:", err);
  process.exit(1);
});
