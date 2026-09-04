import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/catalog/ProductCard';
import Breadcrumbs from '@/components/public/Breadcrumbs';
import PublicShell, { WhatsAppIcon } from '@/components/public/PublicShell';
import { getDb } from '@/lib/db';
import { getPublicCategoryPage, getPublicNavigationCategories } from '@/lib/public/catalog';
import { getCanonical, getRobots, makeWhatsAppLink } from '@/lib/site';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getPublicCategoryPage(getDb(), slug);
  if (!page) return {};
  const title = page.category.seoTitle || `${page.category.name} | Garden World`;
  const description = page.category.seoDescription || page.category.description || `Explora ${page.category.name} en el catálogo Garden World.`;
  const canonical = getCanonical(`/productos/categoria/${page.category.slug}/`);
  return { title, description, alternates: canonical ? { canonical } : undefined, robots: getRobots(page.category.indexable), openGraph: { title, description, url: canonical }, twitter: { card: 'summary_large_image', title, description } };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const db = getDb();
  const page = getPublicCategoryPage(db, slug);
  if (!page) notFound();
  const navigationCategories = getPublicNavigationCategories(db);
  const whatsapp = makeWhatsAppLink(`Hola Garden World, quisiera orientación sobre la categoría ${page.category.name}.`);
  return <PublicShell categories={navigationCategories} whatsappMessage={`Hola Garden World, quisiera orientación sobre la categoría ${page.category.name}.`}>
    <main id="contenido" className="public-page category-page">
      <div className="container"><Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Productos', href: '/productos/' }, { label: page.category.name }]} /></div>
      <header className="container category-hero"><p className="eyebrow">Categoría</p><h1>{page.category.name}</h1>{page.category.description ? <p>{page.category.description}</p> : null}</header>
      <section className="container catalog-section" aria-label={`Productos de ${page.category.name}`}>{page.products.length > 0 ? <div className="catalog-grid">{page.products.map((product) => <ProductCard key={product.id} href={`/productos/${product.slug}/`} variant="catalog" product={{ ...product, imageUrl: product.mainImageUrl, imageAlt: product.name }} />)}</div> : <div className="public-empty"><p className="eyebrow">Selección en preparación</p><h2>Aún no hay productos publicados en esta categoría.</h2><a className="button" href={whatsapp} target="_blank" rel="noopener noreferrer" data-whatsapp-cta><WhatsAppIcon /> Consultar por WhatsApp</a></div>}</section>
    </main>
  </PublicShell>;
}
