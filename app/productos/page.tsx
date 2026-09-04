import type { Metadata } from 'next';
import CatalogGrid from '@/components/catalog/CatalogGrid';
import PublicShell, { WhatsAppIcon } from '@/components/public/PublicShell';
import Breadcrumbs from '@/components/public/Breadcrumbs';
import { getDb } from '@/lib/db';
import { getPublicCatalog, getPublicNavigationCategories } from '@/lib/public/catalog';
import { getCanonical, getRobots, makeWhatsAppLink } from '@/lib/site';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  const title = 'Productos para jardines y exteriores | Garden World';
  const description = 'Explora el catálogo Garden World: soluciones de diseño, orden y funcionalidad para jardines y espacios exteriores.';
  const canonical = getCanonical('/productos/');
  return { title, description, alternates: canonical ? { canonical } : undefined, robots: getRobots(), openGraph: { title, description, url: canonical }, twitter: { card: 'summary_large_image', title, description } };
}

export default function ProductsPage() {
  const db = getDb();
  const { products, categories } = getPublicCatalog(db);
  const navigationCategories = getPublicNavigationCategories(db);
  const whatsapp = makeWhatsAppLink('Hola Garden World, quisiera ayuda para elegir un producto para mi espacio exterior.');
  return <PublicShell categories={navigationCategories}>
    <main id="contenido" className="public-page">
      <div className="container"><Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Productos' }]} /></div>
      <header className="container catalog-hero"><p className="eyebrow">Catálogo Garden World</p><h1>Objetos que ordenan<br />la vida afuera.</h1><p>Una selección de soluciones para integrar funcionalidad y diseño en jardines y espacios exteriores.</p></header>
      <section className="container catalog-section" aria-labelledby="catalog-title"><div className="catalog-section__head"><div><p className="eyebrow">Selección actual</p><h2 id="catalog-title">Productos</h2></div><span>Orden · Recomendados</span></div>{products.length > 0 ? <CatalogGrid products={products} categories={categories} /> : <div className="public-empty"><p className="eyebrow">Próximamente</p><h2>Estamos preparando el catálogo.</h2><p>Muy pronto encontrarás aquí nuestra selección. Mientras tanto, podemos orientarte directamente.</p><a className="button" href={whatsapp} target="_blank" rel="noopener noreferrer" data-whatsapp-cta><WhatsAppIcon /> Hablar con Garden World</a></div>}</section>
    </main>
  </PublicShell>;
}
