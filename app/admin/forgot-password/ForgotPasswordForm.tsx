'use client';

import Link from 'next/link';
import { useState } from 'react';
import { adminApi, messageForError } from '@/lib/admin/api';

type Step = 'request' | 'confirm' | 'done';

export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const data = await adminApi<{ message: string }>('/api/auth/password-reset/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMessage(data.message);
      setStep('confirm');
    } catch (caught) {
      setError(messageForError(caught, 'No fue posible enviar el código.'));
    } finally {
      setLoading(false);
    }
  }

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmation) {
      setError('La confirmación no coincide con la nueva contraseña.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await adminApi('/api/auth/password-reset/confirm', {
        method: 'POST',
        body: JSON.stringify({ email, code, newPassword }),
      });
      setStep('done');
    } catch (caught) {
      setError(messageForError(caught, 'No fue posible restablecer la contraseña.'));
    } finally {
      setLoading(false);
    }
  }

  if (step === 'done') {
    return <div className="admin-form-stack">
      <div className="admin-alert" style={{borderColor:'#7aa789'}}>Contraseña actualizada correctamente.</div>
      <Link href="/admin/login" className="admin-button admin-button--accent">Volver al inicio de sesión</Link>
    </div>;
  }

  if (step === 'confirm') {
    return <form onSubmit={confirm} noValidate>
      {message ? <div className="admin-alert" style={{borderColor:'#7aa789'}}>{message}</div> : null}
      {error ? <div className="admin-alert" role="alert">{error}</div> : null}
      <div className="admin-field"><label htmlFor="reset-email">Correo electrónico</label><input id="reset-email" type="email" value={email} disabled/></div>
      <div className="admin-field"><label htmlFor="reset-code">Código de 6 dígitos</label><input id="reset-code" inputMode="numeric" pattern="[0-9]*" maxLength={6} autoComplete="one-time-code" required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g,'').slice(0,6))} disabled={loading}/><small>El código vence en 10 minutos.</small></div>
      <div className="admin-field"><label htmlFor="reset-new-password">Nueva contraseña</label><input id="reset-new-password" type="password" autoComplete="new-password" minLength={10} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={loading}/><small>Mínimo 10 caracteres; combina letras con números o símbolos.</small></div>
      <div className="admin-field"><label htmlFor="reset-confirm-password">Confirmar contraseña</label><input id="reset-confirm-password" type="password" autoComplete="new-password" minLength={10} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={loading}/></div>
      <button type="submit" className="admin-button admin-button--accent" disabled={loading || code.length !== 6 || newPassword.length < 10 || !confirmation}>{loading ? 'Actualizando…' : 'Restablecer contraseña'}</button>
      <button type="button" className="admin-button admin-button--quiet" disabled={loading} onClick={() => { setStep('request'); setCode(''); setError(''); setMessage(''); }}>Solicitar otro código</button>
    </form>;
  }

  return <form onSubmit={requestCode} noValidate>
    {error ? <div className="admin-alert" role="alert">{error}</div> : null}
    <div className="admin-field">
      <label htmlFor="forgot-email">Correo electrónico</label>
      <input id="forgot-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading}/>
    </div>
    <button type="submit" className="admin-button admin-button--accent" disabled={loading || !email}>{loading ? 'Enviando…' : 'Enviar código'}</button>
    <Link href="/admin/login" className="admin-button admin-button--quiet">Volver al inicio de sesión</Link>
  </form>;
}
