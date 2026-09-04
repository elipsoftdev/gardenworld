'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi, formatMoney, messageForError } from '@/lib/admin/api';
import type { Category, Product } from '@/lib/admin/types';
import { EmptyState, LoadingBlock } from '../../components/Loading';
import { Modal } from '../../components/Modal';
import { ProductBadges } from '../../components/ProductBadges';
import { useAdmin } from '../../components/AdminShell';

const filters = [
  ['all', 'Todos'], ['published', 'Publicado'], ['draft', 'Borrador'], ['archived', 'Archivado'],
  ['onSale', 'Oferta'], ['featured', 'Destacado'], ['newArrival', 'Nuevo'],
] as const;

export function ProductsList() {
  const { notify } = useAdmin();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof filters)[number][0]>('all');
  const [categoryId, setCategoryId] = useState('');
  const [pendingArchive, setPendingArchive] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const [productData, categoryData] = await Promise.all([
        adminApi<{ products: Product[] }>('/api/admin/products?pageSize=100&includeDeleted=true'),
        adminApi<{ categories: Category[] }>('/api/admin/categories'),
      ]);
      setProducts(productData.products);
      setCategories(categoryData.categories);
    } catch (caught) { setError(messageForError(caught)); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => (products ?? []).filter((product) => {
    const matchesQuery = !query || [product.name, product.sku, product.brand].some((value) => value?.toLowerCase().includes(query.toLowerCase()));
    const matchesCategory = !categoryId || product.categoryId === Number(categoryId);
    const matchesFilter = filter === 'all' ||
      (['published', 'draft', 'archived'].includes(filter) ? product.status === filter : Boolean(product[filter as 'onSale' | 'featured' | 'newArrival']));
    return matchesQuery && matchesCategory && matchesFilter;
  }), [categoryId, filter, products, query]);

  async function togglePublished(product: Product) {
    setBusy(true);
    try {
      const nextPublished = !product.published;
      const data = await adminApi<{ product: Product }>(`/api/admin/products/${product.id}`, {
        method: 'PUT', body: JSON.stringify({ status: nextPublished ? 'published' : 'draft', published: nextPublished }),
      });
      setProducts((items) => items?.map((item) => item.id === product.id ? data.product : item) ?? null);
      notify(nextPublished ? 'Producto publicado' : 'Producto ocultado');
    } catch (caught) { notify(messageForError(caught), 'error'); }
    finally { setBusy(false); }
  }

  async function archive() {
    if (!pendingArchive) return;
    setBusy(true);
    try {
      await adminApi(`/api/admin/products/${pendingArchive.id}`, { method: 'DELETE' });
      notify('Producto archivado');
      setPendingArchive(null);
      await load();
    } catch (caught) { notify(messageForError(caught), 'error'); }
    finally { setBusy(false); }
  }

  function ProductActions({ product }: { product: Product }) {
    return <div className="admin-table__actions">
      {product.status !== 'archived' ? <Link className="admin-text-button" href={`/admin/products/${product.id}`}>Editar</Link> : <span className="admin-meta">Sin acciones</span>}
      {product.status !== 'archived' ? <button className="admin-text-button" type="button" disabled={busy} onClick={() => togglePublished(product)}>{product.published ? 'Ocultar' : 'Publicar'}</button> : null}
      {product.status !== 'archived' ? <button className="admin-text-button admin-text-button--danger" type="button" disabled={busy} onClick={() => setPendingArchive(product)}>Archivar</button> : null}
    </div>;
  }

  return <>
    <header className="admin-page-head"><div><p className="admin-kicker">Catálogo</p><h2>Productos</h2><p>Busca, filtra y administra cada producto desde un solo lugar.</p></div><Link href="/admin/products/new" className="admin-button admin-button--accent">＋ Nuevo producto</Link></header>
    {error ? <div className="admin-alert" role="alert">{error}</div> : null}
    <div className="admin-toolbar">
      <label className="admin-search"><span className="sr-only">Buscar productos</span><input type="search" placeholder="Buscar por nombre, SKU o marca…" value={query} onChange={(event) => setQuery(event.target.value)}/></label>
      <label className="admin-field" style={{minWidth: 190}}><span className="sr-only">Filtrar por categoría</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Todas las categorías</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
    </div>
    <div className="admin-filter-tabs" role="tablist" aria-label="Filtrar productos">{filters.map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={filter === value} className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div>
    <section className="admin-panel" style={{marginTop: '1rem'}}>
      {!products ? <LoadingBlock rows={6}/> : filtered.length === 0 ? <EmptyState title={products.length === 0 ? 'No hay productos todavía.' : 'No hay productos con estos filtros.'} action={products.length === 0 ? <Link className="admin-button" href="/admin/products/new">Crear primer producto</Link> : undefined}/> : <>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Producto</th><th>SKU</th><th>Categoría</th><th>Precio</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{filtered.map((product) => <tr key={product.id}><td><div className="admin-table__product">{product.mainImageUrl ? <img src={product.mainImageUrl} alt=""/> : <span className="admin-table__placeholder">GW</span>}<div><strong>{product.name}</strong><small>{product.brand || 'Sin marca'}</small></div></div></td><td>{product.sku || '—'}</td><td>{categories.find((category) => category.id === product.categoryId)?.name || 'Sin categoría'}</td><td>{formatMoney(product.price, product.currency)}</td><td><ProductBadges product={product}/></td><td><ProductActions product={product}/></td></tr>)}</tbody></table></div>
        <div className="admin-mobile-list">{filtered.map((product) => <article className="admin-mobile-card" key={product.id}><div className="admin-mobile-card__head">{product.mainImageUrl ? <img src={product.mainImageUrl} alt=""/> : <span className="admin-table__placeholder">GW</span>}<div className="admin-mobile-card__copy"><h3>{product.name}</h3><p>{product.sku || 'Sin SKU'} · {formatMoney(product.price, product.currency)}</p><ProductBadges product={product}/></div></div><div className="admin-mobile-card__actions"><ProductActions product={product}/></div></article>)}</div>
      </>}
    </section>
    <Modal open={Boolean(pendingArchive)} title="Archivar producto" description={`“${pendingArchive?.name ?? ''}” dejará de estar visible y saldrá de las listas comerciales.`} confirmLabel="Archivar" destructive busy={busy} onClose={() => setPendingArchive(null)} onConfirm={archive}/>
  </>;
}
