import { cookies } from 'next/headers';

export interface ServerUserSession {
  id: string;
  tenantId: string;
  branchId: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISOR' | 'BAKER' | 'CASHIER';
  name: string;
}

export async function getCurrentUserSession(): Promise<ServerUserSession> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');

  if (sessionCookie?.value) {
    try {
      const parsed = JSON.parse(sessionCookie.value);
      if (parsed.id && parsed.tenantId && parsed.role) {
        return {
          id: parsed.id,
          tenantId: parsed.tenantId,
          branchId: parsed.branchId ?? null,
          role: parsed.role,
          name: parsed.name || 'Usuario',
        };
      }
    } catch (e) {
      console.error('Error parsing session cookie:', e);
    }
  }

  throw new Error('No autenticado. Por favor inicie sesión.');
}
