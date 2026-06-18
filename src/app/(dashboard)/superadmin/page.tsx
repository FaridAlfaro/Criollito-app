import { db } from '@/db';
import { tenants, users, subscriptionPayments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import SuperAdminClient from './SuperAdminClient';

export const revalidate = 0; // Disable server cache for this dashboard page

export default async function SuperAdminPage() {
  const allTenants = await db.select().from(tenants);
  const allUsers = await db.select().from(users);
  
  const allPayments = await db.select().from(subscriptionPayments);
  
  return (
    <SuperAdminClient 
      initialTenants={allTenants} 
      initialAdmins={allUsers.filter(u => u.role === 'ADMIN')}
      initialPayments={allPayments.map(p => ({
        id: p.id,
        tenantId: p.tenantId,
        amount: parseFloat(p.amount),
        period: p.period,
        status: p.status as 'PENDING' | 'PAID',
        dueDate: p.dueDate,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      }))}
    />
  );
}
