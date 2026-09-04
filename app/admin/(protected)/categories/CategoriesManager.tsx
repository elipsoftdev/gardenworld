'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminApiError, adminApi, messageForError, slugFromName } from '@/lib/admin/api';
import type { Category, Upload } from '@/lib/admin/types';
import { EmptyState, LoadingBlock } from '../../components/Loading';
import { Modal } from '../../components/Modal';
import { OrderList } from '../../components/OrderList';
import { useAdmin } from '../../components/AdminShell';

type CategoryForm = { name: string; slug: string; description: string; imagePath: string; parentId: string; published: boolean; showInMenu: boolean; showOnHome: boolean; indexable: boolean; seoTitle: string; seoDescription: string };
const empty: CategoryForm = { name: '', slug: '', description: '', imagePath: '', parentId: '', published: false, showInMenu: false, showOnHome: false, indexable: true, seoTitle: '', seoDescription: '' };

export function CategoriesManager() {
  const { notify } = useAdmin();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [form, setForm] = useState<CategoryForm>(empty);
  const [pendingArchive, setPendingArchive] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { const data = await adminApi<{ categories: Category[] }>('/api/admin/categories'); setCategories(data.categories); }
    catch (caught) { setError(messageForError(caught)); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function openEditor(category?: Category) {
    setError(''); setEditing(category ?? 'new');
    setForm(category ? { name: category.name, slug: category.slug, description: category.description ?? '', imagePath: category.imagePath ?? '', parentId: category.parentId?.toString() ?? '', published: category.published, showInMenu: category.showInMenu, showOnHome: category.showOnHome, indexable: category.indexable, seoTitle: category.seoTitle ?? '', seoDescription: category.seoDescription ?? '' } : empty);
  }
  function update<K extends keyof CategoryForm>(key: K, value: CategoryForm[K]) { setForm((current) => ({...current, [key]: value})); }

  async function uploadImage(file?: File) {
    if (!file) return;
    setBusy(true);
    try { const body = new FormData(); body.set('file', file); const { upload } = await adminApi<{ upload: Upload }>('/api/admin/uploads', {method: 'POST', body}); update('imagePath', upload.path); notify('Imagen subida'); }
    catch (caught) { setError(messageForError(caught)); }
    finally { setBusy(false); }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const payload = { name: form.name, slug: form.slug || undefined, description: form.description || null, imagePath: form.imagePath || null, parentId: form.parentId ? Number(form.parentId) : null, published: form.published, showInMenu: form.showInMenu, showOnHome: form.showOnHome, indexable: form.indexable, seoTitle: form.seoTitle || null, seoDescription: form.seoDescription || null };
      const endpoint = editing === 'new' ? '/api/admin/categories' : `/api/admin/categories/${editing?.id}`;
      await adminApi(endpoint, {method: editing === 'new' ? 'POST' : 'PUT', body: JSON.stringify(payload)});
      notify('Categoría guardada'); setEditing(null); await load();
    } catch (caught) { setError(messageForError(caught)); }
    finally { setBusy(false); }
  }

  async function reorder(next: Category[]) {
    setCategories(next); setBusy(true);
    try { const data = await adminApi<{ categories: Category[] }>('/api/admin/categories/order', {method: 'PUT', body: JSON.stringify({ids: next.map((item) => item.id)})}); setCategories(data.categories); notify('Orden actualizado'); }
    catch (caught) { notify(messageForError(caught), 'error'); await load(); }
    finally { setBusy(false); }
  }

  async function archive() {
    if (!pendingArchive) return;
    setBusy(true);
    try { await adminApi(`/api/admin/categories/${pendingArchive.id}`, {method: 'DELETE'}); notify('Categoría archivada'); setPendingArchive(null); await load(); }
    catch (caught) {
      const message = caught instanceof AdminApiError && caught.status === 409
        ? (caught.details?.activeProducts ? 'No puedes archivar esta categoría porque aún contiene productos.' : 'No puedes archivar esta categoría porque aún contiene categorías hijas.')
        : messageForError(caught);
      notify(message, 'error'); setPendingArchive(null);
    } finally { setBusy(false); }
  }

  const hierarchy = useMemo(() => {
    if (!categories) return [];
    const depth = (category: Category) => { let result = 0; let parent = categories.find((item) => item.id === category.parentId); const seen = new Set<number>(); while (parent && !seen.has(parent.id)) { seen.add(parent.id); result++; parent = categories.find((item) => item.id === parent?.parentId); } return result; };
    return categories.map((category) => ({...category, depth: depth(category)}));
  }, [categories]);

  return <>
    <header className="admin-page-head"><div><p className="admin-kicker">Estructura del catálogo</p><h2>Categorías</h2><p>Organiza la jerarquía y controla dónde aparece cada categoría.</p></div><button type="button" className="admin-button admin-button--accent" onClick={() => openEditor()}>＋ Nueva categoría</button></header>
    {error && !editing ? <div className="admin-alert" role="alert">{error}</div> : null}
    <section className="admin-panel"><div className="admin-panel__head"><div><h2>Jerarquía y orden</h2><p>Arrastra o utiliza las flechas. El guardado se realiza en una sola operación.</p></div></div><div className="admin-panel__body">
      {!categories ? <LoadingBlock rows={5}/> : hierarchy.length === 0 ? <EmptyState title="No hay categorías todavía."/> : <OrderList items={hierarchy} itemKey={(item) => item.id} label="Orden de categorías" disabled={busy} onReorder={reorder} render={(category) => <div style={{paddingLeft: `${category.depth * 1.2}rem`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.8rem'}}><span><strong>{category.depth ? '↳ ' : ''}{category.name}</strong><small>{category.published ? 'Publicada' : 'No publicada'} · /{category.slug}</small></span><span className="admin-button-row"><button type="button" className="admin-text-button" onClick={() => openEditor(category)}>Editar</button><button type="button" className="admin-text-button admin-text-button--danger" onClick={() => setPendingArchive(category)}>Archivar</button></span></div>}/>}
    </div></section>

    <Modal open={editing !== null} title={editing === 'new' ? 'Nueva categoría' : 'Editar categoría'} onClose={() => { if (!busy) setEditing(null); }}>
      <form id="category-form" className="admin-form-stack" onSubmit={save}>
        {error ? <div className="admin-alert" role="alert">{error}</div> : null}
        <div className="admin-fields">
          <div className="admin-field admin-field--full"><label htmlFor="category-name">Nombre</label><input id="category-name" required minLength={2} value={form.name} onChange={(e) => setForm((current) => ({...current, name: e.target.value, slug: editing === 'new' ? slugFromName(e.target.value) : current.slug}))}/></div>
          <div className="admin-field admin-field--full"><label htmlFor="category-slug">Slug</label><input id="category-slug" value={form.slug} onChange={(e) => update('slug', slugFromName(e.target.value))}/></div>
          <div className="admin-field admin-field--full"><label htmlFor="category-parent">Categoría padre</label><select id="category-parent" value={form.parentId} onChange={(e) => update('parentId', e.target.value)}><option value="">Sin categoría padre</option>{categories?.filter((item) => editing === 'new' || editing === null || item.id !== editing.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
          <div className="admin-field admin-field--full"><label htmlFor="category-description">Descripción</label><textarea id="category-description" value={form.description} onChange={(e) => update('description', e.target.value)}/></div>
          <div className="admin-field admin-field--full"><label htmlFor="category-image">Imagen</label><input id="category-image" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => void uploadImage(e.target.files?.[0])}/>{form.imagePath ? <small>Imagen cargada: {form.imagePath}</small> : null}</div>
          <div className="admin-field admin-field--full"><label htmlFor="category-seo-title">SEO title</label><input id="category-seo-title" value={form.seoTitle} onChange={(e) => update('seoTitle', e.target.value)}/></div>
          <div className="admin-field admin-field--full"><label htmlFor="category-seo-description">SEO description</label><textarea id="category-seo-description" value={form.seoDescription} onChange={(e) => update('seoDescription', e.target.value)}/></div>
        </div>
        <div className="admin-checks"><label className="admin-check"><input type="checkbox" checked={form.published} onChange={(e) => update('published', e.target.checked)}/>Publicada</label><label className="admin-check"><input type="checkbox" checked={form.showInMenu} onChange={(e) => update('showInMenu', e.target.checked)}/>Mostrar en menú</label><label className="admin-check"><input type="checkbox" checked={form.showOnHome} onChange={(e) => update('showOnHome', e.target.checked)}/>Mostrar en Home</label><label className="admin-check"><input type="checkbox" checked={form.indexable} onChange={(e) => update('indexable', e.target.checked)}/>Permitir indexación</label></div>
        <div className="admin-modal__actions"><button type="button" className="admin-button admin-button--quiet" disabled={busy} onClick={() => setEditing(null)}>Cancelar</button><button type="submit" className="admin-button" disabled={busy || form.name.length < 2}>{busy ? 'Guardando…' : 'Guardar categoría'}</button></div>
      </form>
    </Modal>
    <Modal open={Boolean(pendingArchive)} title="Archivar categoría" description={`“${pendingArchive?.name ?? ''}” dejará de mostrarse en el catálogo, menú y Home.`} confirmLabel="Archivar" destructive busy={busy} onClose={() => setPendingArchive(null)} onConfirm={archive}/>
  </>;
}
