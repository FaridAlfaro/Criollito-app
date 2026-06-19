'use server';

import { cookies } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createHash } from 'crypto';

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export async function loginAction(email: string, password: string) {
  if (!email || !password) {
    return { success: false, error: 'Email y contraseña son requeridos.' };
  }

  const passwordHash = hashPassword(password);

  const user = await db.query.users.findFirst({
    where: (u, { and, eq }) => and(
      eq(u.email, email.toLowerCase().trim()),
      eq(u.passwordHash, passwordHash),
      eq(u.isActive, true)
    ),
  });

  if (!user) {
    return { success: false, error: 'Credenciales incorrectas o usuario inactivo.' };
  }

  const sessionData = {
    id: user.id,
    tenantId: user.tenantId,
    branchId: user.branchId ?? null,
    role: user.role,
    name: user.name,
  };

  const cookieStore = await cookies();
  cookieStore.set('session', JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12, // 12 horas
  });

  return { success: true, user: sessionData };
}

export async function clearSessionAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('session');
    return { success: true };
  } catch (err) {
    console.error('Error clearing session:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// syncSessionAction eliminado — ya no existe login por rol/PIN
