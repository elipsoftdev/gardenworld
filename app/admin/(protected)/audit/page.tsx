import { redirect } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/auth/guard';
import { AuditLog } from './AuditLog';
export default async function AuditPage() { try { await requireSuperAdmin(); } catch { redirect('/admin'); } return <AuditLog/>; }
