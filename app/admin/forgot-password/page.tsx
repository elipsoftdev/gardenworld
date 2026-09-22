import Link from 'next/link';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  return <main className="admin-auth"><section className="admin-auth__panel" aria-labelledby="forgot-title">
    <div className="admin-auth__brand"><img src="/images/brand/garden-world-logo-original.png" alt="" aria-hidden="true" /><div><strong>Garden World</strong><small>Administración</small></div></div>
    <p className="admin-kicker">Recuperación de acceso</p>
    <h1 id="forgot-title">Restablecer contraseña</h1>
    <p className="admin-auth__intro">Ingresa el correo de tu cuenta. Te enviaremos un código de verificación de un solo uso.</p>
    <ForgotPasswordForm />
    <div style={{marginTop:'1rem',textAlign:'center'}}><Link href="/admin/login" className="admin-text-button">Volver al acceso</Link></div>
  </section></main>;
}
