'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ProductCard } from '@/components/catalog/ProductCard';
import { adminApi, messageForError } from '@/lib/admin/api';
import type { HomeSection, Product } from '@/lib/admin/types';
import { EmptyState, LoadingBlock } from '../../components/Loading';
import { OrderList } from '../../components/OrderList';
import { useAdmin } from '../../components/AdminShell';

const sectionNames: Record<HomeSection['sectionKey'], string> = {
  categories: 'Categorías', featured: 'Destacados', offers: 'Ofertas', new_arrivals: 'Novedades',
};
const productLists = [
  { key: 'featured', label: 'Destacados', flag: 'featured', endpoint: '/api/admin/products/featured/order', variant: 'featured' },
  { key: 'offers', label: 'Ofertas', flag: 'onSale', endpoint: '/api/admin/products/offers/order', variant: 'offer' },
  { key: 'new_arrivals', label: 'Novedades', flag: 'newArrival', endpoint: '/api/admin/products/new-arrivals/order', variant: 'catalog' },
] as const;

export function HomeManager() {
  const { notify } = useAdmin();
  const [sections, setSections] = useState<HomeSection[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [selected, setSelected] = useState<HomeSection['sectionKey']>('featured');
  const [draft, setDraft] = useState({ title: '', subtitle: '', enabled: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [sectionData, productData] = await Promise.all([
        adminApi<{ sections: HomeSection[] }>('/api/admin/home/sections'),
        adminApi<{ products: Product[] }>('/api/admin/products?pageSize=100'),
      ]);
      setSections(sectionData.sections); setProducts(productData.products);
    } catch (caught) { setError(messageForError(caught)); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const selectedSection = sections?.find((section) => section.sectionKey === selected);
  useEffect(() => { if (selectedSection) setDraft({title: selectedSection.title ?? '', subtitle: selectedSection.subtitle ?? '', enabled: selectedSection.enabled}); }, [selectedSection]);

  async function reorderSections(next: HomeSection[]) {
    setSections(next); setBusy(true);
    try { const data = await adminApi<{ sections: HomeSection[] }>('/api/admin/home/sections/order', {method: 'PUT', body: JSON.stringify({sectionKeys: next.map((section) => section.sectionKey)})}); setSections(data.sections); notify('Orden del Home actualizado'); }
    catch (caught) { notify(messageForError(caught), 'error'); await load(); }
    finally { setBusy(false); }
  }

  async function saveSection() {
    setBusy(true);
    try { const { section } = await adminApi<{ section: HomeSection }>(`/api/admin/home/sections/${selected}`, {method: 'PUT', body: JSON.stringify(draft)}); setSections((items) => items?.map((item) => item.sectionKey === section.sectionKey ? section : item) ?? null); notify('Sección actualizada'); }
    catch (caught) { notify(messageForError(caught), 'error'); }
    finally { setBusy(false); }
  }

  async function reorderProducts(list: (typeof productLists)[number], next: Product[]) {
    const others = (products ?? []).filter((product) => !product[list.flag]);
    setProducts([...others, ...next]); setBusy(true);
    try { await adminApi(list.endpoint, {method: 'PUT', body: JSON.stringify({ids: next.map((product) => product.id)})}); notify(`Orden de ${list.label.toLowerCase()} actualizado`); await load(); }
    catch (caught) { notify(messageForError(caught), 'error'); await load(); }
    finally { setBusy(false); }
  }

  async function removeFromList(product: Product, flag: 'featured' | 'onSale' | 'newArrival', label: string) {
    setBusy(true);
    try { const { product: updated } = await adminApi<{ product: Product }>(`/api/admin/products/${product.id}`, {method: 'PUT', body: JSON.stringify({[flag]: false})}); setProducts((items) => items?.map((item) => item.id === updated.id ? updated : item) ?? null); notify(`Producto retirado de ${label.toLowerCase()}`); }
    catch (caught) { notify(messageForError(caught), 'error'); }
    finally { setBusy(false); }
  }

  const orderedLists = useMemo(() => productLists.map((list) => ({...list, products: (products ?? []).filter((product) => product[list.flag]).sort((a, b) => {
    const field = list.flag === 'featured' ? 'featuredOrder' : list.flag === 'onSale' ? 'saleOrder' : 'newOrder';
    return a[field] - b[field];
  })})), [products]);

  return <>
    <header className="admin-page-head"><div><p className="admin-kicker">Editor de contenido</p><h2>Home</h2><p>Controla por separado el orden de secciones y el orden de las cards dentro de cada colección.</p></div><a className="admin-button admin-button--secondary" href="/" target="_blank" rel="noopener noreferrer">Ver Home DEV ↗</a></header>
    {error ? <div className="admin-alert" role="alert">{error}</div> : null}
    <div className="admin-alert" style={{background: '#e8eee7', borderColor: '#315148', color: '#315148'}}><strong>Nivel 1:</strong> orden de secciones. <strong>Nivel 2:</strong> orden de cards. Son configuraciones independientes.</div>
    <div className="admin-home-layout">
      <section className="admin-panel"><div className="admin-panel__head"><div><h2>1. Secciones Home</h2><p>Arrastra o usa las flechas para cambiar la prioridad.</p></div></div><div className="admin-panel__body admin-section-list">
        {!sections ? <LoadingBlock rows={4}/> : <OrderList items={sections} itemKey={(section) => section.sectionKey} label="Orden de secciones del Home" disabled={busy} onReorder={reorderSections} render={(section, index) => <button type="button" data-selected={selected === section.sectionKey} onClick={() => setSelected(section.sectionKey)} style={{width: '100%', padding: '.45rem .6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.7rem', border: '1px solid transparent', background: 'transparent', cursor: 'pointer', textAlign: 'left'}}><span><strong>{index + 1}. {sectionNames[section.sectionKey]}</strong><small>{section.title || 'Título sin configurar'}</small></span><span className={`admin-badge ${section.enabled ? 'admin-badge--published' : 'admin-badge--draft'}`}>{section.enabled ? 'Visible' : 'Oculta'}</span></button>}/>}
      </div></section>
      <section className="admin-panel"><div className="admin-panel__head"><div><h2>Configuración</h2><p>{sectionNames[selected]}</p></div></div><div className="admin-panel__body admin-section-editor">
        <div className="admin-field"><label htmlFor="home-title">Título</label><input id="home-title" maxLength={120} value={draft.title} onChange={(e) => setDraft((current) => ({...current, title: e.target.value}))}/></div>
        <div className="admin-field"><label htmlFor="home-subtitle">Subtítulo</label><textarea id="home-subtitle" maxLength={240} value={draft.subtitle} onChange={(e) => setDraft((current) => ({...current, subtitle: e.target.value}))}/></div>
        <label className="admin-check"><input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft((current) => ({...current, enabled: e.target.checked}))}/>Sección visible</label>
        <button type="button" className="admin-button" disabled={busy} onClick={saveSection}>{busy ? 'Guardando…' : 'Guardar configuración'}</button>
      </div></section>
    </div>

    <section style={{marginTop: '2.5rem'}} aria-labelledby="card-order-title"><p className="admin-kicker">Nivel 2</p><h2 id="card-order-title" className="admin-section-title" style={{fontSize: '2rem', marginBottom: '1.2rem'}}>Orden visual de cards</h2>
      <div className="admin-form-stack">{orderedLists.map((list) => <div className="admin-panel" key={list.key}><div className="admin-panel__head"><div><h3>{list.label}</h3><p>{list.products.length} producto{list.products.length === 1 ? '' : 's'} en esta colección.</p></div></div><div className="admin-panel__body">
        {!products ? <LoadingBlock/> : list.products.length === 0 ? <EmptyState title={`No hay ${list.label.toLowerCase()}.`}/> : <OrderList items={list.products} itemKey={(product) => product.id} label={`Orden de ${list.label}`} disabled={busy} onReorder={(next) => reorderProducts(list, next)} render={(product) => <div className="admin-sort-visual"><ProductCard compact variant={list.variant} product={{name: product.name, shortDescription: product.shortDescription, price: product.price, compareAtPrice: product.compareAtPrice, currency: product.currency, imageUrl: product.mainImageUrl, featured: product.featured, onSale: product.onSale}}/><div className="admin-button-row"><Link className="admin-text-button" href={`/admin/products/${product.id}`}>Editar producto</Link><button type="button" className="admin-text-button admin-text-button--danger" onClick={() => removeFromList(product, list.flag, list.label)}>Quitar</button></div></div>}/>}
      </div></div>)}</div>
    </section>
  </>;
}
