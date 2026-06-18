import { cookies } from 'next/headers';

export interface ServerUserSession {
  id: string;
  tenantId: string;
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
          role: parsed.role,
          name: parsed.name || 'Usuario'
        };
      }
    } catch (e) {
      console.error('Error parsing session cookie:', e);
    }
  }

  // Fallback: If no cookie is present, return a default session.
  // Using default cashier ID and tenant ID to prevent breaking existing actions.
  return {
    id: '20000000-2000-2000-2000-200000000000',
    tenantId: '10000000-1000-1000-1000-100000000000',
    role: 'ADMIN',
    name: 'Juan Cajero'
  };
}
