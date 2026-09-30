import "dotenv/config";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { db } from "../db";

/**
 * Script de orquestación de migraciones de Drizzle ORM con reintentos exponenciales.
 * Tolerante a latencias de arranque en frío (cold starts) de Neon PostgreSQL Serverless.
 */
async function runMigrationWithRetry(maxRetries = 3, baseDelayMs = 2000): Promise<void> {
  let attempt = 1;
  while (attempt <= maxRetries) {
    try {
      console.log(`[DB_MIGRATE] (Intento ${attempt}/${maxRetries}) Iniciando aplicación de migraciones...`);
      await migrate(db, { migrationsFolder: "./drizzle" });
      console.log("[DB_MIGRATE] Migraciones aplicadas con éxito.");
      return;
    } catch (error: any) {
      console.error(`[DB_MIGRATE] Error en intento ${attempt}:`, error?.message || error);
      if (attempt === maxRetries) {
        console.error("[DB_MIGRATE] Se agotaron los reintentos para aplicar migraciones.");
        throw error;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.log(`[DB_MIGRATE] Reintentando en ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt++;
    }
  }
}

runMigrationWithRetry()
  .then(() => {
    console.log("[DB_MIGRATE] Proceso de migración finalizado exitosamente.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[DB_MIGRATE] Fallo fatal al aplicar migraciones:", err);
    process.exit(1);
  });
