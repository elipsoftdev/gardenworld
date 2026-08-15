"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import BeforeAfterSlider from "./components/BeforeAfterSlider";

const WHATSAPP_NUMBER = "584143228003";
const PRODUCT_NAME = "Base para manguera Garden World";

type FinishKey = "inox" | "negro";

type Finish = {
  key: FinishKey;
  label: string;
  description: string;
  sku: string;
  color: string;
  image: string;
};

const FINISHES: Finish[] = [
  { key: "inox", label: "Plata de acero inoxidable", description: "Acabado sobrio para arquitectura contemporánea.", sku: "GW-RU-INX", color: "#c7c8c4", image: "/images/ru-inox-45.webp" },
  { key: "negro", label: "Negro mate", description: "Contraste preciso para fachadas gráficas.", sku: "GW-RU-NGR", color: "#292b28", image: "/images/ru-negro-45.webp" },
];

const NAV_ITEMS = [
  { label: "Bases de mangueras", href: "#bases" },
  { label: "Acabados", href: "#acabados" },
  { label: "Cotizar", href: "#cotizar" },
];

function makeWhatsAppLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="wa-icon"><path fill="currentColor" d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.6 4.2 1.6 6L.2 24l6.3-1.7a11.8 11.8 0 0 0 5.6 1.4c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.4-8.4Zm-8.4 18.2c-1.8 0-3.6-.5-5.2-1.4l-.4-.2-3.7 1 1-3.6-.2-.4a9.7 9.7 0 1 1 8.5 4.6Zm5.3-7.3c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.2-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-1.9-.9-3.1-1.7-4.3-3.9-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.6l-.9-2.1c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.3 3.4 1.4 3.6c.2.2 2.5 3.8 6 5.3 2.2.9 3 .9 4.1.8.7-.1 1.7-.7 1.9-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3Z" /></svg>;
}

function Brand({ inverse = false }: { inverse?: boolean }) {
  return <span className={`brand${inverse ? " brand-inverse" : ""}`}><svg viewBox="0 0 34 34" aria-hidden="true" className="brand-mark"><circle cx="17" cy="17" r="12.5" /><circle cx="17" cy="17" r="8" /><circle cx="17" cy="17" r="3.5" /><path d="M22.5 7.5c3-2.5 6.2-2.8 6.2-2.8s-.6 3.6-3.7 5" /></svg><span>Garden World</span></span>;
}

