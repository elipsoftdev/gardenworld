import type { Db } from './index';

export const HOME_SECTION_KEYS = ['categories', 'featured', 'offers', 'new_arrivals'] as const;
export type HomeSectionKey = (typeof HOME_SECTION_KEYS)[number];

const STRUCTURAL_SECTIONS: { key: HomeSectionKey; title: string; order: number }[] = [
  { key: 'categories', title: 'Categorias', order: 1 },
  { key: 'featured', title: 'Destacados', order: 2 },
  { key: 'offers', title: 'Ofertas', order: 3 },
  { key: 'new_arrivals', title: 'Novedades', order: 4 },
];

/**
 * Structural seed only: recreates the home section rows the admin UI will edit.
 * Safe to run on every boot and after an ephemeral filesystem wipe; it never
 * overwrites values an administrator has already changed.
 */
export function runStructuralSeed(db: Db): void {
  const insert = db.prepare(
    `INSERT INTO home_sections (section_key, title, subtitle, enabled, display_order)
     VALUES (?, ?, NULL, 1, ?)
     ON CONFLICT (section_key) DO NOTHING`,
  );
  const seed = db.transaction(() => {
    for (const section of STRUCTURAL_SECTIONS) {
      insert.run(section.key, section.title, section.order);
    }
  });
  seed();
}

export function isDevelopmentEnv(): boolean {
  return process.env.SITE_ENV === 'development';
}

/**
 * Development-only demo content. Never runs outside SITE_ENV=development and
 * never publishes anything, so demo rows stay invisible to the public catalog.
 */
export function runDevSeed(db: Db): { categories: number; products: number } {
  if (!isDevelopmentEnv()) return { categories: 0, products: 0 };

  const already = db.prepare("SELECT 1 FROM categories WHERE slug = 'demo-riego'").get();
  if (already) return { categories: 0, products: 0 };

  let categories = 0;
  let products = 0;

  const seed = db.transaction(() => {
    const parent = db
      .prepare(
        `INSERT INTO categories (name, slug, description, published, show_in_menu, show_on_home, display_order)
         VALUES ('Demo Riego', 'demo-riego', 'Demo category for development only', 0, 0, 0, 1)`,
      )
      .run();
    categories += 1;

    db.prepare(
      `INSERT INTO categories (parent_id, name, slug, description, published, show_in_menu, show_on_home, display_order)
       VALUES (?, 'Demo Porta Mangueras', 'demo-porta-mangueras', 'Demo subcategory for development only', 0, 0, 0, 1)`,
    ).run(parent.lastInsertRowid);
    categories += 1;

    db.prepare(
      `INSERT INTO products (name, slug, category_id, short_description, price, currency, status, published, indexable)
       VALUES ('Demo Product', 'demo-product', ?, 'Development placeholder, not commercial content', 0, 'USD', 'draft', 0, 0)`,
    ).run(parent.lastInsertRowid);
    products += 1;
  });

  seed();
  return { categories, products };
}
