'use server';

import { db } from '@/db';
import { tenants, users, alerts, subscriptionPayments } from '@/db/schema';
import { getCurrentUserSession } from '@/lib/auth-session';
import { eq, and } from 'drizzle-orm';
import { createHash } from 'crypto';
import { revalidatePath } from 'next/cache';

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

// Helper to assert SUPER_ADMIN role
async function assertSuperAdmin() {
  const session = await getCurrentUserSession();
  if (session.role !== 'SUPER_ADMIN') {
    throw new Error('No autorizado. Se requiere rol SUPER_ADMIN.');
  }
}

export async function updateTenantDetails(tenantId: string, data: {
  name: string;
  businessName: string;
  cuit: string;
  plan: number;
}) {
  try {
    await assertSuperAdmin();

    if (!data.name || !data.cuit) {
      return { success: false, error: 'El nombre y el CUIT son obligatorios.' };
    }

    await db.update(tenants)
      .set({
        name: data.name,
        businessName: data.businessName || data.name,
        cuit: data.cuit,
        plan: data.plan,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));

    revalidatePath('/superadmin');
    return { success: true };
  } catch (err: any) {
    console.error('Error in updateTenantDetails:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getTenantUsers(tenantId: string) {
  try {
    await assertSuperAdmin();
    const result = await db.select().from(users).where(eq(users.tenantId, tenantId));
    return { 
      success: true, 
      data: result.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
      }))
    };
  } catch (err: any) {
    console.error('Error in getTenantUsers:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function addAdminToTenant(tenantId: string, data: {
  name: string;
  email: string;
  password: string;
}) {
  try {
    await assertSuperAdmin();

    if (!data.name || !data.email || !data.password) {
      return { success: false, error: 'Todos los campos son obligatorios.' };
    }

    const passwordHash = hashPassword(data.password);

    await db.insert(users).values({
      tenantId: tenantId,
      name: data.name,
      email: data.email,
      passwordHash: passwordHash,
      role: 'ADMIN',
      isActive: true,
    });

    revalidatePath('/superadmin');
    return { success: true };
  } catch (err: any) {
    console.error('Error in addAdminToTenant:', err);
    if (err.code === '23505' || err.message?.includes('users_email_unique')) {
      return { success: false, error: 'El correo electrónico ya está registrado.' };
    }
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteUser(userId: string) {
  try {
    await assertSuperAdmin();

    // 1. Fetch user to get their tenantId
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return { success: false, error: 'Usuario no encontrado.' };
    }

    // 2. Count total users of the tenant to prevent leaving a tenant with no users
    const allUsers = await db.select().from(users).where(eq(users.tenantId, user.tenantId));
    if (allUsers.length <= 1) {
      return { success: false, error: 'No se puede eliminar al único usuario de esta sucursal.' };
    }

    // 3. Delete
    await db.delete(users).where(eq(users.id, userId));

    revalidatePath('/superadmin');
    return { success: true };
  } catch (err: any) {
    console.error('Error in deleteUser:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendPaymentNotification(tenantId: string, data: {
  message: string;
}) {
  try {
    await assertSuperAdmin();

    if (!data.message) {
      return { success: false, error: 'El mensaje no puede estar vacío.' };
    }

    await db.insert(alerts).values({
      tenantId: tenantId,
      type: 'SYSTEM',
      message: data.message,
      isRead: false,
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error in sendPaymentNotification:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function createSubscriptionPayment(tenantId: string, data: {
  amount: number;
  period: string;
  dueDate: Date;
}) {
  try {
    await assertSuperAdmin();

    if (!data.amount || !data.period || !data.dueDate) {
      return { success: false, error: 'Todos los campos son obligatorios.' };
    }

    await db.insert(subscriptionPayments).values({
      tenantId: tenantId,
      amount: data.amount.toString(),
      period: data.period,
      dueDate: data.dueDate,
      status: 'PENDING',
    });

    revalidatePath('/superadmin');
    return { success: true };
  } catch (err: any) {
    console.error('Error in createSubscriptionPayment:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function markPaymentPaid(paymentId: string) {
  try {
    await assertSuperAdmin();

    await db.update(subscriptionPayments)
      .set({
        status: 'PAID',
        paidAt: new Date(),
      })
      .where(eq(subscriptionPayments.id, paymentId));

    revalidatePath('/superadmin');
    return { success: true };
  } catch (err: any) {
    console.error('Error in markPaymentPaid:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getSubscriptionPayments() {
  try {
    await assertSuperAdmin();
    
    const result = await db.select().from(subscriptionPayments);
    
    return {
      success: true,
      data: result.map(p => ({
        id: p.id,
        tenantId: p.tenantId,
        amount: parseFloat(p.amount),
        period: p.period,
        status: p.status as 'PENDING' | 'PAID',
        dueDate: p.dueDate,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      }))
    };
  } catch (err: any) {
    console.error('Error in getSubscriptionPayments:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function bulkIssueInvoices(cuit: string, period: string) {
  try {
    await assertSuperAdmin();

    if (!cuit || !period) {
      return { success: false, error: 'CUIT y período son requeridos.' };
    }

    // Find all branches sharing this CUIT
    const branches = await db.select().from(tenants).where(eq(tenants.cuit, cuit));
    if (branches.length === 0) {
      return { success: false, error: 'No se encontraron sucursales para este cliente.' };
    }

    // Determine due date (10th of the current month)
    const now = new Date();
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 10, 12, 0, 0);

    // Run transaction
    const results = await db.transaction(async (tx) => {
      const createdPayments = [];
      for (const branch of branches) {
        // 1. Create subscription payment
        const [payment] = await tx.insert(subscriptionPayments).values({
          tenantId: branch.id,
          amount: branch.plan.toString(),
          period: period,
          dueDate: dueDate,
          status: 'PENDING',
        }).returning();

        // 2. Send SYSTEM notification alert
        await tx.insert(alerts).values({
          tenantId: branch.id,
          type: 'SYSTEM',
          message: `Factura mensual de suscripción emitida para el período ${period} por un monto de $${branch.plan}. Vence el día 10 de este mes. Por favor, regularizar el pago.`,
          isRead: false,
        });

        createdPayments.push(payment);
      }
      return createdPayments;
    });

    revalidatePath('/superadmin');
    return { 
      success: true, 
      data: results.map(p => ({
        id: p.id,
        tenantId: p.tenantId,
        amount: parseFloat(p.amount),
        period: p.period,
        status: p.status as 'PENDING' | 'PAID',
        dueDate: p.dueDate,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      }))
    };
  } catch (err: any) {
    console.error('Error in bulkIssueInvoices:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
