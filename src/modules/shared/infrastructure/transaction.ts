import { db } from '@/db';

export type DrizzleDatabase = typeof db;
export type DrizzleTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbOrTx = DrizzleDatabase | DrizzleTransaction;

/**
 * Ejecuta una unidad de trabajo (Unit of Work) dentro de una transacción ACID interactiva en PostgreSQL.
 * - Si ya se encuentra dentro de una transacción (`existingTx`), la reutiliza sin abrir una anidada.
 * - Si no, abre una transacción nativa mediante `db.transaction(async (tx) => { ... })`.
 * - Pasa obligatoriamente la instancia `tx` a los repositorios para garantizar aislamiento atómico.
 * - Si cualquier operación interna falla, PostgreSQL ejecuta un ROLLBACK estricto y la excepción es relanzada.
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
