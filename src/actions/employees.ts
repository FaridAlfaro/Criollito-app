'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { getCurrentUserSession } from '@/lib/auth-session';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';
import { revalidatePath } from 'next/cache';

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

// Maps input roles to database enum roles
const EMPLOYEE_ROLES = {
  cajero: 'CASHIER' as const,
  panadero: 'BAKER' as const,
  CASHIER: 'CASHIER' as const,
  BAKER: 'BAKER' as const,
};

export async function createEmployee(data: {
  name: string;
  email: string;
  password: string;
  role: 'cajero' | 'panadero' | 'CASHIER' | 'BAKER';
}) {
  try {
    // 1. Get current session
    const session = await getCurrentUserSession();

    // 2. Authorization check: must be ADMIN or SUPER_ADMIN
    if (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Acceso denegado. Se requiere rol ADMIN o SUPER_ADMIN.' };
    }

    // 3. Form validation
    if (!data.name || !data.email || !data.password || !data.role) {
      return { success: false, error: 'Todos los campos son requeridos.' };
    }

    // 4. Determine tenantId
    // Rule of Gold: Retrieve tenantId from server session, never from parameters.
    const tenantId = session.tenantId;
    if (!tenantId) {
      return { success: false, error: 'No se encontró un inquilino (tenant) válido en la sesión actual.' };
    }

    // 5. Hash the password
    const passwordHash = hashPassword(data.password);
    const dbRole = EMPLOYEE_ROLES[data.role];

    if (!dbRole) {
      return { success: false, error: 'Rol de empleado no válido.' };
    }

    // 6. Insert new user into database forcing session's tenantId
    const [newUser] = await db.insert(users).values({
      tenantId: tenantId,
      name: data.name,
      email: data.email,
      passwordHash: passwordHash,
      role: dbRole,
      isActive: true,
    }).returning();

    revalidatePath('/admin/usuarios');
    return { 
      success: true, 
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      } 
    };

  } catch (err: any) {
    console.error('Error in createEmployee:', err);
    if (err.code === '23505' || err.message?.includes('users_email_unique')) {
      return { success: false, error: 'El correo electrónico ya está registrado.' };
    }
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getTenantEmployees() {
  try {
    const session = await getCurrentUserSession();
    const tenantId = session.tenantId;

    if (!tenantId) {
      return [];
    }

    // Aislamiento de datos estricto: filtramos solo por el tenantId del usuario de la sesión
    const employees = await db.select()
      .from(users)
      .where(eq(users.tenantId, tenantId));

    return employees.map(e => ({
      id: e.id,
      tenantId: e.tenantId,
      name: e.name,
      email: e.email,
      role: e.role,
      isActive: e.isActive,
      createdAt: e.createdAt,
    }));
  } catch (err) {
    console.error('Error fetching tenant employees:', err);
    return [];
  }
}
