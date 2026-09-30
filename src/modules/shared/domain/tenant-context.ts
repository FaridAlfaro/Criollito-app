export interface TenantContext {
  tenantId: string;
  branchId: string | null;
  userId: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISOR' | 'BAKER' | 'CASHIER';
  name?: string;
}

export interface RequestContext {
  tenant: TenantContext;
  idempotencyKey?: string | null;
  clientIp?: string;
  userAgent?: string;
}
