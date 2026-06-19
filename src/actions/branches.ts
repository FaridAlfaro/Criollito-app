'use server';

import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { branches } from '@/db/schema';
import { getCurrentUserSession } from '@/lib/auth-session';
import { revalidatePath } from 'next/cache';

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

  if (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN') {
    throw new Error('Sin permisos para crear sucursales. Se requiere rol ADMIN.');
  }

  const [branch] = await db.insert(branches).values({
    tenantId: session.tenantId,
    name,
    address: address ?? null,
    isActive: true,
  }).returning();

  revalidatePath('/admin');
  return branch;
}

export async function deactivateBranch(branchId: string): Promise<void> {
  const session = await getCurrentUserSession();

  if (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN') {
    throw new Error('Sin permisos para desactivar sucursales.');
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
