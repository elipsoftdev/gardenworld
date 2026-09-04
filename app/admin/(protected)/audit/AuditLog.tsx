'use client';

import { useEffect, useState } from 'react';
import { adminApi, formatDate, messageForError } from '@/lib/admin/api';
import type { AdminUser, AuditEntry } from '@/lib/admin/types';
import { EmptyState, LoadingBlock } from '../../components/Loading';

const actions: Record<string, string> = {
  'product.create': 'Producto creado', 'product.update': 'Producto actualizado', 'product.publish': 'Producto publicado',
  'product.unpublish': 'Producto ocultado', 'product.archive': 'Producto archivado', 'product.price_change': 'Precio modificado',
  'product.feature': 'Destacado modificado', 'product.sale_change': 'Oferta modificada', 'product.order_change': 'Orden de cards modificado',
  'product.image_add': 'Imagen añadida', 'product.image_delete': 'Imagen eliminada', 'product.image_order_change': 'Orden de imágenes modificado',
  'product.spec_change': 'Especificaciones modificadas', 'category.create': 'Categoría creada', 'category.update': 'Categoría actualizada',
  'category.archive': 'Categoría archivada', 'category.order_change': 'Orden de categorías modificado', 'home.section_update': 'Sección del Home actualizada',
  'home.order_change': 'Orden del Home modificado', 'user.create': 'Usuario creado', 'user.update': 'Usuario actualizado',
  'user.disable': 'Usuario desactivado', 'user.enable': 'Usuario activado', 'user.password_change': 'Contraseña modificada',
  'auth.login': 'Inicio de sesión', 'auth.logout': 'Cierre de sesión', 'upload.create': 'Archivo subido', 'upload.delete': 'Archivo eliminado',
};

export function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { Promise.all([adminApi<{entries:AuditEntry[]}>('/api/admin/audit?limit=200'), adminApi<{users:AdminUser[]}>('/api/admin/users')]).then(([audit, people]) => {setEntries(audit.entries);setUsers(people.users);}).catch((caught) => setError(messageForError(caught))); }, []);
  return <><header className="admin-page-head"><div><p className="admin-kicker">Solo Super Admin</p><h2>Auditoría</h2><p>Consulta las acciones administrativas más recientes sin exponer información sensible.</p></div></header>{error ? <div className="admin-alert" role="alert">{error}</div> : null}<section className="admin-panel">{!entries ? <LoadingBlock rows={7}/> : entries.length === 0 ? <EmptyState title="No hay registros."/> : <div className="admin-table-wrap" style={{display:'block'}}><table className="admin-table"><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id}><td>{formatDate(entry.createdAt)}</td><td>{users.find((user) => user.id === entry.userId)?.name || (entry.userId ? `Usuario #${entry.userId}` : 'Sistema')}</td><td><strong>{actions[entry.action] || entry.action}</strong></td><td>{entry.entityType ? `${entry.entityType}${entry.entityId ? ` #${entry.entityId}` : ''}` : '—'}</td><td>{entry.details ? <details><summary className="admin-text-button">Ver detalle</summary><dl style={{margin:'.6rem 0 0',display:'grid',gridTemplateColumns:'auto 1fr',gap:'.25rem .6rem'}}>{Object.entries(entry.details).map(([key,value]) => <div key={key} style={{display:'contents'}}><dt style={{color:'#66756f'}}>{key}</dt><dd style={{margin:0}}>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd></div>)}</dl></details> : '—'}</td></tr>)}</tbody></table></div>}</section></>;
}
