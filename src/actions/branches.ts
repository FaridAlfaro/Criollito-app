'use server';

import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { branches } from '@/db/schema';
import { getCurrentUserSession } from '@/lib/auth-session';
import { revalidatePath } from 'next/cache';
import { ForbiddenError } from '@/modules/shared/domain/errors';

export type BranchRow = typeof branches.$inferSelect;

export async function fetchBranches(): Promise<BranchRow[]> {
  const session = await getCurrentUserSession();

  return db.select().from(branches).where(
    and(
      eq(branches.tenantId, session.tenantId),
      eq(branches.isActive, true)
    )
  );
}

export async function createBranch(name: string, address?: string): Promise<BranchRow> {
  const session = await getCurrentUserSession();

  const isOwnerOrSuperAdmin = 
    session.role === 'SUPERVISOR' || 
    (session.role as string) === 'OWNER' || 
    session.role === 'SUPER_ADMIN';

  if (!isOwnerOrSuperAdmin) {
    throw new ForbiddenError('Acceso denegado (403). Solo el Dueño o Superadmin pueden crear nuevas sucursales.');
  }

  const [branch] = await db.insert(branches).values({
    tenantId: session.tenantId,
    name,
    address: address ?? null,
    isActive: true,
  }).returning();

  revalidatePath('/admin');
  revalidatePath('/supervisor');
  return branch;
}

export async function deactivateBranch(branchId: string): Promise<void> {
  const session = await getCurrentUserSession();

  const isOwnerOrSuperAdmin = 
    session.role === 'SUPERVISOR' || 
    (session.role as string) === 'OWNER' || 
    session.role === 'SUPER_ADMIN';

  if (!isOwnerOrSuperAdmin) {
    throw new ForbiddenError('Acceso denegado (403). Solo el Dueño o Superadmin pueden desactivar sucursales.');
  }

  await db.update(branches)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(branches.id, branchId),
        eq(branches.tenantId, session.tenantId)
      )
    );

  revalidatePath('/admin');
}
