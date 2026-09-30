import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL no está configurada en las variables de entorno");
}

// Configurar WebSocket nativo para transacciones interactivas completas (ACID y rollback) en entornos serverless/node
if (!neonConfig.webSocketConstructor && typeof globalThis.WebSocket !== "undefined") {
  neonConfig.webSocketConstructor = globalThis.WebSocket;
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
export type DB = typeof db;
