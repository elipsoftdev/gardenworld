'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AdminApiError, adminApi, messageForError } from '@/lib/admin/api';
import type { AdminUser } from '@/lib/admin/types';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user } = await adminApi<{ user: AdminUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const verified = await adminApi<{ user: AdminUser }>('/api/auth/me');
      const destination = user.mustChangePassword || verified.user.mustChangePassword
        ? '/admin/change-password'
        : '/admin';
      router.replace(destination);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof AdminApiError && caught.status === 401
        ? 'Correo o contraseña incorrectos.'
        : messageForError(caught, 'No fue posible iniciar sesión.'));
    } finally {
      setLoading(false);
    }
  }

  return <form onSubmit={submit} noValidate>
    {error ? <div className="admin-alert" role="alert">{error}</div> : null}
    <div className="admin-field">
      <label htmlFor="login-email">Correo electrónico</label>
      <input id="login-email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading}/>
    </div>
    <div className="admin-field">
      <label htmlFor="login-password">Contraseña</label>
      <div style={{position:'relative'}}>
        <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading} style={{paddingRight:'3.25rem'}}/>
        <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} disabled={loading} style={{position:'absolute',right:'.55rem',top:'50%',transform:'translateY(-50%)',width:'2.25rem',height:'2.25rem',border:0,background:'transparent',display:'grid',placeItems:'center',cursor:'pointer'}}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {showPassword ? <><path d="m3 3 18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9.3 5.4 9.5 5.8a.4.4 0 0 1 0 .4 18.5 18.5 0 0 1-3.1 3.8"/><path d="M6.3 6.3a18.3 18.3 0 0 0-3.8 3.5.4.4 0 0 0 0 .4C2.7 10.6 6.5 16 12 16c.9 0 1.8-.2 2.6-.5"/></> : <><path d="M2.5 12s3.8-6 9.5-6 9.5 6 9.5 6-3.8 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></>}
          </svg>
        </button>
      </div>
    </div>
    <div style={{display:'flex',justifyContent:'flex-end',marginTop:'-.35rem',marginBottom:'1rem'}}>
      <Link href="/admin/forgot-password" className="admin-text-button">¿Olvidaste tu contraseña?</Link>
    </div>
    <button type="submit" className="admin-button admin-button--accent" disabled={loading || !email || !password}>{loading ? 'Ingresando…' : 'Ingresar'}</button>
  </form>;
}
