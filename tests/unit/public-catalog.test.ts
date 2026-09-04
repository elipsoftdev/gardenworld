import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { migrations } from '@/lib/db/migrations';
import { runStructuralSeed } from '@/lib/db/seed';
import { getPublicCatalog, getPublicHomeSections, getPublicProductPage } from '@/lib/public/catalog';

let db: Database.Database;

before(() => {
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  for (const migration of migrations) db.exec(migration.sql);
  runStructuralSeed(db);

  const visible = Number(db.prepare(`INSERT INTO categories (name, slug, description, published, show_in_menu, show_on_home, display_order) VALUES ('Riego', 'riego', 'Orden para el jardín', 1, 1, 1, 1)`).run().lastInsertRowid);
  const empty = Number(db.prepare(`INSERT INTO categories (name, slug, published, show_in_menu, show_on_home, display_order) VALUES ('Vacía', 'vacia', 1, 1, 1, 2)`).run().lastInsertRowid);
  db.prepare(`INSERT INTO categories (name, slug, published, show_in_menu, show_on_home) VALUES ('Borrador', 'borrador', 0, 1, 1)`).run();
  db.prepare(`INSERT INTO products (name, slug, category_id, price, status, published, featured, on_sale, new_arrival, indexable) VALUES ('Producto publicado', 'producto-publicado', ?, 80, 'published', 1, 1, 1, 1, 1)`).run(visible);
  db.prepare(`INSERT INTO products (name, slug, category_id, price, status, published, indexable) VALUES ('Relacionado', 'relacionado', ?, 60, 'published', 1, 1)`).run(visible);
  db.prepare(`INSERT INTO products (name, slug, category_id, price, status, published) VALUES ('Producto borrador', 'producto-borrador', ?, 40, 'draft', 0)`).run(empty);
  db.prepare(`UPDATE home_sections SET display_order = CASE section_key WHEN 'offers' THEN 1 WHEN 'featured' THEN 2 WHEN 'categories' THEN 3 ELSE 4 END`).run();
});

after(() => db.close());

describe('public catalog data layer', () => {
  test('keeps Admin Home order and omits disabled or empty sections', () => {
    db.prepare(`UPDATE home_sections SET enabled = 0 WHERE section_key = 'new_arrivals'`).run();
    const sections = getPublicHomeSections(db);
    assert.deepEqual(sections.map((section) => section.sectionKey), ['offers', 'featured', 'categories']);
    assert.ok(sections.every((section) => section.items.length > 0));
  });

  test('returns only published products and populated published categories', () => {
    const catalog = getPublicCatalog(db);
    assert.deepEqual(catalog.products.map((product) => product.slug), ['producto-publicado', 'relacionado']);
    assert.deepEqual(catalog.categories.map((category) => category.slug), ['riego']);
  });

  test('draft and unknown product slugs resolve as missing', () => {
    assert.equal(getPublicProductPage(db, 'producto-borrador'), undefined);
    assert.equal(getPublicProductPage(db, 'no-existe'), undefined);
    const page = getPublicProductPage(db, 'producto-publicado');
    assert.equal(page?.product.name, 'Producto publicado');
    assert.deepEqual(page?.related.map((product) => product.slug), ['relacionado']);
  });

  test('public pages reuse the shared ProductCard and existing ProductGallery', () => {
    const home = fs.readFileSync(path.join(process.cwd(), 'app/page.tsx'), 'utf8');
    const catalog = fs.readFileSync(path.join(process.cwd(), 'app/productos/page.tsx'), 'utf8');
    const product = fs.readFileSync(path.join(process.cwd(), 'app/productos/[slug]/page.tsx'), 'utf8');
    const homeAdmin = fs.readFileSync(path.join(process.cwd(), 'app/admin/(protected)/home/HomeManager.tsx'), 'utf8');
    assert.match(home, /components\/catalog\/ProductCard/);
    assert.match(catalog, /components\/catalog\/CatalogGrid/);
    assert.match(product, /app\/components\/ProductGallery/);
    assert.match(product, /components\/catalog\/ProductCard/);
    assert.match(homeAdmin, /Ver Home DEV/);
  });
});
