import { db } from '@/db';
import { tenants } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUserSession } from '@/lib/auth-session';
import { getTenantEmployees } from '@/actions/employees';
import AdminUsuariosClient from './AdminUsuariosClient';

export const revalidate = 0; // Disable server cache for this dashboard page

export default async function AdminUsuariosPage() {
  const session = await getCurrentUserSession();
  
  // 1. Fetch only this tenant's employees (tenant isolation)
  const tenantEmployees = await getTenantEmployees();
  
  // 2. Fetch tenant name to display in the header
  let tenantName = 'Mi Panadería';
  if (session.tenantId) {
    const [tenant] = await db.select()
      .from(tenants)
      .where(eq(tenants.id, session.tenantId));
    if (tenant) {
      tenantName = tenant.name;
    }
  }

  return (
    <AdminUsuariosClient 
      initialEmployees={tenantEmployees} 
      tenantName={tenantName} 
    />
  );
}
