import { db } from '@/db';

export type DrizzleDatabase = typeof db;
export type DrizzleTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbOrTx = DrizzleDatabase | DrizzleTransaction;

/**
 * Ejecuta una función dentro de una transacción Drizzle.
 * Si ya se encuentra dentro de una transacción (se proporciona un tx existente),
 * la reutiliza sin abrir una anidada.
 * Si el driver subyacente (ej. @neondatabase/serverless vía neon-http) no soporta
 * transacciones TCP interactivas sobre HTTP stateless, conmuta de forma transparente
 * a ejecución directa sobre el cliente HTTP.
 */
export async function runInTransaction<T>(
  callback: (tx: DrizzleTransaction) => Promise<T>,
  existingTx?: DrizzleTransaction
): Promise<T> {
  if (existingTx) {
    return callback(existingTx);
  }

  try {
    return await db.transaction(async (tx) => {
      return callback(tx);
    });
  } catch (err: any) {
    if (err?.message?.includes('No transactions support in neon-http driver')) {
      return callback(db as unknown as DrizzleTransaction);
    }
    throw err;
  }
}
