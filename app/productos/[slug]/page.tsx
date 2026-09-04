import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductGallery, { type ProductGalleryImage } from '@/app/components/ProductGallery';
import { ProductCard } from '@/components/catalog/ProductCard';
import Breadcrumbs from '@/components/public/Breadcrumbs';
import PublicShell, { WhatsAppIcon } from '@/components/public/PublicShell';
import { formatMoney } from '@/lib/admin/api';
import { getDb } from '@/lib/db';
import { getPublicNavigationCategories, getPublicProductPage } from '@/lib/public/catalog';
import { absoluteUrl, getCanonical, getRobots, makeWhatsAppLink } from '@/lib/site';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };

const availabilityLabels: Record<string, string> = { in_stock: 'Disponible', out_of_stock: 'Agotado', preorder: 'Disponible por encargo', discontinued: 'No disponible' };
const schemaAvailability: Record<string, string> = { in_stock: 'https://schema.org/InStock', out_of_stock: 'https://schema.org/OutOfStock', preorder: 'https://schema.org/PreOrder', discontinued: 'https://schema.org/Discontinued' };

function textItems(value: string | null): string[] {
  return value?.split(/\r?\n|;/).map((item) => item.trim()).filter(Boolean) ?? [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getPublicProductPage(getDb(), slug);
  if (!page) return {};
  const { product } = page;
  const title = product.seoTitle || `${product.name} | Garden World`;
  const description = product.seoDescription || product.shortDescription || `Conoce ${product.name} de Garden World.`;
  const canonical = getCanonical(`/productos/${product.slug}/`);
  const image = product.mainImageUrl ? [product.mainImageUrl] : undefined;
  return { title, description, alternates: canonical ? { canonical } : undefined, robots: getRobots(product.indexable), openGraph: { type: 'website', title, description, url: canonical, images: image }, twitter: { card: image ? 'summary_large_image' : 'summary', title, description, images: image } };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const db = getDb();
  const page = getPublicProductPage(db, slug);
  if (!page) notFound();
  const { product, category, related } = page;
  const navigationCategories = getPublicNavigationCategories(db);
  const message = `Hola Garden World, estoy interesado en ${product.name}. Quisiera conocer disponibilidad y condiciones.`;
  const whatsapp = makeWhatsAppLink(message);
  const gallery: ProductGalleryImage[] = product.images.map((image, index) => ({ src: image.url, alt: image.altText || `${product.name}, imagen ${index + 1}`, label: image.altText || `Vista ${index + 1}`, fit: 'contain' }));
  if (gallery.length === 0 && product.mainImageUrl) gallery.push({ src: product.mainImageUrl, alt: product.name, label: 'Vista principal', fit: 'contain' });
  const benefits = textItems(product.benefits);
  const uses = textItems(product.uses);
  const validOffer = product.price > 0 && /^[A-Z]{3}$/.test(product.currency) && schemaAvailability[product.stockStatus];
  const productSchema = product.indexable ? { '@context': 'https://schema.org', '@type': 'Product', name: product.name, url: absoluteUrl(`/productos/${product.slug}/`), ...(product.shortDescription || product.description ? { description: product.shortDescription || product.description } : {}), ...(product.sku ? { sku: product.sku } : {}), ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}), ...(product.mainImageUrl ? { image: [absoluteUrl(product.mainImageUrl)] } : {}), ...(validOffer ? { offers: { '@type': 'Offer', price: product.price, priceCurrency: product.currency, availability: schemaAvailability[product.stockStatus], url: absoluteUrl(`/productos/${product.slug}/`) } } : {}) } : null;

  const breadcrumbItems = [{ label: 'Inicio', href: '/' }, { label: 'Productos', href: '/productos/' }, ...(category ? [{ label: category.name, href: `/productos/categoria/${category.slug}/` }] : []), { label: product.name }];
  return <PublicShell categories={navigationCategories} whatsappMessage={message}>
    <main id="contenido" className="public-page product-page">
      {productSchema ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} /> : null}
      <div className="container"><Breadcrumbs items={breadcrumbItems} /></div>
      <section className="container product-hero"><div className="product-hero__gallery">{gallery.length > 0 ? <ProductGallery productName={product.name} images={gallery} /> : <div className="product-image-empty" aria-label="Producto sin imagen"><span>GW</span><p>Imagen pendiente</p></div>}</div><div className="product-summary"><p className="eyebrow">{category?.name || 'Garden World'}</p><h1>{product.name}</h1>{product.shortDescription ? <p className="product-lead">{product.shortDescription}</p> : null}<div className="product-price">{product.onSale && product.compareAtPrice ? <s>{formatMoney(product.compareAtPrice, product.currency)}</s> : null}<strong>{product.price > 0 ? formatMoney(product.price, product.currency) : 'Precio a consultar'}</strong></div><dl className="product-facts">{product.sku ? <><dt>SKU</dt><dd>{product.sku}</dd></> : null}<dt>Disponibilidad</dt><dd>{availabilityLabels[product.stockStatus] || 'Consultar disponibilidad'}</dd></dl><a className="button button-wide" href={whatsapp} target="_blank" rel="noopener noreferrer" data-whatsapp-cta><WhatsAppIcon /> Consultar por WhatsApp <span aria-hidden="true">↗</span></a></div></section>
      <div className="container product-details">{benefits.length > 0 ? <section><p className="eyebrow">Beneficios</p><h2>Diseñado para el uso cotidiano.</h2><ul>{benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul></section> : null}{product.description ? <section><p className="eyebrow">Descripción</p><h2>Sobre este producto.</h2><p>{product.description}</p></section> : null}{uses.length > 0 ? <section><p className="eyebrow">Usos</p><h2>Cómo integrarlo.</h2><ul>{uses.map((use) => <li key={use}>{use}</li>)}</ul></section> : null}{product.specs.length > 0 ? <section><p className="eyebrow">Especificaciones</p><h2>Detalles.</h2><dl>{product.specs.map((spec) => <div key={`${spec.name}-${spec.displayOrder}`}><dt>{spec.name}</dt><dd>{spec.value}</dd></div>)}</dl></section> : null}{product.deliveryText || product.warrantyText ? <section><p className="eyebrow">Compra y entrega</p><h2>Información disponible.</h2>{product.deliveryText ? <div><h3>Entrega</h3><p>{product.deliveryText}</p></div> : null}{product.warrantyText ? <div><h3>Garantía</h3><p>{product.warrantyText}</p></div> : null}</section> : null}</div>
      {related.length > 0 ? <section className="related-products"><div className="container"><div className="dynamic-heading"><div><p className="eyebrow">Sigue explorando</p><h2>Productos relacionados</h2></div></div><div className="catalog-grid">{related.map((item) => <ProductCard key={item.id} href={`/productos/${item.slug}/`} variant="catalog" product={{ ...item, imageUrl: item.mainImageUrl, imageAlt: item.name }} />)}</div></div></section> : null}
    </main>
  </PublicShell>;
}
