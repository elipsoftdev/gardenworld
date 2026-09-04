import type { Metadata } from 'next';
import BeforeAfterSlider from './components/BeforeAfterSlider';
import { ProductCard } from '@/components/catalog/ProductCard';
import PublicShell, { WhatsAppIcon } from '@/components/public/PublicShell';
import { getDb } from '@/lib/db';
import { getPublicHomeSections, getPublicNavigationCategories, type PublicCategory, type PublicProduct } from '@/lib/public/catalog';
import { getCanonical, getRobots, makeWhatsAppLink } from '@/lib/site';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  const title = 'Garden World | Diseño y funcionalidad para espacios exteriores';
  const description = 'Diseño, orden y funcionalidad para disfrutar mejor tus jardines y espacios exteriores.';
  const canonical = getCanonical('/');
  return { title, description, alternates: canonical ? { canonical } : undefined, robots: getRobots(), openGraph: { type: 'website', locale: 'es_VE', siteName: 'Garden World', url: canonical, title, description }, twitter: { card: 'summary_large_image', title, description } };
}

function ProductCollection({ sectionKey, items }: { sectionKey: string; items: PublicProduct[] }) {
  const variant = sectionKey === 'offers' ? 'offer' : sectionKey === 'featured' ? 'featured' : 'catalog';
  const layout = items.length >= 4 ? 'dynamic-rail' : `dynamic-grid dynamic-grid--${items.length}`;
  return <div className={layout}>{items.map((product) => <ProductCard key={product.id} variant={variant} href={`/productos/${product.slug}/`} product={{ ...product, imageUrl: product.mainImageUrl, imageAlt: product.name }} />)}</div>;
}

function CategoryCollection({ items }: { items: PublicCategory[] }) {
  return <div className="category-grid">{items.map((category) => <a className="category-tile" key={category.id} href={`/productos/categoria/${category.slug}/`}><div className="category-tile__media">{category.imageUrl ? <img src={category.imageUrl} alt="" /> : <span aria-hidden="true">GW</span>}</div><div className="category-tile__copy"><p>Explorar categoría</p><h3>{category.name}</h3>{category.description ? <span>{category.description}</span> : null}<strong>Explorar <i aria-hidden="true">→</i></strong></div></a>)}</div>;
}

export default function Home() {
  const db = getDb();
  const sections = getPublicHomeSections(db);
  const navigationCategories = getPublicNavigationCategories(db);
  const whatsapp = makeWhatsAppLink('Hola Garden World, quisiera conocer sus productos y recibir orientación.');
  return <PublicShell categories={navigationCategories}>
    <main id="contenido">
      <section className="hero" aria-labelledby="hero-title"><div className="hero-copy"><p className="eyebrow hero-eyebrow">Garden World</p><h1 id="hero-title">Tu mundo.<span>Tu jardín.</span></h1><p className="hero-intro">Diseño, orden y funcionalidad para disfrutar mejor tus espacios exteriores.</p><div className="hero-actions"><a className="button" href="/productos/">Ver productos <span aria-hidden="true">→</span></a><a className="text-link" href={whatsapp} target="_blank" rel="noopener noreferrer">Hablar con nosotros <span aria-hidden="true">↗</span></a></div></div><div className="hero-visual" aria-label="Garden World en un espacio exterior"><div className="hero-image-wrap"><img src="/images/tu-mundo-tu-jardin.jpeg" alt="Solución Garden World instalada entre plantas y flores en un jardín exterior" /></div><div className="hero-visual-note"><span>Vida exterior</span><strong>Diseño</strong><small>que ordena</small></div><svg className="hero-rings" viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="68" /><circle cx="90" cy="90" r="48" /><circle cx="90" cy="90" r="28" /></svg></div><p className="hero-side-note">Garden World · Venezuela</p></section>
      <section className="before-after-section" aria-labelledby="before-after-title"><div className="container before-after-heading" data-reveal><p className="eyebrow">Diseño que pone orden</p><h2 id="before-after-title">El orden también se diseña.</h2><p>Una solución pensada para que lo que necesitas esté en su lugar y tu jardín siga siendo parte de lo que quieres ver.</p></div><div className="container before-after-frame" data-reveal><BeforeAfterSlider before="/images/before-after/garden-before.webp" after="/images/before-after/garden-after.webp" beforeAlt="Manguera azul desorganizada sobre el piso de un jardín antes de instalar una base Garden World." afterAlt="Manguera azul organizada sobre una base Garden World instalada en una pared exterior de jardín." /><div className="before-after-caption"><span>Desliza. Mira la diferencia.</span><strong>Menos desorden. Más jardín.</strong></div></div></section>
      {sections.length > 0 ? <div className="dynamic-zone" aria-label="Selección del catálogo">{sections.map((section) => <section className={`dynamic-section dynamic-section--${section.sectionKey}`} key={section.sectionKey} data-section-key={section.sectionKey} data-reveal><div className="container"><div className="dynamic-heading"><div><p className="eyebrow">Selección Garden World</p><h2>{section.title || ({ featured: 'Destacados', categories: 'Categorías', offers: 'Ofertas', new_arrivals: 'Novedades' }[section.sectionKey] ?? 'Explorar')}</h2></div>{section.subtitle ? <p>{section.subtitle}</p> : null}</div>{section.sectionKey === 'categories' ? <CategoryCollection items={section.items as PublicCategory[]} /> : <ProductCollection sectionKey={section.sectionKey} items={section.items as PublicProduct[]} />}</div></section>)}</div> : null}
      <section className="brand-story" aria-labelledby="brand-story-title"><div className="container brand-story__intro" data-reveal><p className="eyebrow">Garden World</p><h2 id="brand-story-title">Diseñado para vivir afuera.</h2><p>Objetos y soluciones que acompañan la vida exterior sin apartarse del lenguaje de tu espacio.</p></div><div className="container brand-pillars" data-reveal><article><span>01</span><h3>Diseño</h3><p>Funcionalidad que forma parte del espacio.</p></article><article><span>02</span><h3>Materiales</h3><p>Soluciones pensadas para el uso exterior.</p></article><article><span>03</span><h3>Atención</h3><p>Compra con acompañamiento humano.</p></article></div></section>
      <section className="contact-band"><div className="container contact-band__inner" data-reveal><div><p className="eyebrow">Atención directa</p><h2>¿Necesitas ayuda para elegir?</h2><p>Cuéntanos qué necesitas y te ayudamos a encontrar la opción adecuada.</p></div><a className="button button-light" href={whatsapp} target="_blank" rel="noopener noreferrer" data-whatsapp-cta><WhatsAppIcon /> Hablar con Garden World por WhatsApp <span aria-hidden="true">↗</span></a></div></section>
    </main>
  </PublicShell>;
}
