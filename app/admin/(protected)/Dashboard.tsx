'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { adminApi, messageForError } from '@/lib/admin/api';
import type { Product } from '@/lib/admin/types';
import { LoadingBlock } from '../components/Loading';
import { useAdmin } from '../components/AdminShell';

export function Dashboard() {
  const { user } = useAdmin();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi<{ products: Product[] }>('/api/admin/products?pageSize=100')
      .then((data) => setProducts(data.products))
      .catch((caught) => setError(messageForError(caught)));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const totals = products ? [
    ['Productos', products.length],
    ['Publicados', products.filter((item) => item.published).length],
    ['Ofertas', products.filter((item) => item.onSale).length],
    ['Destacados', products.filter((item) => item.featured).length],
  ] : [];

  return <>
    <header className="admin-page-head"><div><p className="admin-kicker">Resumen operativo</p><h2>{greeting}, {user.name.split(' ')[0]}</h2><p>Revisa el estado del catálogo y continúa con las tareas más frecuentes.</p></div></header>
    {error ? <div className="admin-alert" role="alert">{error}</div> : null}
    {!products ? <div className="admin-panel"><LoadingBlock rows={4}/></div> : <section className="admin-summary" aria-label="Resumen del catálogo">{totals.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>}
    <section aria-labelledby="quick-actions-title">
      <p className="admin-kicker">Acciones rápidas</p>
      <h2 id="quick-actions-title" className="admin-section-title" style={{fontSize: '2rem', marginBottom: '1.2rem'}}>¿Qué quieres gestionar?</h2>
      <div className="admin-quick-actions">
        <Link href="/admin/products/new"><span>＋</span><span>Nuevo producto</span></Link>
        <Link href="/admin/home"><span>↕</span><span>Gestionar Home</span></Link>
        <Link href="/admin/categories"><span>⌁</span><span>Nueva categoría</span></Link>
        <Link href="/admin/offers"><span>％</span><span>Ver ofertas</span></Link>
      </div>
    </section>
  </>;
}
