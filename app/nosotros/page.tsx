import type { Metadata } from 'next';
import Breadcrumbs from '@/components/public/Breadcrumbs';
import PublicShell, { WhatsAppIcon } from '@/components/public/PublicShell';
import { getDb } from '@/lib/db';
import { getPublicNavigationCategories } from '@/lib/public/catalog';
import { getCanonical, getRobots, makeWhatsAppLink } from '@/lib/site';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  const title = 'Nosotros | Garden World';
  const description = 'Conoce Garden World, una marca venezolana enfocada en diseño, orden y funcionalidad para jardines y espacios exteriores.';
  const canonical = getCanonical('/nosotros/');
  return { title, description, alternates: canonical ? { canonical } : undefined, robots: getRobots(), openGraph: { title, description, url: canonical }, twitter: { card: 'summary_large_image', title, description } };
}

export default function AboutPage() {
  const categories = getPublicNavigationCategories(getDb());
  const whatsapp = makeWhatsAppLink('Hola Garden World, quisiera conocer más sobre la marca y sus productos.');
  return <PublicShell categories={categories}>
    <main id="contenido" className="about-page">
      <div className="container"><Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Nosotros' }]} /></div>
      <section className="about-hero"><div className="container about-hero__grid"><div><p className="eyebrow">Nosotros</p><h1>Diseñamos para que el exterior forme parte de tu vida.</h1><p>Garden World nace de una idea sencilla: los espacios exteriores también merecen objetos bien pensados, funcionales y capaces de convivir con el diseño del lugar.</p></div><figure><img src="/images/tu-mundo-tu-jardin.jpeg" alt="Jardín exterior que integra una solución Garden World" /><figcaption>Tu mundo. Tu jardín.</figcaption></figure></div></section>
      <section className="container about-intro" data-reveal><p className="about-index">01 — Quiénes somos</p><div><h2>Garden World</h2><p>Somos una marca venezolana enfocada en crear, seleccionar y desarrollar soluciones para disfrutar mejor jardines y espacios exteriores.</p><p>Buscamos integrar diseño, orden y funcionalidad en productos que formen parte natural del entorno.</p></div></section>
      <section className="about-purpose"><div className="container about-purpose__grid" data-reveal><p className="about-index">02 — Propósito</p><div><p className="eyebrow">Nuestro propósito</p><h2>Hacer que jardines y espacios exteriores sean más ordenados, funcionales y disfrutables mediante soluciones bien pensadas.</h2></div></div></section>
      <section className="container about-direction" data-reveal><article><span>Hoy</span><p className="eyebrow">Lo que hacemos hoy</p><h2>Crear y ofrecer soluciones para exteriores.</h2><p>Integramos diseño, funcionalidad y una experiencia de compra cercana, ayudando a cada persona a disfrutar mejor su espacio.</p></article><article><span>Mañana</span><p className="eyebrow">Hacia dónde vamos</p><h2>Una marca venezolana referente.</h2><p>Queremos ser reconocidos por soluciones y objetos para vivir y disfrutar mejor los espacios exteriores.</p></article></section>
      <section className="about-principles"><div className="container"><div className="about-principles__head" data-reveal><p className="about-index">03 — Principios</p><h2>Lo que guía cada decisión.</h2></div><div className="principles-list" data-reveal><article><span>01</span><h3>Diseño con propósito</h3><p>Cada decisión debe aportar funcionalidad además de estética.</p></article><article><span>02</span><h3>Funcionalidad cotidiana</h3><p>Diseñamos pensando en cómo se utiliza realmente el espacio.</p></article><article><span>03</span><h3>Calidad percibida</h3><p>Buscamos productos y soluciones que transmitan solidez, cuidado y permanencia.</p></article><article><span>04</span><h3>Cercanía</h3><p>La tecnología facilita la compra, pero la atención sigue siendo humana.</p></article></div></div></section>
      <section className="about-promise"><div className="container" data-reveal><p className="eyebrow">Promesa de marca</p><h2>Tu mundo.<br /><em>Tu jardín.</em></h2><p>Queremos ayudarte a disfrutar más lo que sucede afuera.</p><div><a className="button button-light" href="/productos/">Explorar productos <span aria-hidden="true">→</span></a><a className="text-link text-link--light" href={whatsapp} target="_blank" rel="noopener noreferrer" data-whatsapp-cta><WhatsAppIcon /> Hablar con Garden World <span aria-hidden="true">↗</span></a></div></div></section>
    </main>
  </PublicShell>;
}
