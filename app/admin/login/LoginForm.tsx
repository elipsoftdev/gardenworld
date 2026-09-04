'use client';

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
      <input id="login-password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading}/>
    </div>
    <button type="submit" className="admin-button admin-button--accent" disabled={loading || !email || !password}>{loading ? 'Ingresando…' : 'Ingresar'}</button>
  </form>;
}
