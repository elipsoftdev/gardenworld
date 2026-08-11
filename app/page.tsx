"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

const WHATSAPP_NUMBER = "584143228003";

type FinishKey = "blanco" | "piedra" | "inox" | "corten" | "negro";

type Finish = {
  key: FinishKey;
  label: string;
  description: string;
  sku: string;
  color: string;
  image: string;
};

const FINISHES: Finish[] = [
  {
    key: "blanco",
    label: "Blanco",
    description: "Una presencia limpia para muros luminosos.",
    sku: "GW-RU-BLC",
    color: "#f5f3ed",
    image: "/images/ru-blanco-45.webp",
  },
  {
    key: "piedra",
    label: "Piedra",
    description: "Un neutro cálido que acompaña materiales naturales.",
    sku: "GW-RU-PDR",
    color: "#b9aa94",
    image: "/images/ru-piedra-45.webp",
  },
  {
    key: "inox",
    label: "Inoxidable",
    description: "Acabado sobrio para arquitectura contemporánea.",
    sku: "GW-RU-INX",
    color: "#c7c8c4",
    image: "/images/ru-inox-45.webp",
  },
  {
    key: "corten",
    label: "Corten",
    description: "Un tono mineral que suma carácter al exterior.",
    sku: "GW-RU-COR",
    color: "#8c4d31",
    image: "/images/ru-corten-45.webp",
  },
  {
    key: "negro",
    label: "Negro mate",
    description: "Contraste preciso para fachadas gráficas.",
    sku: "GW-RU-NGR",
    color: "#292b28",
    image: "/images/ru-negro-45.webp",
  },
];

const NAV_ITEMS = [
  { label: "Productos", href: "/productos/" },
  { label: "Plantas", href: "/plantas/" },
  { label: "Paisajismo", href: "/paisajismo/" },
  { label: "Proyectos", href: "/proyectos/" },
  { label: "Nosotros", href: "/nosotros/" },
];

const PILLARS = [
  {
    index: "01",
    kicker: "Products",
    title: "Objetos para el exterior",
    copy: "Piezas funcionales que ordenan el jardín y conviven con su arquitectura.",
    href: "/productos/",
    image: "/images/ru-negro-43.webp",
    alt: "Roll Up en acabado negro mate instalado en pared",
    className: "pillar-product",
  },
  {
    index: "02",
    kicker: "Plants",
    title: "Vegetación seleccionada",
    copy: "Una futura selección de plantas pensada según luz, lugar y forma de vivir.",
    href: "/plantas/",
    className: "pillar-plants",
  },
  {
    index: "03",
    kicker: "Landscapes",
    title: "Espacios diseñados",
    copy: "Paisajismo que reúne vegetación, materiales y uso en una visión completa.",
    href: "/paisajismo/",
    className: "pillar-landscape",
  },
];

function makeWhatsAppLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="wa-icon">
      <path
        fill="currentColor"
        d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.6 4.2 1.6 6L.2 24l6.3-1.7a11.8 11.8 0 0 0 5.6 1.4c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.4-8.4Zm-8.4 18.2c-1.8 0-3.6-.5-5.2-1.4l-.4-.2-3.7 1 1-3.6-.2-.4a9.7 9.7 0 1 1 8.5 4.6Zm5.3-7.3c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.2-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-1.9-.9-3.1-1.7-4.3-3.9-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.6l-.9-2.1c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.3 3.4 1.4 3.6c.2.2 2.5 3.8 6 5.3 2.2.9 3 .9 4.1.8.7-.1 1.7-.7 1.9-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3Z"
      />
    </svg>
  );
}

function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={`brand${inverse ? " brand-inverse" : ""}`}>
      <svg viewBox="0 0 34 34" aria-hidden="true" className="brand-mark">
        <circle cx="17" cy="17" r="12.5" />
        <circle cx="17" cy="17" r="8" />
        <circle cx="17" cy="17" r="3.5" />
        <path d="M22.5 7.5c3-2.5 6.2-2.8 6.2-2.8s-.6 3.6-3.7 5" />
      </svg>
      <span>Garden World</span>
    </span>
  );
}

