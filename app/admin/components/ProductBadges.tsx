import type { Product } from '@/lib/admin/types';

export function ProductBadges({ product }: { product: Product }) {
  return <div className="admin-badges">
    <span className={`admin-badge admin-badge--${product.status}`}>{product.status === 'published' ? 'Publicado' : product.status === 'archived' ? 'Archivado' : 'Borrador'}</span>
    {product.onSale ? <span className="admin-badge admin-badge--offer">Oferta</span> : null}
    {product.featured ? <span className="admin-badge admin-badge--featured">Destacado</span> : null}
    {product.newArrival ? <span className="admin-badge">Nuevo</span> : null}
  </div>;
}
