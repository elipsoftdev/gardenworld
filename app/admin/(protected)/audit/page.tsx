import { redirect } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/auth/guard';
import { AuditLog } from './AuditLog';
export default function AuditPage() { try { requireSuperAdmin(); } catch { redirect('/admin'); } return <AuditLog/>; }