function PhotoPlaceholder({ label, kind }: { label: string; kind: "plants" | "landscape" | "project" }) {
  return (
    <div className={`photo-placeholder photo-placeholder-${kind}`} aria-label={label} data-content-status="pending">
      <span className="placeholder-line" aria-hidden="true" />
      <span className="placeholder-copy">
        <small>Archivo visual</small>
        <strong>{label}</strong>
      </span>
    </div>
  );
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inlineWhatsAppVisible, setInlineWhatsAppVisible] = useState(false);
  const [finishKey, setFinishKey] = useState<FinishKey>("piedra");
  const [product, setProduct] = useState("Roll Up");
  const [quantity, setQuantity] = useState("1");
  const [city, setCity] = useState("");
  const [buyer, setBuyer] = useState("Hogar");
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const selectedFinish = FINISHES.find((finish) => finish.key === finishKey) ?? FINISHES[1];

  const finishWhatsApp = makeWhatsAppLink(
    `Hola Garden World, quiero cotizar Roll Up en acabado ${selectedFinish.label} (${selectedFinish.sku}). ¿Me comparten disponibilidad y próximos pasos?`,
  );

  const quoteMessage = useMemo(() => {
    const lines = ["Hola Garden World,", "", "Quiero conversar sobre:", `· Área: ${product}`];
    if (product === "Roll Up") {
      lines.push(`· Acabado: ${selectedFinish.label} (${selectedFinish.sku})`);
      lines.push(`· Cantidad: ${quantity || "1"}`);
    }
    if (city.trim()) lines.push(`· Ciudad: ${city.trim()}`);
    lines.push(`· Consulta como: ${buyer}`, "", "¿Me comparten disponibilidad y próximos pasos?");
    return lines.join("\n");
  }, [buyer, city, product, quantity, selectedFinish]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -5%" },
    );
    document.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const ctas = Array.from(document.querySelectorAll<HTMLElement>("[data-whatsapp-cta]"));
    if (!ctas.length) return;

    const visibleCtas = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visibleCtas.add(entry.target);
          else visibleCtas.delete(entry.target);
        });
        setInlineWhatsAppVisible(visibleCtas.size > 0);
      },
      { threshold: 0 },
    );

    ctas.forEach((cta) => observer.observe(cta));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>("button, a")?.focus();
    });
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  const closeMenu = () => {
    setMenuOpen(false);
    window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (event.key !== "Tab" || !menuRef.current) return;
    const focusable = Array.from(
      menuRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.open(makeWhatsAppLink(quoteMessage), "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div className="commercial-bar" aria-label="Información comercial" aria-hidden={menuOpen}>
        <div className="commercial-inner">
          <span>Envíos nacionales</span>
          <span>Proyectos de paisajismo</span>
          <span>Atención por WhatsApp</span>
          <span>Ventas al mayor</span>
        </div>
      </div>

      <header className={`site-header${scrolled ? " is-scrolled" : ""}`} aria-hidden={menuOpen}>
        <a className="brand-link" href="/" aria-label="Garden World, inicio">
          <Brand />
        </a>
        <nav className="desktop-nav" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <a className="button button-small header-quote" href="#cotizar">
          Cotizar <span aria-hidden="true">↗</span>
        </a>
        <button
          ref={menuButtonRef}
          className="menu-trigger"
          type="button"
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen(true)}
        >
          <span>Menú</span>
          <span className="menu-lines" aria-hidden="true"><i /><i /></span>
        </button>
      </header>

      <div
        ref={menuRef}
        id="mobile-menu"
        className={`mobile-menu${menuOpen ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menú principal"
        aria-hidden={!menuOpen}
        onKeyDown={handleMenuKeyDown}
      >
        <div className="mobile-menu-head">
          <Brand inverse />
          <button type="button" onClick={closeMenu} aria-label="Cerrar menú" className="menu-close">
            Cerrar <span aria-hidden="true">×</span>
          </button>
        </div>
        <nav aria-label="Navegación móvil" className="mobile-menu-links">
          {NAV_ITEMS.map((item, index) => (
            <a key={item.href} href={item.href} onClick={closeMenu} tabIndex={menuOpen ? 0 : -1}>
              <span>0{index + 1}</span>{item.label}<i aria-hidden="true">↗</i>
            </a>
          ))}
        </nav>
        <a className="button button-light mobile-menu-cta" href="#cotizar" onClick={closeMenu} tabIndex={menuOpen ? 0 : -1}>
          Cotizar con nosotros <span aria-hidden="true">↗</span>
        </a>
        <p className="mobile-menu-foot">Objetos, plantas y espacios para vivir afuera.</p>
      </div>

      <main aria-hidden={menuOpen}>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow hero-eyebrow">Productos · Plantas · Paisajismo</p>
            <h1 id="hero-title">
              Vivir afuera,
              <span>mejor pensado.</span>
            </h1>
            <p className="hero-intro">
              Objetos, vegetación y diseño para convertir el exterior en parte de la vida cotidiana.
            </p>
            <div className="hero-actions">
              <a className="button" href="#universo">
                Explorar Garden World <span aria-hidden="true">↓</span>
              </a>
              <a className="text-link" href="#roll-up">Conocer Roll Up <span aria-hidden="true">↗</span></a>
            </div>
          </div>
          <div className="hero-visual" aria-label="Roll Up, producto de Garden World">
            <div className="hero-image-wrap">
              <img src="/images/ru-piedra-45.webp" alt="Roll Up en acabado piedra instalado en una pared exterior" />
            </div>
            <div className="hero-visual-note">
              <span>Producto 01</span>
              <strong>Roll Up</strong>
              <small>Orden para el exterior</small>
            </div>
            <svg className="hero-rings" viewBox="0 0 180 180" aria-hidden="true">
              <circle cx="90" cy="90" r="68" /><circle cx="90" cy="90" r="48" /><circle cx="90" cy="90" r="28" />
            </svg>
          </div>
          <p className="hero-side-note">Garden World · Venezuela</p>
        </section>

        <section className="section intro-section" id="universo">
          <div className="container section-heading" data-reveal>
            <p className="eyebrow">Un solo universo exterior</p>
            <h2>Del objeto puntual<br />al espacio completo.</h2>
            <p>
              Garden World reúne tres maneras de mejorar el exterior: elegir lo que usas, lo que crece y cómo todo convive.
            </p>
          </div>
          <div className="container pillar-grid">
            {PILLARS.map((pillar) => (
              <a className={`pillar ${pillar.className}`} href={pillar.href} key={pillar.kicker} data-reveal>
                <div className="pillar-media">
                  {pillar.image ? (
                    <img src={pillar.image} alt={pillar.alt} loading="lazy" decoding="async" />
                  ) : (
                    <PhotoPlaceholder
                      label={pillar.kicker === "Plants" ? "Plantas" : "Paisajismo"}
                      kind={pillar.kicker === "Plants" ? "plants" : "landscape"}
                    />
                  )}
                  <span className="pillar-number">{pillar.index}</span>
                </div>
                <div className="pillar-copy">
                  <p>{pillar.kicker}</p>
                  <h3>{pillar.title}</h3>
                  <span>{pillar.copy}</span>
                  <i aria-hidden="true">Explorar ↗</i>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="rollup-section" id="roll-up">
          <div className="container rollup-grid">
            <div className="rollup-copy" data-reveal>
              <p className="eyebrow eyebrow-light">Producto protagonista · Roll Up</p>
              <h2>La manguera ya no va en el piso.</h2>
              <p className="rollup-lede">
                Una pieza de metal que transforma algo cotidiano en una decisión de arquitectura exterior.
              </p>
              <ul className="benefit-list" aria-label="Beneficios de Roll Up">
                <li><span>01</span>Una pieza</li>
                <li><span>02</span>Sin mecanismos</li>
                <li><span>03</span>Metal</li>
                <li><span>04</span>Cinco acabados</li>
                <li><span>05</span>Exterior</li>
              </ul>
              <a className="button button-light" href="/productos/">Ver producto <span aria-hidden="true">↗</span></a>
            </div>
            <div className="rollup-media" data-reveal>
              <img src="/images/ru-corten-43.webp" alt="Roll Up en acabado corten con manguera enrollada" loading="lazy" decoding="async" />
              <div className="media-caption"><span>Roll Up</span><span>Acabado Corten</span></div>
            </div>
          </div>
        </section>

        <section className="section finishes-section" id="acabados">
          <div className="container section-heading section-heading-row" data-reveal>
            <div>
              <p className="eyebrow">Roll Up · Acabados</p>
              <h2>Una forma.<br />Cinco acabados.</h2>
            </div>
            <p>La misma pieza cambia de presencia para acompañar la fachada, el jardín y sus materiales.</p>
          </div>
          <div className="container finish-layout" data-reveal>
            <div className="finish-image">
              {FINISHES.map((finish) => (
                <img
                  key={finish.key}
                  src={finish.image}
                  alt={`Roll Up en acabado ${finish.label}`}
                  className={finish.key === finishKey ? "is-active" : ""}
                  loading={finish.key === "piedra" ? "eager" : "lazy"}
                  decoding="async"
                />
              ))}
              <span className="finish-counter">0{FINISHES.findIndex((finish) => finish.key === finishKey) + 1} / 05</span>
            </div>
            <div className="finish-panel">
              <div className="finish-current">
                <p>Acabado seleccionado</p>
                <h3>{selectedFinish.label}</h3>
                <span>{selectedFinish.description}</span>
              </div>
              <div className="finish-options" role="group" aria-label="Elegir acabado de Roll Up">
                {FINISHES.map((finish) => (
                  <button
                    type="button"
                    key={finish.key}
                    className={finish.key === finishKey ? "is-active" : ""}
                    aria-pressed={finish.key === finishKey}
                    onClick={() => setFinishKey(finish.key)}
                  >
                    <span className="finish-swatch" style={{ backgroundColor: finish.color }} aria-hidden="true" />
                    <span>{finish.label}</span>
                    <small>{finish.sku}</small>
                  </button>
                ))}
              </div>
              <a className="button button-wide" href={finishWhatsApp} target="_blank" rel="noopener noreferrer" data-whatsapp-cta>
                <WhatsAppIcon /> Cotiza este acabado <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </section>

        <section className="section plants-section" id="plantas">
          <div className="container plants-grid">
            <div className="plants-copy" data-reveal>
              <p className="eyebrow">Plants · Próxima colección</p>
              <h2>La planta correcta empieza por el lugar.</h2>
              <p>
                Preparamos una selección para explorar según la luz y el tipo de espacio, conectada con nuestro servicio de paisajismo.
              </p>
              <div className="plant-filters" aria-label="Categorías futuras de plantas">
                {['Sol', 'Sombra', 'Interior', 'Exterior', 'Terrazas'].map((item) => <span key={item}>{item}</span>)}
              </div>
              <a className="button" href="/plantas/">Ver plantas <span aria-hidden="true">↗</span></a>
            </div>
            <div className="plants-media" data-reveal>
              <PhotoPlaceholder label="Colección de plantas" kind="plants" />
            </div>
          </div>
        </section>

        <section className="landscape-section" id="paisajismo">
          <div className="landscape-visual" data-reveal>
            <PhotoPlaceholder label="Proyecto de paisajismo" kind="landscape" />
            <div className="landscape-index">GW / L—01</div>
          </div>
          <div className="landscape-copy" data-reveal>
            <p className="eyebrow eyebrow-light">Landscapes · Servicio</p>
            <h2>Diseñamos<br />el conjunto.</h2>
            <p>Vegetación, materiales, distribución y ejecución pensados como una sola experiencia.</p>
            <ul>
              <li>Diseño</li><li>Vegetación</li><li>Materiales</li><li>Distribución</li><li>Ejecución</li>
            </ul>
            <a className="button button-light" href="/paisajismo/">Conocer el servicio <span aria-hidden="true">↗</span></a>
          </div>
        </section>

        <section className="section projects-section" id="proyectos">
          <div className="container section-heading section-heading-row" data-reveal>
            <div>
              <p className="eyebrow">Proyectos · Archivo en preparación</p>
              <h2>Espacios que contarán la historia completa.</h2>
            </div>
            <p>Esta sección alojará casos documentados con ubicación, tipología, productos, plantas y alcance del servicio.</p>
          </div>
          <div className="container project-grid">
            <a href="/proyectos/" className="project project-large" data-reveal>
              <PhotoPlaceholder label="Proyecto exterior 01" kind="project" />
              <span><small>Próximamente</small><strong>Primer caso documentado</strong><i aria-hidden="true">↗</i></span>
            </a>
            <a href="/proyectos/" className="project project-small" data-reveal>
              <PhotoPlaceholder label="Proyecto exterior 02" kind="project" />
              <span><small>Próximamente</small><strong>Archivo de proyectos</strong><i aria-hidden="true">↗</i></span>
            </a>
          </div>
        </section>

        <section className="professional-section">
          <div className="container professional-grid" data-reveal>
            <div>
              <p className="eyebrow">Garden World · Profesionales</p>
              <h2>Para quienes diseñan y construyen el exterior.</h2>
            </div>
            <div>
              <p>Atención para arquitectos, paisajistas, desarrolladores, hoteles, distribuidores y mayoristas.</p>
              <a className="text-link" href="#cotizar">Conversemos sobre tu proyecto <span aria-hidden="true">↗</span></a>
            </div>
          </div>
        </section>

        <section className="quote-section" id="cotizar">
          <div className="container quote-grid">
            <div className="quote-copy" data-reveal>
              <p className="eyebrow">Cotización · Contacto</p>
              <h2>¿Qué quieres llevar afuera?</h2>
              <p>Selecciona un área y preparamos el mensaje. La conversación continúa directamente en WhatsApp.</p>
              <div className="quote-note">
                <span>01</span><p>Completa solo lo necesario.</p>
                <span>02</span><p>Revisa el mensaje preparado.</p>
                <span>03</span><p>Habla con un asesor.</p>
              </div>
            </div>
            <form className="quote-form" onSubmit={handleSubmit} data-reveal>
              <label>
                <span>Quiero conversar sobre</span>
                <select value={product} onChange={(event) => setProduct(event.target.value)}>
                  <option>Roll Up</option>
                  <option>Plantas</option>
                  <option>Paisajismo</option>
                  <option>Ventas profesionales / B2B</option>
                </select>
              </label>
              {product === "Roll Up" && (
                <div className="quote-form-row">
                  <label>
                    <span>Acabado</span>
                    <select value={finishKey} onChange={(event) => setFinishKey(event.target.value as FinishKey)}>
                      {FINISHES.map((finish) => <option value={finish.key} key={finish.key}>{finish.label}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Cantidad</span>
                    <input type="number" min="1" inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                  </label>
                </div>
              )}
              <div className="quote-form-row">
                <label>
                  <span>Ciudad <small>(opcional)</small></span>
                  <input type="text" autoComplete="address-level2" placeholder="Tu ciudad" value={city} onChange={(event) => setCity(event.target.value)} />
                </label>
                <label>
                  <span>Tipo de consulta</span>
                  <select value={buyer} onChange={(event) => setBuyer(event.target.value)}>
                    <option>Hogar</option>
                    <option>Arquitectura / Paisajismo</option>
                    <option>Hotel / Desarrollo</option>
                    <option>Distribución / Mayorista</option>
                  </select>
                </label>
              </div>
              <div className="message-preview" aria-live="polite">
                <span>Mensaje preparado</span>
                <p>{quoteMessage}</p>
              </div>
              <button className="button button-wide" type="submit" data-whatsapp-cta>
                <WhatsAppIcon /> Habla con un asesor <span aria-hidden="true">↗</span>
              </button>
              <p className="form-fineprint">No guardamos estos datos. El mensaje se abre en WhatsApp y tú decides si enviarlo.</p>
            </form>
          </div>
        </section>
      </main>

      <footer className="site-footer" aria-hidden={menuOpen}>
        <div className="container footer-top">
          <div className="footer-brand">
            <Brand inverse />
            <p>Objetos, plantas y espacios para vivir afuera.</p>
          </div>
          <div className="footer-links">
            <div><p>Explorar</p>{NAV_ITEMS.slice(0, 3).map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}</div>
            <div><p>Garden World</p>{NAV_ITEMS.slice(3).map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}<a href="#cotizar">Cotizar</a></div>
            <div><p>Atención</p><a href={makeWhatsAppLink("Hola Garden World, quiero conocer más sobre sus productos y servicios.")} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a><span>Venezuela</span></div>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} Garden World</span>
          <span>Productos · Plantas · Paisajismo</span>
        </div>
      </footer>

      <a
        className={`whatsapp-fab${inlineWhatsAppVisible ? " is-suppressed" : ""}`}
        href={makeWhatsAppLink("Hola Garden World, quiero cotizar un producto o proyecto.")}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Cotiza con nosotros por WhatsApp"
        aria-hidden={menuOpen || inlineWhatsAppVisible}
        tabIndex={menuOpen || inlineWhatsAppVisible ? -1 : undefined}
      >
        <WhatsAppIcon /><span>Cotiza con nosotros</span>
      </a>
    </>
  );
}
