import assert from 'node:assert/strict';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { closeDb, getDb } from '@/lib/db';
import { getCanonical, getRobots } from '@/lib/site';
import { makeTempDir, removeDir } from '../helpers/tmp';

let workDir: string;
const previousSiteEnv = process.env.SITE_ENV;
const previousDatabasePath = process.env.DATABASE_PATH;

before(() => {
  workDir = makeTempDir('seo');
  process.env.DATABASE_PATH = path.join(workDir, 'seo.db');
  closeDb();
  const db = getDb();
  const categoryId = Number(db.prepare(`INSERT INTO categories (name, slug, published, show_on_home) VALUES ('Riego', 'riego', 1, 1)`).run().lastInsertRowid);
  const hiddenCategoryId = Number(db.prepare(`INSERT INTO categories (name, slug, published, show_on_home, indexable) VALUES ('Interna', 'interna', 1, 1, 0)`).run().lastInsertRowid);
  db.prepare(`INSERT INTO products (name, slug, category_id, price, status, published, indexable) VALUES ('Visible', 'visible', ?, 20, 'published', 1, 1)`).run(categoryId);
  db.prepare(`INSERT INTO products (name, slug, category_id, price, status, published, indexable) VALUES ('No indexar', 'no-indexar', ?, 20, 'published', 1, 0)`).run(categoryId);
  db.prepare(`INSERT INTO products (name, slug, category_id, price, status, published, indexable) VALUES ('Producto interno', 'producto-interno', ?, 20, 'published', 1, 1)`).run(hiddenCategoryId);
});

after(() => {
  closeDb();
  removeDir(workDir);
  if (previousSiteEnv === undefined) delete process.env.SITE_ENV; else process.env.SITE_ENV = previousSiteEnv;
  if (previousDatabasePath === undefined) delete process.env.DATABASE_PATH; else process.env.DATABASE_PATH = previousDatabasePath;
});

describe('environment-aware SEO', () => {
  test('DEV is noindex, has no canonical and returns an empty sitemap', () => {
    process.env.SITE_ENV = 'development';
    assert.equal(getCanonical('/productos/'), undefined);
    assert.deepEqual(getRobots(), { index: false, follow: false });
    assert.deepEqual(robots(), { rules: { userAgent: '*', disallow: '/' } });
    assert.deepEqual(sitemap(), []);
  });

  test('PROD uses the official canonical and includes only indexable public URLs', () => {
    process.env.SITE_ENV = 'production';
    assert.equal(getCanonical('/productos/'), 'https://gardenworld.online/productos/');
    assert.deepEqual(getRobots(), { index: true, follow: true });
    const routes = sitemap().map((entry) => entry.url);
    assert.ok(routes.includes('https://gardenworld.online/'));
    assert.ok(routes.includes('https://gardenworld.online/nosotros/'));
    assert.ok(routes.includes('https://gardenworld.online/productos/categoria/riego/'));
    assert.equal(routes.some((route) => route.includes('/categoria/interna/')), false);
    assert.ok(routes.includes('https://gardenworld.online/productos/visible/'));
    assert.equal(routes.some((route) => route.includes('no-indexar')), false);
    assert.equal(routes.some((route) => route.includes('/admin/')), false);
  });
});
