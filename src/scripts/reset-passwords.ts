/**
 * RESET DE CONTRASEÑAS DE DEMO
 * =============================
 * Actualiza los hashes SHA-256 de todos los usuarios de demo.
 * Necesario cuando usuarios fueron creados con el sistema viejo (hash plano "mock_hash_1234").
 *
 * Ejecutar con: npx tsx src/scripts/reset-passwords.ts
 */

import 'dotenv/config';

import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

const DEMO_USERS: { email: string; password: string }[] = [
  { email: 'superadmin@criollito.com', password: 'Admin1234!' },
  { email: 'admin@criollito.com',      password: 'Admin1234!' },
  { email: 'cajero@criollito.com',     password: 'Cajero1234!' },
  { email: 'panadero@criollito.com',   password: 'Baker1234!' },
  { email: 'dueno@criollito.com',      password: 'Dueno1234!' },
];

async function resetPasswords() {
  console.log('\n🔑 Reseteando hashes de contraseñas...\n');

  for (const u of DEMO_USERS) {
    const hash = hashPassword(u.password);

    const result = await db
      .update(users)
      .set({ passwordHash: hash })
      .where(eq(users.email, u.email))
      .returning({ id: users.id, email: users.email });

    if (result.length > 0) {
      console.log(`  ✅ ${u.email} → hash actualizado`);
    } else {
      console.log(`  ⚠️  ${u.email} → no encontrado en la DB`);
    }
  }

  console.log('\n✅ Hashes actualizados. Podés iniciar sesión con las credenciales del demo.\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  CREDENCIALES:');
  console.log('═══════════════════════════════════════════════════════');
  for (const u of DEMO_USERS) {
    console.log(`  ${u.email.padEnd(35)} / ${u.password}`);
  }
  console.log('═══════════════════════════════════════════════════════\n');

  process.exit(0);
}

resetPasswords().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
