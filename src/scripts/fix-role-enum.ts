/**
 * FIX: Agrega el valor 'SUPER_ADMIN' al enum 'role' en PostgreSQL.
 *
 * El enum fue creado sin este valor en la migración inicial (0000_happy_echo.sql).
 * Ejecutar una sola vez con:
 *   npm run db:fix-enum
 *   o bien:
 *   npx dotenv -e .env -- tsx src/scripts/fix-role-enum.ts
 */

import 'dotenv/config';
import { Pool } from 'pg';

async function fixEnum() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    console.log('\n🔧 Verificando enum "role" en la base de datos...\n');

    // Consultar los valores actuales del enum
    const { rows } = await client.query<{ enumlabel: string }>(`
      SELECT enumlabel
      FROM pg_enum
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
      WHERE pg_type.typname = 'role'
      ORDER BY enumsortorder;
    `);

    const currentValues = rows.map(r => r.enumlabel);
    console.log('  Valores actuales del enum "role":', currentValues);

    if (currentValues.includes('SUPER_ADMIN')) {
      console.log('\n  ✅ "SUPER_ADMIN" ya existe en el enum. Nada que hacer.');
      console.log('  Podés ejecutar directamente: npm run db:seed\n');
    } else {
      console.log('\n  ⚠️  "SUPER_ADMIN" falta en el enum. Agregando...');

      // ALTER TYPE ADD VALUE no puede correr dentro de una transacción explícita
      await client.query(`ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN' BEFORE 'ADMIN';`);

      console.log('  ✅ Valor "SUPER_ADMIN" agregado exitosamente.\n');
      console.log('  Ahora ejecutá: npm run db:seed\n');
    }
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

fixEnum().catch(err => {
  console.error('❌ Error al arreglar el enum:', err);
  process.exit(1);
});
