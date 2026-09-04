import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/guard';
import type { AdminUser } from '@/lib/admin/types';
import { AdminShell } from '../components/AdminShell';

export const dynamic = 'force-dynamic';

export default function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  let user: AdminUser;
  try {
    const context = requireAuth();
    user = {
      id: context.user.id,
      name: context.user.name,
      email: context.user.email,
      role: context.user.role,
      mustChangePassword: context.user.must_change_password === 1,
      lastLoginAt: context.user.last_login_at,
    };
  } catch {
    redirect('/admin/login');
  }
  if (user.mustChangePassword) redirect('/admin/change-password');
  return <AdminShell initialUser={user}>{children}</AdminShell>;
}
