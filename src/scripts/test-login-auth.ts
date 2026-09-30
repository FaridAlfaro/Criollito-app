import 'dotenv/config';
import { db } from '../db';
import { createHash } from 'crypto';

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

async function testQuery() {
  console.log('🧪 Probando consulta DB de usuario con Neon Serverless HTTP...');
  const email = 'superadmin@criollito.com';
  const passwordHash = hashPassword('Admin1234!');

  const user = await db.query.users.findFirst({
    where: (u, { and, eq }) => and(
      eq(u.email, email.toLowerCase().trim()),
      eq(u.passwordHash, passwordHash),
      eq(u.isActive, true)
    ),
  });

  console.log('✅ Usuario encontrado en DB:', user ? { id: user.id, name: user.name, role: user.role, email: user.email } : null);
}

testQuery().catch(err => {
  console.error('❌ Error en consulta DB:', err);
});