function PhotoPlaceholder({ label }: { label: string }) {
  return <div className="photo-placeholder photo-placeholder-project" aria-label={label} data-content-status="pending"><span className="placeholder-line" aria-hidden="true" /><span className="placeholder-copy"><small>Imagen pendiente</small><strong>{label}</strong></span></div>;
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inlineWhatsAppVisible, setInlineWhatsAppVisible] = useState(false);
  const [finishKey, setFinishKey] = useState<FinishKey>("inox");
  const [quantity, setQuantity] = useState("1");
  const [city, setCity] = useState("");
  const [buyer, setBuyer] = useState("Hogar");
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const selectedFinish = FINISHES.find((finish) => finish.key === finishKey) ?? FINISHES[0];
  const finishWhatsApp = makeWhatsAppLink(`Hola Garden World, quiero cotizar una base para manguera en acabado ${selectedFinish.label} (${selectedFinish.sku}). ¿Me comparten disponibilidad y próximos pasos?`);
  const quoteMessage = useMemo(() => {
    const lines = ["Hola Garden World,", "", "Quiero cotizar:", `· Producto: ${PRODUCT_NAME}`, `· Acabado: ${selectedFinish.label} (${selectedFinish.sku})`, `· Cantidad: ${quantity || "1"}`];
    if (city.trim()) lines.push(`· Ciudad: ${city.trim()}`);
    lines.push(`· Tipo de cliente: ${buyer}`, "", "¿Me comparten disponibilidad y próximos pasos?");
    return lines.join("\n");
  }, [buyer, city, quantity, selectedFinish]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); } }), { threshold: 0.12, rootMargin: "0px 0px -5%" });
    document.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
    return () => { window.removeEventListener("scroll", handleScroll); observer.disconnect(); };
  }, []);

  useEffect(() => {
    const ctas = Array.from(document.querySelectorAll<HTMLElement>("[data-whatsapp-cta]"));
    const visibleCtas = new Set<Element>();
    const observer = new IntersectionObserver((entries) => { entries.forEach((entry) => entry.isIntersecting ? visibleCtas.add(entry.target) : visibleCtas.delete(entry.target)); setInlineWhatsAppVisible(visibleCtas.size > 0); }, { threshold: 0 });
    ctas.forEach((cta) => observer.observe(cta));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>("button, a")?.focus());
    return () => { document.body.style.overflow = previousOverflow; };
  }, [menuOpen]);

  const closeMenu = () => { setMenuOpen(false); window.requestAnimationFrame(() => menuButtonRef.current?.focus()); };
  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { event.preventDefault(); closeMenu(); return; }
    if (event.key !== "Tab" || !menuRef.current) return;
    const focusable = Array.from(menuRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    const first = focusable[0]; const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); window.open(makeWhatsAppLink(quoteMessage), "_blank", "noopener,noreferrer"); };

  return <>
    <div className="commercial-bar" aria-label="Información comercial"><div className="commercial-inner"><span>Envíos nacionales</span><span>Bases de mangueras</span><span>Atención por WhatsApp</span></div></div>
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`} aria-hidden={menuOpen}>
      <a className="brand-link" href="/" aria-label="Garden World, inicio"><Brand /></a>
      <nav className="desktop-nav" aria-label="Navegación principal">{NAV_ITEMS.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}</nav>
      <a className="button button-small header-quote" href="#cotizar">Cotizar <span aria-hidden="true">↗</span></a>
      <button ref={menuButtonRef} className="menu-trigger" type="button" aria-label="Abrir menú" aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen(true)}><span>Menú</span><span className="menu-lines" aria-hidden="true"><i /><i /></span></button>
    </header>
    <div ref={menuRef} id="mobile-menu" className={`mobile-menu${menuOpen ? " is-open" : ""}`} role="dialog" aria-modal="true" aria-label="Menú principal" aria-hidden={!menuOpen} onKeyDown={handleMenuKeyDown}>
      <div className="mobile-menu-head"><Brand inverse /><button type="button" onClick={closeMenu} aria-label="Cerrar menú" className="menu-close">Cerrar <span aria-hidden="true">×</span></button></div>
      <nav aria-label="Navegación móvil" className="mobile-menu-links">{NAV_ITEMS.map((item, index) => <a key={item.href} href={item.href} onClick={closeMenu} tabIndex={menuOpen ? 0 : -1}><span>0{index + 1}</span>{item.label}<i aria-hidden="true">↗</i></a>)}</nav>
      <a className="button button-light mobile-menu-cta" href="#cotizar" onClick={closeMenu} tabIndex={menuOpen ? 0 : -1}>Cotizar con nosotros <span aria-hidden="true">↗</span></a>
      <p className="mobile-menu-foot">Diseño, orden y funcionalidad para tu jardín.</p>
    </div>
    <main aria-hidden={menuOpen}>
      <section className="hero" aria-labelledby="hero-title"><div className="hero-copy"><p className="eyebrow hero-eyebrow">Bases de mangueras Garden World</p><h1 id="hero-title">Tu mundo.<span>Tu jardín.</span></h1><p className="hero-intro">Diseño, orden y funcionalidad para disfrutar mejor los espacios exteriores.</p><div className="hero-actions"><a className="button" href="#bases">Conocer nuestras bases <span aria-hidden="true">↓</span></a><a className="text-link" href="#cotizar">Cotizar <span aria-hidden="true">↗</span></a></div></div><div className="hero-visual" aria-label="Base para manguera Garden World"><div className="hero-image-wrap"><img src="/images/ru-inox-45.webp" alt="Base para manguera Garden World en acabado plata de acero inoxidable instalada en pared exterior" /></div><div className="hero-visual-note"><span>Producto principal</span><strong>Bases</strong><small>Diseño que ordena</small></div><svg className="hero-rings" viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="68" /><circle cx="90" cy="90" r="48" /><circle cx="90" cy="90" r="28" /></svg></div><p className="hero-side-note">Garden World · Venezuela</p></section>
      <section className="before-after-section" aria-labelledby="before-after-title"><div className="container before-after-heading" data-reveal><p className="eyebrow">Diseño que pone orden</p><h2 id="before-after-title">El orden también se diseña.</h2><p>Una solución pensada para que lo que necesitas esté en su lugar y tu jardín siga siendo parte de lo que quieres ver.</p></div><div className="container before-after-frame" data-reveal><BeforeAfterSlider before="/images/roll-up/roll-up-before.png" after="/images/roll-up/roll-up-after.png" beforeAlt="Manguera azul desorganizada sobre el piso de un jardín antes de instalar el soporte Garden World Roll Up." afterAlt="Manguera azul organizada sobre el soporte Garden World Roll Up instalado en una pared exterior de jardín." /><div className="before-after-caption"><span>Desliza. Mira la diferencia.</span><strong>Menos desorden. Más jardín.</strong></div></div></section>
      <section className="section intro-section" id="bases"><div className="container section-heading" data-reveal><p className="eyebrow">Bases de mangueras Garden World</p><h2>Diseño que pone orden.</h2><p>Una base para manguera que acompaña el uso cotidiano y se integra con el exterior.</p></div></section>
      <section className="rollup-section" id="beneficios"><div className="container rollup-grid"><div className="rollup-copy" data-reveal><p className="eyebrow eyebrow-light">Bases de mangueras Garden World</p><h2>Todo en su lugar.<br />También afuera.</h2><p className="rollup-lede">Una pieza para mantener la manguera ordenada, accesible y fuera del camino sin romper la estética de tu espacio.</p><ul className="benefit-list" aria-label="Beneficios de las bases de mangueras"><li><span>01</span>Orden visible</li><li><span>02</span>Uso simple</li><li><span>03</span>Diseño para exterior</li><li><span>04</span>Dos acabados</li></ul><a className="button button-light" href="/productos/">Conocer nuestras bases <span aria-hidden="true">↗</span></a></div><div className="rollup-media" data-reveal><img src="/images/ru-negro-43.webp" alt="Base para manguera Garden World en acabado negro mate con manguera organizada" loading="lazy" decoding="async" /><div className="media-caption"><span>Bases Garden World</span><span>Acabado Negro mate</span></div></div></div></section>
      <section className="section finishes-section" id="acabados"><div className="container section-heading section-heading-row" data-reveal><div><p className="eyebrow">Bases Garden World · Acabados</p><h2>Una forma.<br />Tu acabado.</h2></div><p>Elige el acabado que mejor se integra con los materiales, tonos y carácter de tu espacio.</p></div><div className="container finish-layout" data-reveal><div className="finish-image">{FINISHES.map((finish) => <img key={finish.key} src={finish.image} alt={`Base para manguera Garden World en acabado ${finish.label}`} className={finish.key === finishKey ? "is-active" : ""} loading={finish.key === "inox" ? "eager" : "lazy"} decoding="async" />)}<span className="finish-counter">0{FINISHES.findIndex((finish) => finish.key === finishKey) + 1} / 0{FINISHES.length}</span></div><div className="finish-panel"><div className="finish-current"><p>Acabado seleccionado</p><h3>{selectedFinish.label}</h3><span>{selectedFinish.description}</span></div><div className="finish-options" role="group" aria-label="Elegir acabado de bases de mangueras">{FINISHES.map((finish) => <button type="button" key={finish.key} className={finish.key === finishKey ? "is-active" : ""} aria-pressed={finish.key === finishKey} onClick={() => setFinishKey(finish.key)}><span className="finish-swatch" style={{ backgroundColor: finish.color }} aria-hidden="true" /><span>{finish.label}</span><small>{finish.sku}</small></button>)}</div><a className="button button-wide" href={finishWhatsApp} target="_blank" rel="noopener noreferrer" data-whatsapp-cta><WhatsAppIcon /> Cotiza este acabado <span aria-hidden="true">↗</span></a></div></div></section>
      <section className="section plants-section" aria-labelledby="details-title"><div className="container plants-grid"><div className="plants-copy" data-reveal><p className="eyebrow">Detalles y uso</p><h2 id="details-title">Hecha para el día a día afuera.</h2><p>Estamos preparando fotografías finales de uso, conexión y detalle para mostrar la base en contexto.</p><a className="button" href="#cotizar">Cotizar una base <span aria-hidden="true">↗</span></a></div><div className="plants-media" data-reveal><PhotoPlaceholder label="GW-IMG-BM-01 · Base instalada con manguera organizada" /></div></div></section>
      <section className="quote-section" id="cotizar"><div className="container quote-grid"><div className="quote-copy" data-reveal><p className="eyebrow">Cotización · Contacto</p><h2>Cuéntanos qué necesitas.</h2><p>Selecciona acabado y cantidad. La conversación continúa directamente por WhatsApp.</p><div className="quote-note"><span>01</span><p>Elige tu acabado.</p><span>02</span><p>Completa solo lo necesario.</p><span>03</span><p>Habla con un asesor.</p></div></div><form className="quote-form" onSubmit={handleSubmit} data-reveal><label><span>Producto</span><input value={PRODUCT_NAME} readOnly aria-readonly="true" /></label><div className="quote-form-row"><label><span>Acabado</span><select value={finishKey} onChange={(event) => setFinishKey(event.target.value as FinishKey)}>{FINISHES.map((finish) => <option value={finish.key} key={finish.key}>{finish.label}</option>)}</select></label><label><span>Cantidad</span><input type="number" min="1" inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label></div><div className="quote-form-row"><label><span>Ciudad <small>(opcional)</small></span><input type="text" autoComplete="address-level2" placeholder="Tu ciudad" value={city} onChange={(event) => setCity(event.target.value)} /></label><label><span>Tipo de cliente</span><select value={buyer} onChange={(event) => setBuyer(event.target.value)}><option>Hogar</option><option>Diseño exterior</option><option>Hotel / Desarrollo</option><option>Distribución / Mayorista</option></select></label></div><div className="message-preview" aria-live="polite"><span>Mensaje preparado</span><p>{quoteMessage}</p></div><button className="button button-wide" type="submit" data-whatsapp-cta><WhatsAppIcon /> Habla con un asesor <span aria-hidden="true">↗</span></button><p className="form-fineprint">No guardamos estos datos. El mensaje se abre en WhatsApp y tú decides si enviarlo.</p></form></div></section>
    </main>
    <footer className="site-footer" aria-hidden={menuOpen}><div className="container footer-top"><div className="footer-brand"><Brand inverse /><p>Diseño, orden y funcionalidad para tu jardín.</p></div><div className="footer-links"><div><p>Explorar</p>{NAV_ITEMS.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}</div><div><p>Atención</p><a href={makeWhatsAppLink("Hola Garden World, quiero cotizar una base para manguera.")} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a><span>Venezuela</span></div></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Garden World</span><span>Bases de mangueras</span></div></footer>
    <a className={`whatsapp-fab${inlineWhatsAppVisible ? " is-suppressed" : ""}`} href={makeWhatsAppLink("Hola Garden World, quiero cotizar una base para manguera.")} target="_blank" rel="noopener noreferrer" aria-label="Cotiza con nosotros por WhatsApp" aria-hidden={menuOpen || inlineWhatsAppVisible} tabIndex={menuOpen || inlineWhatsAppVisible ? -1 : undefined}><WhatsAppIcon /><span>Cotiza con nosotros</span></a>
  </>;
}
