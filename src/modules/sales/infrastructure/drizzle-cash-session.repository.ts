import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { cashSessions, cashMovements, users } from '@/db/schema';
import { 
  ICashSessionRepository, 
  CreateSessionInput, 
  UpdateSessionClosingInput, 
  CreateMovementInput 
} from '../domain/repositories';
import { CashSession, CashMovement } from '../domain/entities';
import { DrizzleTransaction, DbOrTx } from '@/modules/shared/infrastructure/transaction';

export class DrizzleCashSessionRepository implements ICashSessionRepository {
  private getClient(tx?: DrizzleTransaction): DbOrTx {
    return tx || db;
  }

  async findActiveSession(
    tenantId: string, 
    cashierId: string, 
    tx?: DrizzleTransaction
  ): Promise<CashSession | null> {
    const client = this.getClient(tx);
    const session = await client.query.cashSessions.findFirst({
      where: (cs, { and, eq, isNull }) => and(
        eq(cs.tenantId, tenantId),
        eq(cs.cashierId, cashierId),
        isNull(cs.closedAt)
      )
    });

    if (!session) return null;

    return {
      id: session.id,
      tenantId: session.tenantId,
      branchId: session.branchId,
      cashierId: session.cashierId,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      initialAmount: session.initialAmount,
      finalAmount: session.finalAmount,
      totalSales: session.totalSales,
      totalCash: session.totalCash,
      totalDebit: session.totalDebit,
      totalCredit: session.totalCredit,
      totalQr: session.totalQr,
      theoreticalAmount: session.theoreticalAmount,
      difference: session.difference,
    };
  }

  async findSessionById(
    tenantId: string, 
    sessionId: string, 
    tx?: DrizzleTransaction
  ): Promise<CashSession | null> {
    const client = this.getClient(tx);
    const [session] = await client
      .select()
      .from(cashSessions)
      .where(and(eq(cashSessions.id, sessionId), eq(cashSessions.tenantId, tenantId)));

    if (!session) return null;

    return {
      id: session.id,
      tenantId: session.tenantId,
      branchId: session.branchId,
      cashierId: session.cashierId,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      initialAmount: session.initialAmount,
      finalAmount: session.finalAmount,
      totalSales: session.totalSales,
      totalCash: session.totalCash,
      totalDebit: session.totalDebit,
      totalCredit: session.totalCredit,
      totalQr: session.totalQr,
      theoreticalAmount: session.theoreticalAmount,
      difference: session.difference,
    };
  }

  async createSession(
    input: CreateSessionInput, 
    tx?: DrizzleTransaction
  ): Promise<CashSession> {
    const client = this.getClient(tx);
    const [newSession] = await client.insert(cashSessions).values({
      tenantId: input.tenantId,
      branchId: input.branchId || null,
      cashierId: input.cashierId,
      initialAmount: input.initialAmount.toString(),
      theoreticalAmount: input.initialAmount.toString(),
    }).returning();

    return {
      id: newSession.id,
      tenantId: newSession.tenantId,
      branchId: newSession.branchId,
      cashierId: newSession.cashierId,
      openedAt: newSession.openedAt,
      closedAt: newSession.closedAt,
      initialAmount: newSession.initialAmount,
      finalAmount: newSession.finalAmount,
      totalSales: newSession.totalSales,
      totalCash: newSession.totalCash,
      totalDebit: newSession.totalDebit,
      totalCredit: newSession.totalCredit,
      totalQr: newSession.totalQr,
      theoreticalAmount: newSession.theoreticalAmount,
      difference: newSession.difference,
    };
  }

  async closeSession(
    tenantId: string, 
    sessionId: string, 
    input: UpdateSessionClosingInput, 
    tx?: DrizzleTransaction
  ): Promise<CashSession> {
    const client = this.getClient(tx);
    const [updated] = await client.update(cashSessions)
      .set({
        closedAt: input.closedAt,
        finalAmount: input.finalAmount.toString(),
        totalSales: input.totalSales.toString(),
        totalCash: input.totalCash.toString(),
        totalDebit: input.totalDebit.toString(),
        totalCredit: input.totalCredit.toString(),
        totalQr: input.totalQr.toString(),
        theoreticalAmount: input.theoreticalAmount.toString(),
        difference: input.difference.toString(),
      })
      .where(and(eq(cashSessions.id, sessionId), eq(cashSessions.tenantId, tenantId)))
      .returning();

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      branchId: updated.branchId,
      cashierId: updated.cashierId,
      openedAt: updated.openedAt,
      closedAt: updated.closedAt,
      initialAmount: updated.initialAmount,
      finalAmount: updated.finalAmount,
      totalSales: updated.totalSales,
      totalCash: updated.totalCash,
      totalDebit: updated.totalDebit,
      totalCredit: updated.totalCredit,
      totalQr: updated.totalQr,
      theoreticalAmount: updated.theoreticalAmount,
      difference: updated.difference,
    };
  }

  async createMovement(
    input: CreateMovementInput, 
    tx?: DrizzleTransaction
  ): Promise<CashMovement> {
    const client = this.getClient(tx);
    const [movement] = await client.insert(cashMovements).values({
      tenantId: input.tenantId,
      branchId: input.branchId || null,
      cashSessionId: input.cashSessionId,
      cashierId: input.cashierId,
      type: input.type,
      amount: input.amount.toString(),
      description: input.description || null,
    }).returning();

    return {
      id: movement.id,
      tenantId: movement.tenantId,
      branchId: movement.branchId,
      cashSessionId: movement.cashSessionId,
      cashierId: movement.cashierId,
      type: movement.type as CashMovement['type'],
      amount: movement.amount,
      description: movement.description,
      createdAt: movement.createdAt,
    };
  }

  async findMovementsBySession(
    tenantId: string, 
    sessionId: string, 
    tx?: DrizzleTransaction
  ): Promise<CashMovement[]> {
    const client = this.getClient(tx);
    const rows = await client
      .select()
      .from(cashMovements)
      .where(and(eq(cashMovements.tenantId, tenantId), eq(cashMovements.cashSessionId, sessionId)));

    return rows.map(m => ({
      id: m.id,
      tenantId: m.tenantId,
      branchId: m.branchId,
      cashSessionId: m.cashSessionId,
      cashierId: m.cashierId,
      type: m.type as CashMovement['type'],
      amount: m.amount,
      description: m.description,
      createdAt: m.createdAt,
    }));
  }

  async findBranchWorkers(
    tenantId: string, 
    branchId?: string | null, 
    tx?: DrizzleTransaction
  ): Promise<{ id: string; name: string; role: string }[]> {
    const client = this.getClient(tx);
    const query = branchId
      ? and(eq(users.tenantId, tenantId), eq(users.branchId, branchId))
      : eq(users.tenantId, tenantId);

    const workers = await client.select().from(users).where(query);
    return workers.map(w => ({
      id: w.id,
      name: w.name,
      role: w.role,
    }));
  }
}
