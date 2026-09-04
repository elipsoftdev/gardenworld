import './product-card.css';
import { formatMoney } from '@/lib/admin/api';

export type ProductCardVariant = 'catalog' | 'featured' | 'offer';

export type ProductCardData = {
  name?: string | null;
  shortDescription?: string | null;
  price?: number | null;
  compareAtPrice?: number | null;
  currency?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  featured?: boolean;
  onSale?: boolean;
};

export function ProductCard({
  product,
  variant = 'catalog',
  compact = false,
}: {
  product: ProductCardData;
  variant?: ProductCardVariant;
  compact?: boolean;
}) {
  const isOffer = variant === 'offer' || product.onSale;
  const name = product.name?.trim() || 'Nombre del producto';
  const description = product.shortDescription?.trim() || 'Descripción breve del producto.';

  return (
    <article className={`gw-product-card gw-product-card--${variant}${compact ? ' gw-product-card--compact' : ''}`}>
      <div className="gw-product-card__media">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.imageAlt || name} />
        ) : (
          <div className="gw-product-card__placeholder" aria-label="Producto sin imagen">
            <span>GW</span>
            <small>Imagen pendiente</small>
          </div>
        )}
        {isOffer ? <span className="gw-product-card__badge">Oferta</span> : null}
        {variant === 'featured' && product.featured ? (
          <span className="gw-product-card__badge gw-product-card__badge--featured">Destacado</span>
        ) : null}
      </div>
      <div className="gw-product-card__body">
        <div>
          <p className="gw-product-card__eyebrow">
            {variant === 'offer' ? 'Precio especial' : variant === 'featured' ? 'Selección Garden World' : 'Catálogo'}
          </p>
          <h3>{name}</h3>
          {!compact ? <p className="gw-product-card__description">{description}</p> : null}
        </div>
        <div className="gw-product-card__foot">
          <p className="gw-product-card__price">
            {isOffer && product.compareAtPrice ? <s>{formatMoney(product.compareAtPrice, product.currency || 'USD')}</s> : null}
            <strong>{formatMoney(product.price, product.currency || 'USD')}</strong>
          </p>
          {!compact ? <span className="gw-product-card__cta">Ver producto <span aria-hidden="true">↗</span></span> : null}
        </div>
      </div>
    </article>
  );
}
