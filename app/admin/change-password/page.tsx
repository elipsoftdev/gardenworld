import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/guard';
import { ChangePasswordForm } from './ChangePasswordForm';

export const dynamic = 'force-dynamic';

export default async function ChangePasswordPage() {
  let required = false;
  try {
    const { user } = await requireAuth();
    required = user.must_change_password === 1;
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error) throw error;
    redirect('/admin/login');
  }

  return <main className="admin-auth"><section className="admin-auth__panel" aria-labelledby="password-title">
    <div className="admin-auth__brand"><span>GW</span><div><strong>Garden World</strong><small>Administración</small></div></div>
    <p className="admin-kicker">Seguridad de la cuenta</p>
    <h1 id="password-title">{required ? 'Crea tu contraseña' : 'Cambia tu contraseña'}</h1>
    <p className="admin-auth__intro">{required ? 'Debes reemplazar la contraseña temporal antes de usar el panel.' : 'Confirma tu contraseña actual y define una nueva.'}</p>
    <ChangePasswordForm />
  </section></main>;
}
