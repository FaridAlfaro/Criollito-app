'use server';

import { db } from '@/db';
import { tenants, users } from '@/db/schema';
import { getCurrentUserSession } from '@/lib/auth-session';
import { createHash } from 'crypto';
import { revalidatePath } from 'next/cache';

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export async function createNewTenant(data: {
  panaderiaName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  plan?: number;
}) {
  try {
    // 1. Verify that the current user has SUPER_ADMIN role
    const session = await getCurrentUserSession();
    if (session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Acceso no autorizado. Se requiere rol SUPER_ADMIN.' };
    }

    // 2. Input validation
    if (!data.panaderiaName || !data.adminName || !data.adminEmail || !data.adminPassword) {
      return { success: false, error: 'Todos los campos son obligatorios.' };
    }

    // 3. Database transaction
    const result = await db.transaction(async (tx) => {
      // Create Tenant
      const [newTenant] = await tx.insert(tenants).values({
        name: data.panaderiaName,
        businessName: data.panaderiaName,
        cuit: "30-" + Math.floor(10000000 + Math.random() * 90000000) + "-9", // mock CUIT
        puntoVenta: 1,
        plan: data.plan || 14,
      }).returning();

      // Hash password
      const passwordHash = hashPassword(data.adminPassword);

      // Create Supervisor (Dueño) User linked to new tenant
      const [newAdmin] = await tx.insert(users).values({
        tenantId: newTenant.id,
        name: data.adminName,
        email: data.adminEmail,
        passwordHash: passwordHash,
        role: 'SUPERVISOR',
        isActive: true,
      }).returning();

      return { tenantId: newTenant.id, adminId: newAdmin.id };
    });

    revalidatePath('/superadmin');
    return { success: true, data: result };

  } catch (err: any) {
    console.error('Error in createNewTenant:', err);
    if (err.code === '23505' || err.message?.includes('users_email_unique')) {
      return { success: false, error: 'El correo electrónico ya está registrado.' };
    }
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
