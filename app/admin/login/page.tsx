import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/guard';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  try {
    const { user } = await requireAuth();
    redirect(user.must_change_password === 1 ? '/admin/change-password' : '/admin');
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error) throw error;
  }

  return <main className="admin-auth">
    <section className="admin-auth__panel" aria-labelledby="login-title">
      <div className="admin-auth__brand"><img src="/images/brand/garden-world-logo-original.png" alt="" aria-hidden="true" /><div><strong>Garden World</strong><small>Administración</small></div></div>
      <p className="admin-kicker">Acceso privado</p>
      <h1 id="login-title">Bienvenido</h1>
      <p className="admin-auth__intro">Ingresa con tu cuenta administrativa para gestionar el catálogo.</p>
      <LoginForm />
      <p className="admin-auth__note">Las sesiones se protegen mediante una cookie segura. Nunca guardamos credenciales en el navegador.</p>
    </section>
  </main>;
}
