import { redirect } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/auth/guard';
import { UsersManager } from './UsersManager';

export default function UsersPage() { try { requireSuperAdmin(); } catch { redirect('/admin'); } return <UsersManager/>; }
