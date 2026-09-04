import { redirect } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/auth/guard';
import { UsersManager } from './UsersManager';

export default async function UsersPage() { try { await requireSuperAdmin(); } catch { redirect('/admin'); } return <UsersManager/>; }
