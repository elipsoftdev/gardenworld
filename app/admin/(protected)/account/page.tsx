import Link from 'next/link';
import { formatDate } from '@/lib/admin/api';
import { requireAuth } from '@/lib/auth/guard';

export default async function AccountPage() {
  const { user } = await requireAuth();
  return <><header className="admin-page-head"><div><p className="admin-kicker">Perfil</p><h2>Mi cuenta</h2><p>Información de la cuenta con la que accediste al panel.</p></div></header><section className="admin-panel" style={{maxWidth:720}}><div className="admin-panel__head"><h2>Datos de la cuenta</h2></div><div className="admin-panel__body"><dl style={{margin:0,display:'grid',gap:'1rem'}}><div><dt className="admin-meta">Nombre</dt><dd style={{margin:'.15rem 0 0',fontWeight:700}}>{user.name}</dd></div><div><dt className="admin-meta">Email</dt><dd style={{margin:'.15rem 0 0'}}>{user.email}</dd></div><div><dt className="admin-meta">Rol</dt><dd style={{margin:'.15rem 0 0'}}>{user.role === 'super_admin' ? 'Super Admin' : 'Admin'}</dd></div><div><dt className="admin-meta">Último acceso</dt><dd style={{margin:'.15rem 0 0'}}>{formatDate(user.last_login_at)}</dd></div></dl><div className="admin-divider"/><Link className="admin-button admin-button--quiet" href="/admin/change-password">Cambiar contraseña</Link></div></section></>;
}
