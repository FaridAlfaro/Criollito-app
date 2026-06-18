'use server';

import { cookies } from 'next/headers';
import { db } from '@/db';
import { users, tenants } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Helper to map client roles to DB roles
const ROLE_MAP: Record<string, 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISOR' | 'BAKER' | 'CASHIER'> = {
  admin: 'ADMIN',
  dueño: 'SUPERVISOR',
  panadero: 'BAKER',
  cajero: 'CASHIER',
  fuser: 'CASHIER',
  superadmin: 'SUPER_ADMIN',
};

const DISPLAY_NAME_MAP: Record<string, string> = {
  admin: 'Administrador Local',
  dueño: 'Dueño de Panadería',
  panadero: 'Pedro Panadero',
  cajero: 'Juan Cajero',
  fuser: 'Fuser Impr',
  superadmin: 'Super Administrador SaaS',
};

export async function syncSessionAction(clientRole: string) {
  try {
    const dbRole = ROLE_MAP[clientRole] || 'CASHIER';
    const displayName = DISPLAY_NAME_MAP[clientRole] || clientRole.toUpperCase();

    // 1. Get or create a tenant to link the user to
    let tenant = await db.query.tenants.findFirst();
    if (!tenant) {
      [tenant] = await db.insert(tenants).values({
        name: "Panadería El Criollito",
        businessName: "Criollito SRL",
        cuit: "30-12345678-9",
        puntoVenta: 1,
      }).returning();
    }

    // 2. Find or create a user in the database with this role
    let user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.role, dbRole)
    });

    if (!user) {
      // Create user if not exists
      const email = `${clientRole.toLowerCase()}@criollito.com`;
      [user] = await db.insert(users).values({
        tenantId: tenant.id,
        name: displayName,
        email,
        passwordHash: "mock_hash_1234",
        role: dbRole,
        isActive: true,
      }).returning();
    }

    // 3. Set the session cookie
    const sessionData = {
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
      name: user.name,
    };

    const cookieStore = await cookies();
    cookieStore.set('session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    });

    return { success: true, user: sessionData };
  } catch (err) {
    console.error('Error syncing session:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
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
