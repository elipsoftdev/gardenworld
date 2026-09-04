'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ProductCard } from '@/components/catalog/ProductCard';
import { adminApi, messageForError } from '@/lib/admin/api';
import type { Product } from '@/lib/admin/types';
import { EmptyState, LoadingBlock } from '../../components/Loading';
import { OrderList } from '../../components/OrderList';
import { useAdmin } from '../../components/AdminShell';

export function OffersManager() {
  const { notify } = useAdmin();
  const [offers, setOffers] = useState<Product[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => { try { const data = await adminApi<{products: Product[]}>('/api/admin/products?pageSize=100&onSale=true'); setOffers(data.products.sort((a,b) => a.saleOrder - b.saleOrder)); } catch (caught) { setError(messageForError(caught)); } }, []);
  useEffect(() => { void load(); }, [load]);

  async function reorder(next: Product[]) { setOffers(next); setBusy(true); try { await adminApi('/api/admin/products/offers/order', {method: 'PUT', body: JSON.stringify({ids: next.map((product) => product.id)})}); notify('Orden de ofertas actualizado'); await load(); } catch (caught) { notify(messageForError(caught), 'error'); await load(); } finally { setBusy(false); } }
  async function remove(product: Product) { setBusy(true); try { await adminApi(`/api/admin/products/${product.id}`, {method: 'PUT', body: JSON.stringify({onSale: false})}); notify('Producto retirado de ofertas'); await load(); } catch (caught) { notify(messageForError(caught), 'error'); } finally { setBusy(false); } }

  return <><header className="admin-page-head"><div><p className="admin-kicker">Contenido comercial</p><h2>Ofertas</h2><p>Revisa precios, cambia la prioridad visual o retira productos de la colección.</p></div><Link href="/admin/products" className="admin-button admin-button--quiet">Gestionar productos</Link></header>
    {error ? <div className="admin-alert" role="alert">{error}</div> : null}
    <section className="admin-panel"><div className="admin-panel__head"><div><h2>Productos en oferta</h2><p>Arrastra o usa las flechas para reordenar.</p></div></div><div className="admin-panel__body">{!offers ? <LoadingBlock rows={5}/> : offers.length === 0 ? <EmptyState title="No hay productos en oferta."/> : <OrderList items={offers} itemKey={(product) => product.id} label="Orden de ofertas" disabled={busy} onReorder={reorder} render={(product) => <div className="admin-sort-visual"><ProductCard compact variant="offer" product={{name: product.name, price: product.price, compareAtPrice: product.compareAtPrice, currency: product.currency, imageUrl: product.mainImageUrl, onSale: true}}/><div className="admin-button-row"><Link className="admin-text-button" href={`/admin/products/${product.id}`}>Editar</Link><button type="button" className="admin-text-button admin-text-button--danger" onClick={() => remove(product)}>Quitar de oferta</button></div></div>}/>}</div></section>
  </>;
}
