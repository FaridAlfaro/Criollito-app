import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { apiKeys } from '@/db/schema';
import { 
  IApiKeyRepository, 
  CreateApiKeyInput 
} from '../domain/repositories';
import { ApiKey, Role } from '../domain/entities';
import { DrizzleTransaction, DbOrTx } from '@/modules/shared/infrastructure/transaction';

export class DrizzleApiKeyRepository implements IApiKeyRepository {
  private getClient(tx?: DrizzleTransaction): DbOrTx {
    return tx || db;
  }

  async createApiKey(
    data: CreateApiKeyInput, 
    tx?: DrizzleTransaction
  ): Promise<ApiKey> {
    const client = this.getClient(tx);

    const [key] = await client.insert(apiKeys).values({
      tenantId: data.tenantId,
      branchId: data.branchId || null,
      name: data.name,
      keyHash: data.keyHash,
      keyPrefix: data.keyPrefix,
      role: data.role,
      isActive: true,
    }).returning();

    return {
      id: key.id,
      tenantId: key.tenantId,
      branchId: key.branchId,
      name: key.name,
      keyHash: key.keyHash,
      keyPrefix: key.keyPrefix,
      role: key.role as Role,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
    };
  }

  async findApiKeyByHash(
    keyHash: string, 
    tx?: DrizzleTransaction
  ): Promise<ApiKey | null> {
    const client = this.getClient(tx);

    const [key] = await client
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)));

    if (!key) return null;

    return {
      id: key.id,
      tenantId: key.tenantId,
      branchId: key.branchId,
      name: key.name,
      keyHash: key.keyHash,
      keyPrefix: key.keyPrefix,
      role: key.role as Role,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
    };
  }

  async updateLastUsed(
    id: string, 
    timestamp: Date, 
    tx?: DrizzleTransaction
  ): Promise<void> {
    const client = this.getClient(tx);

    await client
      .update(apiKeys)
      .set({ lastUsedAt: timestamp })
      .where(eq(apiKeys.id, id));
  }

  async listApiKeys(
    tenantId: string, 
    tx?: DrizzleTransaction
  ): Promise<ApiKey[]> {
    const client = this.getClient(tx);

    const rows = await client
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.tenantId, tenantId));

    return rows.map(key => ({
      id: key.id,
      tenantId: key.tenantId,
      branchId: key.branchId,
      name: key.name,
      keyHash: key.keyHash,
      keyPrefix: key.keyPrefix,
      role: key.role as Role,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
    }));
  }

  async revokeApiKey(
    tenantId: string, 
    id: string, 
    tx?: DrizzleTransaction
  ): Promise<void> {
    const client = this.getClient(tx);

    await client
      .update(apiKeys)
      .set({ isActive: false })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.tenantId, tenantId)));
  }
}
