'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { adminApi } from '@/lib/admin/api';
import type { AdminUser } from '@/lib/admin/types';

type Toast = { id: number; message: string; tone: 'success' | 'error' };
type AdminContextValue = { user: AdminUser; notify: (message: string, tone?: Toast['tone']) => void };
const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used inside AdminShell');
  return context;
}

const nav = [
  ['/', 'Inicio', 'home'],
  ['/products', 'Productos', 'box'],
  ['/categories', 'Categorías', 'layers'],
  ['/home', 'Home', 'layout'],
  ['/offers', 'Ofertas', 'tag'],
] as const;

const titles: Record<string, string> = {
  '/admin': 'Inicio',
  '/admin/products': 'Productos',
  '/admin/products/new': 'Nuevo producto',
  '/admin/categories': 'Categorías',
  '/admin/home': 'Home',
  '/admin/offers': 'Ofertas',
  '/admin/users': 'Usuarios',
  '/admin/audit': 'Auditoría',
  '/admin/account': 'Mi cuenta',
};

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/></>,
    box: <><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/></>,
    layers: <><path d="m12 3-9 5 9 5 9-5-9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
    layout: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M9 9h12"/></>,
    tag: <path d="M20 13 11 22l-9-9V4h9l9 9ZM7 8h.01"/>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    audit: <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,
    account: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></>,
  };
  return <svg className="admin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{paths[name]}</svg>;
}

export function AdminShell({ initialUser, children }: { initialUser: AdminUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const firstLink = useRef<HTMLAnchorElement>(null);

  const notify = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items, { id, message, tone }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3600);
  }, []);

  useEffect(() => setDrawerOpen(false), [pathname]);
  useEffect(() => {
    const unauthorized = () => router.replace('/admin/login');
    window.addEventListener('gardenworld:unauthorized', unauthorized);
    return () => window.removeEventListener('gardenworld:unauthorized', unauthorized);
  }, [router]);
  useEffect(() => {
    if (!drawerOpen) return;
    firstLink.current?.focus();
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [drawerOpen]);

  async function logout() {
    setLoggingOut(true);
    try {
      await adminApi('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/admin/login');
      router.refresh();
    }
  }

  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  const pageTitle = normalizedPath.startsWith('/admin/products/') && normalizedPath !== '/admin/products/new'
    ? 'Editar producto'
    : titles[normalizedPath] ?? 'Administración';

  const navigation = (
    <>
      <div className="admin-brand">
        <span className="admin-brand__mark">GW</span>
        <span><strong>Garden World</strong><small>Administración</small></span>
      </div>
      <nav className="admin-nav" aria-label="Navegación principal">
        {nav.map(([href, label, icon], index) => {
          const full = `/admin${href === '/' ? '' : href}`;
          const active = href === '/' ? pathname === full : pathname.startsWith(full);
          return <Link ref={index === 0 ? firstLink : undefined} key={href} href={full} className={active ? 'is-active' : ''}><Icon name={icon}/><span>{label}</span></Link>;
        })}
        {initialUser.role === 'super_admin' ? <div className="admin-nav__group"><span>Control</span><Link href="/admin/users" className={pathname.startsWith('/admin/users') ? 'is-active' : ''}><Icon name="users"/>Usuarios</Link><Link href="/admin/audit" className={pathname.startsWith('/admin/audit') ? 'is-active' : ''}><Icon name="audit"/>Auditoría</Link></div> : null}
      </nav>
      <div className="admin-sidebar__foot">
        <Link href="/admin/account" className={pathname === '/admin/account' ? 'is-active' : ''}><Icon name="account"/><span><strong>{initialUser.name}</strong><small>{initialUser.role === 'super_admin' ? 'Super Admin' : 'Admin'}</small></span></Link>
        <button type="button" onClick={logout} disabled={loggingOut}><Icon name="logout"/>{loggingOut ? 'Saliendo…' : 'Cerrar sesión'}</button>
      </div>
    </>
  );

  return (
    <AdminContext.Provider value={{ user: initialUser, notify }}>
      <div className="admin-app">
        <aside className="admin-sidebar">{navigation}</aside>
        {drawerOpen ? <button type="button" className="admin-drawer-backdrop" aria-label="Cerrar menú" onClick={() => setDrawerOpen(false)} /> : null}
        <aside className={`admin-drawer ${drawerOpen ? 'is-open' : ''}`} aria-label="Menú móvil" aria-hidden={!drawerOpen}>{navigation}</aside>
        <div className="admin-workspace">
          <header className="admin-topbar">
            <button type="button" className="admin-menu-button" aria-expanded={drawerOpen} aria-controls="admin-drawer" onClick={() => setDrawerOpen(true)}><span/><span/><span/><span className="sr-only">Abrir menú</span></button>
            <div><p>Garden World</p><h1>{pageTitle}</h1></div>
            <Link href="/admin/account" className="admin-avatar" aria-label="Ir a Mi cuenta">{initialUser.name.charAt(0).toUpperCase()}</Link>
          </header>
          <main className="admin-content">{children}</main>
        </div>
      </div>
      <div className="admin-toasts" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => <div key={toast.id} className={`admin-toast admin-toast--${toast.tone}`}><span aria-hidden="true">{toast.tone === 'success' ? '✓' : '!'}</span>{toast.message}</div>)}
      </div>
    </AdminContext.Provider>
  );
}
