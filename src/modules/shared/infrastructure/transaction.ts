import { db } from '@/db';

export type DrizzleDatabase = typeof db;
export type DrizzleTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbOrTx = DrizzleDatabase | DrizzleTransaction;

/**
 * Ejecuta una función dentro de una transacción Drizzle.
 * Si ya se encuentra dentro de una transacción (se proporciona un tx existente),
 * la reutiliza sin abrir una anidada.
 */
export async function runInTransaction<T>(
  callback: (tx: DrizzleTransaction) => Promise<T>,
  existingTx?: DrizzleTransaction
): Promise<T> {
  if (existingTx) {
    return callback(existingTx);
  }
  return db.transaction(async (tx) => {
    return callback(tx);
  });
}
