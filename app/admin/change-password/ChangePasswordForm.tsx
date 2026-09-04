'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { adminApi, messageForError } from '@/lib/admin/api';

export function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmation) {
      setError('La confirmación no coincide con la nueva contraseña.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await adminApi('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      router.replace('/admin');
      router.refresh();
    } catch (caught) {
      setError(messageForError(caught, 'No fue posible cambiar la contraseña.'));
    } finally {
      setLoading(false);
    }
  }

  return <form onSubmit={submit} noValidate>
    {error ? <div className="admin-alert" role="alert">{error}</div> : null}
    <div className="admin-field"><label htmlFor="current-password">Contraseña actual</label><input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={loading}/></div>
    <div className="admin-field"><label htmlFor="new-password">Nueva contraseña</label><input id="new-password" type="password" autoComplete="new-password" minLength={10} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={loading}/><small>Mínimo 10 caracteres; combina letras con números o símbolos.</small></div>
    <div className="admin-field"><label htmlFor="confirm-password">Confirmar nueva contraseña</label><input id="confirm-password" type="password" autoComplete="new-password" minLength={10} required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} disabled={loading}/></div>
    <button type="submit" className="admin-button admin-button--accent" disabled={loading || !currentPassword || newPassword.length < 10 || !confirmation}>{loading ? 'Actualizando…' : 'Cambiar contraseña'}</button>
  </form>;
}
