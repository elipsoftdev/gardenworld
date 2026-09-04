'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, formatDate, messageForError } from '@/lib/admin/api';
import type { AdminUser } from '@/lib/admin/types';
import { EmptyState, LoadingBlock } from '../../components/Loading';
import { Modal } from '../../components/Modal';
import { useAdmin } from '../../components/AdminShell';

export function UsersManager() {
  const { notify } = useAdmin();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDisable, setPendingDisable] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({name: '', email: '', password: ''});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => { try { const data = await adminApi<{users: AdminUser[]}>('/api/admin/users'); setUsers(data.users); } catch (caught) { setError(messageForError(caught)); } }, []);
  useEffect(() => { void load(); }, [load]);

  async function create(event: React.FormEvent) { event.preventDefault(); setBusy(true); setError(''); try { await adminApi('/api/admin/users', {method: 'POST', body: JSON.stringify(form)}); notify('Usuario creado'); setCreating(false); setForm({name:'',email:'',password:''}); await load(); } catch (caught) { setError(messageForError(caught)); } finally { setBusy(false); } }
  async function setActive(user: AdminUser, active: boolean) { setBusy(true); try { await adminApi(`/api/admin/users/${user.id}`, {method: 'PUT', body: JSON.stringify({active})}); notify(active ? 'Usuario activado' : 'Usuario desactivado'); setPendingDisable(null); await load(); } catch (caught) { notify(messageForError(caught), 'error'); } finally { setBusy(false); } }

  return <><header className="admin-page-head"><div><p className="admin-kicker">Solo Super Admin</p><h2>Usuarios</h2><p>Crea administradores y controla su acceso al backoffice.</p></div><button type="button" className="admin-button admin-button--accent" onClick={() => setCreating(true)}>＋ Crear administrador</button></header>
    {error && !creating ? <div className="admin-alert" role="alert">{error}</div> : null}
    <section className="admin-panel">{!users ? <LoadingBlock rows={4}/> : users.length === 0 ? <EmptyState title="No hay usuarios."/> : <><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.name}</strong></td><td>{user.email}</td><td>{user.role === 'super_admin' ? 'Super Admin' : 'Admin'}</td><td><span className={`admin-badge ${user.active ? 'admin-badge--published' : 'admin-badge--archived'}`}>{user.active ? 'Activo' : 'Inactivo'}</span></td><td>{formatDate(user.lastLoginAt)}</td><td>{user.active ? <button type="button" className="admin-text-button admin-text-button--danger" onClick={() => setPendingDisable(user)}>Desactivar</button> : <button type="button" className="admin-text-button" disabled={busy} onClick={() => setActive(user, true)}>Activar</button>}</td></tr>)}</tbody></table></div><div className="admin-mobile-list">{users.map((user) => <article key={user.id} className="admin-mobile-card"><div className="admin-mobile-card__copy"><h3>{user.name}</h3><p>{user.email}</p><div className="admin-badges"><span className="admin-badge">{user.role === 'super_admin' ? 'Super Admin' : 'Admin'}</span><span className={`admin-badge ${user.active ? 'admin-badge--published' : 'admin-badge--archived'}`}>{user.active ? 'Activo' : 'Inactivo'}</span></div></div><div className="admin-mobile-card__actions">{user.active ? <button type="button" className="admin-text-button admin-text-button--danger" onClick={() => setPendingDisable(user)}>Desactivar</button> : <button type="button" className="admin-text-button" onClick={() => setActive(user,true)}>Activar</button>}</div></article>)}</div></>}</section>
    <Modal open={creating} title="Crear administrador" onClose={() => !busy && setCreating(false)}><form className="admin-form-stack" onSubmit={create}>{error ? <div className="admin-alert" role="alert">{error}</div> : null}<div className="admin-field"><label htmlFor="user-name">Nombre</label><input id="user-name" required minLength={2} value={form.name} onChange={(e) => setForm({...form,name:e.target.value})}/></div><div className="admin-field"><label htmlFor="user-email">Email</label><input id="user-email" type="email" autoComplete="off" required value={form.email} onChange={(e) => setForm({...form,email:e.target.value})}/></div><div className="admin-field"><label htmlFor="user-password">Contraseña temporal</label><input id="user-password" type="password" autoComplete="new-password" minLength={10} required value={form.password} onChange={(e) => setForm({...form,password:e.target.value})}/><small>El administrador deberá cambiarla al iniciar sesión.</small></div><div className="admin-modal__actions"><button type="button" className="admin-button admin-button--quiet" onClick={() => setCreating(false)} disabled={busy}>Cancelar</button><button type="submit" className="admin-button" disabled={busy || form.password.length < 10}>{busy ? 'Creando…' : 'Crear administrador'}</button></div></form></Modal>
    <Modal open={Boolean(pendingDisable)} title="Desactivar usuario" description={`“${pendingDisable?.name ?? ''}” perderá acceso y sus sesiones activas se cerrarán.`} confirmLabel="Desactivar" destructive busy={busy} onClose={() => setPendingDisable(null)} onConfirm={() => pendingDisable && setActive(pendingDisable,false)}/>
  </>;
}
