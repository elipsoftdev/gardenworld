'use client';

import Link from 'next/link';
import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { PublicCategory } from '@/lib/public/catalog';
import { makeWhatsAppLink } from '@/lib/site';

const WHATSAPP_POSITION_KEY = 'gardenworld-whatsapp-position';
const DESKTOP_BREAKPOINT = 1181;
const WHATSAPP_DRAG_MARGIN = 16;

export function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="wa-icon"><path fill="currentColor" d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.6 4.2 1.6 6L.2 24l6.3-1.7a11.8 11.8 0 0 0 5.6 1.4c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.4-8.4Zm-8.4 18.2c-1.8 0-3.6-.5-5.2-1.4l-.4-.2-3.7 1 1-3.6-.2-.4a9.7 9.7 0 1 1 8.5 4.6Zm5.3-7.3c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.2-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-1.9-.9-3.1-1.7-4.3-3.9-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.6l-.9-2.1c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.3 3.4 1.4 3.6c.2.2 2.5 3.8 6 5.3 2.2.9 3 .9 4.1.8.7-.1 1.7-.7 1.9-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3Z" /></svg>;
}

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return <span className={`brand${inverse ? ' brand-inverse' : ''}`}><img src="/images/brand/garden-world-logo-original.png" alt="" aria-hidden="true" className="brand-mark" /><span>Garden World</span></span>;
}

export default function PublicShell({
  children,
  categories,
  whatsappMessage = 'Hola Garden World, quisiera conocer sus productos y recibir orientación.',
}: {
  children: ReactNode;
  categories: PublicCategory[];
  whatsappMessage?: string;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inlineWhatsAppVisible, setInlineWhatsAppVisible] = useState(false);
  const [whatsappPosition, setWhatsappPosition] = useState<{ left: number; top: number } | null>(null);
  const [whatsappDragging, setWhatsappDragging] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const whatsappButtonRef = useRef<HTMLAnchorElement>(null);
  const whatsappDragRef = useRef<{ pointerId: number; startX: number; startY: number; lastX: number; lastY: number; startLeft: number; startTop: number; moved: boolean } | null>(null);
  const suppressWhatsAppClickRef = useRef(false);
  const whatsappHref = makeWhatsAppLink(whatsappMessage);

  const clampWhatsAppPosition = useCallback((left: number, top: number) => {
    const button = whatsappButtonRef.current;
    const width = button?.offsetWidth ?? 52;
    const height = button?.offsetHeight ?? 52;
    return {
      left: Math.min(Math.max(WHATSAPP_DRAG_MARGIN, left), Math.max(WHATSAPP_DRAG_MARGIN, window.innerWidth - width - WHATSAPP_DRAG_MARGIN)),
      top: Math.min(Math.max(WHATSAPP_DRAG_MARGIN, top), Math.max(WHATSAPP_DRAG_MARGIN, window.innerHeight - height - WHATSAPP_DRAG_MARGIN)),
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    const reveal = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        reveal.unobserve(entry.target);
      }
    }), { threshold: 0.1, rootMargin: '0px 0px -4%' });
    document.querySelectorAll('[data-reveal]').forEach((element) => reveal.observe(element));
    return () => { window.removeEventListener('scroll', onScroll); reveal.disconnect(); };
  }, []);

  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-whatsapp-cta]'));
    const visible = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
      setInlineWhatsAppVisible(visible.size > 0);
    });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(WHATSAPP_POSITION_KEY) ?? 'null') as { left?: unknown; top?: unknown } | null;
      if (typeof stored?.left === 'number' && typeof stored.top === 'number') setWhatsappPosition(clampWhatsAppPosition(stored.left, stored.top));
    } catch { window.localStorage.removeItem(WHATSAPP_POSITION_KEY); }
    const onResize = () => setWhatsappPosition((current) => {
      if (!current) return current;
      const next = clampWhatsAppPosition(current.left, current.top);
      window.localStorage.setItem(WHATSAPP_POSITION_KEY, JSON.stringify(next));
      return next;
    });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clampWhatsAppPosition]);

  useEffect(() => {
    if (!menuOpen) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>('button, a')?.focus());
    return () => { document.body.style.overflow = overflow; };
  }, [menuOpen]);

  const closeMenu = () => {
    setMenuOpen(false);
    window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); closeMenu(); return; }
    if (event.key !== 'Tab' || !menuRef.current) return;
    const focusable = Array.from(menuRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };

  const pointerDown = (event: PointerEvent<HTMLAnchorElement>) => {
    if (window.innerWidth < DESKTOP_BREAKPOINT || event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    whatsappDragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY, startLeft: whatsappPosition?.left ?? rect.left, startTop: whatsappPosition?.top ?? rect.top, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: PointerEvent<HTMLAnchorElement>) => {
    const drag = whatsappDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const x = event.clientX - drag.startX;
    const y = event.clientY - drag.startY;
    drag.lastX = event.clientX; drag.lastY = event.clientY;
    if (!drag.moved && Math.hypot(x, y) < 4) return;
    drag.moved = true; setWhatsappDragging(true);
    setWhatsappPosition(clampWhatsAppPosition(drag.startLeft + x, drag.startTop + y));
  };
  const pointerEnd = (event: PointerEvent<HTMLAnchorElement>) => {
    const drag = whatsappDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag.moved) {
      suppressWhatsAppClickRef.current = true;
      const next = clampWhatsAppPosition(drag.startLeft + drag.lastX - drag.startX, drag.startTop + drag.lastY - drag.startY);
      setWhatsappPosition(next); window.localStorage.setItem(WHATSAPP_POSITION_KEY, JSON.stringify(next));
    }
    whatsappDragRef.current = null; setWhatsappDragging(false);
  };

  return <>
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <div className="commercial-bar" aria-label="Información comercial"><div className="commercial-inner"><span>Garden World · Venezuela</span><span>Atención directa</span><span>0422-GARDENW</span></div></div>
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}`} aria-hidden={menuOpen}>
      <Link className="brand-link" href="/" aria-label="Garden World, inicio"><Brand /></Link>
      <nav className="desktop-nav" aria-label="Navegación principal">
        <Link href="/">Inicio</Link>
        <div className="nav-products"><Link href="/productos/">Productos</Link>{categories.length > 0 ? <div className="nav-dropdown"><Link href="/productos/">Ver todos</Link>{categories.map((category) => <Link key={category.id} href={`/productos/categoria/${category.slug}/`}>{category.name}</Link>)}</div> : null}</div>
        <Link href="/nosotros/">Nosotros</Link>
      </nav>
      <a className="button button-small header-quote" href={whatsappHref} target="_blank" rel="noopener noreferrer"><WhatsAppIcon /> WhatsApp <span aria-hidden="true">↗</span></a>
      <button ref={menuButtonRef} className="menu-trigger" type="button" aria-label="Abrir menú" aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen(true)}><span>Menú</span><span className="menu-lines" aria-hidden="true"><i /><i /></span></button>
    </header>
    <div ref={menuRef} id="mobile-menu" className={`mobile-menu${menuOpen ? ' is-open' : ''}`} role="dialog" aria-modal="true" aria-label="Menú principal" aria-hidden={!menuOpen} onKeyDown={handleMenuKeyDown}>
      <div className="mobile-menu-head"><Brand inverse /><button type="button" onClick={closeMenu} aria-label="Cerrar menú" className="menu-close">Cerrar <span aria-hidden="true">×</span></button></div>
      <nav aria-label="Navegación móvil" className="mobile-menu-links"><Link href="/" onClick={closeMenu} tabIndex={menuOpen ? 0 : -1}><span>01</span>Inicio<i aria-hidden="true">↗</i></Link><Link href="/productos/" onClick={closeMenu} tabIndex={menuOpen ? 0 : -1}><span>02</span>Productos<i aria-hidden="true">↗</i></Link>{categories.map((category) => <Link className="mobile-category-link" key={category.id} href={`/productos/categoria/${category.slug}/`} onClick={closeMenu} tabIndex={menuOpen ? 0 : -1}>{category.name}</Link>)}<Link href="/nosotros/" onClick={closeMenu} tabIndex={menuOpen ? 0 : -1}><span>03</span>Nosotros<i aria-hidden="true">↗</i></Link></nav>
      <a className="button button-light mobile-menu-cta" href={whatsappHref} target="_blank" rel="noopener noreferrer" tabIndex={menuOpen ? 0 : -1}><WhatsAppIcon /> Hablar con Garden World <span aria-hidden="true">↗</span></a>
      <p className="mobile-menu-foot">Tu mundo. Tu jardín.</p>
    </div>
    <div aria-hidden={menuOpen}>{children}<footer className="site-footer"><div className="container footer-top"><div className="footer-brand"><Brand inverse /><p>Diseño, orden y funcionalidad para disfrutar mejor tus espacios exteriores.</p></div><div className="footer-links"><div><p>Explorar</p><Link href="/">Inicio</Link><Link href="/productos/">Productos</Link><Link href="/nosotros/">Nosotros</Link></div><div><p>Atención</p><a href={whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a><a href={whatsappHref} target="_blank" rel="noopener noreferrer">0422-GARDENW · 0422-427-3369</a><span>Venezuela</span></div><div><p>Corporativo</p><span>GARDEN WORLD, C.A.</span><span>RIF J508706625</span></div></div></div><div className="container footer-bottom"><span>© 2026 Garden World · Diseño y desarrollo web por <a href="https://elipsoft.us" target="_blank" rel="noopener noreferrer">Elipsoft LLC</a></span></div></footer></div>
    <a ref={whatsappButtonRef} className={`whatsapp-fab${inlineWhatsAppVisible ? ' is-suppressed' : ''}${whatsappDragging ? ' is-dragging' : ''}`} style={whatsappPosition ? { left: `${whatsappPosition.left}px`, top: `${whatsappPosition.top}px`, right: 'auto', bottom: 'auto' } : undefined} href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="Hablar con Garden World por WhatsApp" aria-hidden={menuOpen || inlineWhatsAppVisible} tabIndex={menuOpen || inlineWhatsAppVisible ? -1 : undefined} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onClick={(event) => { if (suppressWhatsAppClickRef.current) { event.preventDefault(); suppressWhatsAppClickRef.current = false; } }}><WhatsAppIcon /><span>Hablar por WhatsApp</span></a>
  </>;
}
