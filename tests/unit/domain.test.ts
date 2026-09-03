import assert from 'node:assert/strict';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';

import { logAudit } from '@/lib/audit';
import { closeDb, getDb, type Db } from '@/lib/db';
import { reorderCategories, wouldCreateCycle } from '@/lib/repos/categories';
import { reorderHomeSections, listHomeSections } from '@/lib/repos/home';
import { reorderProducts } from '@/lib/repos/products';
import { isValidSlug, slugify, uniqueSlug } from '@/lib/slug';
import { makeTempDir, removeDir } from '../helpers/tmp';

let workDir: string;
let db: Db;

before(() => {
  workDir = makeTempDir('domain');
  process.env.DATABASE_PATH = path.join(workDir, 'domain.db');
  closeDb();
  db = getDb();
});

after(() => {
  closeDb();
  removeDir(workDir);
});

function insertCategory(name: string, slug: string, parentId: number | null = null): number {
  const result = db
    .prepare('INSERT INTO categories (parent_id, name, slug) VALUES (?, ?, ?)')
    .run(parentId, name, slug);
  return Number(result.lastInsertRowid);
}

function insertProduct(name: string, slug: string): number {
  const result = db.prepare('INSERT INTO products (name, slug) VALUES (?, ?)').run(name, slug);
  return Number(result.lastInsertRowid);
}

describe('slugs', () => {
  test('normalises accents, spaces and punctuation', () => {
    assert.equal(slugify('Porta Mangueras Premium'), 'porta-mangueras-premium');
    assert.equal(slugify('  Riego / Jardin  '), 'riego-jardin');
    assert.equal(slugify('Diseno Exterior 2026!'), 'diseno-exterior-2026');
  });

  test('validates slug shape', () => {
    assert.equal(isValidSlug('porta-mangueras'), true);
    assert.equal(isValidSlug('Porta-Mangueras'), false);
    assert.equal(isValidSlug('-leading'), false);
    assert.equal(isValidSlug('double--dash'), false);
    assert.equal(isValidSlug(''), false);
  });

  test('derives a free slug by suffixing', () => {
    const taken = new Set(['riego', 'riego-2']);
    assert.equal(uniqueSlug('riego', (candidate) => taken.has(candidate)), 'riego-3');
  });
});

describe('category hierarchy', () => {
  test('rejects self-parenting and cycles', () => {
    const root = insertCategory('Riego', 'riego');
    const child = insertCategory('Porta mangueras', 'porta-mangueras', root);
    const grandChild = insertCategory('Soportes', 'soportes', child);

    assert.equal(wouldCreateCycle(db, root, root), true);
    assert.equal(wouldCreateCycle(db, root, child), true);
    assert.equal(wouldCreateCycle(db, root, grandChild), true);
    assert.equal(wouldCreateCycle(db, grandChild, root), false);
  });

  test('reorders categories in one pass', () => {
    const a = insertCategory('A', 'cat-a');
    const b = insertCategory('B', 'cat-b');
    reorderCategories(db, [b, a]);

    const orders = db
      .prepare('SELECT id, display_order FROM categories WHERE id IN (?, ?)')
      .all(a, b) as { id: number; display_order: number }[];
    const byId = new Map(orders.map((row) => [row.id, row.display_order]));
    assert.equal(byId.get(b), 1);
    assert.equal(byId.get(a), 2);
  });

  test('rejects unknown ids without partially applying the order', () => {
    const a = insertCategory('C', 'cat-c');
    const before = db.prepare('SELECT display_order FROM categories WHERE id = ?').get(a) as {
      display_order: number;
    };
    assert.throws(() => reorderCategories(db, [a, 999999]), /Unknown category/);
    const after = db.prepare('SELECT display_order FROM categories WHERE id = ?').get(a) as {
      display_order: number;
    };
    assert.equal(after.display_order, before.display_order);
  });
});

describe('curated product ordering', () => {
  test('assigns sequential positions and sets the matching flag', () => {
    const first = insertProduct('One', 'product-one');
    const second = insertProduct('Two', 'product-two');
    reorderProducts(db, 'featured_order', [second, first]);

    const rows = db
      .prepare('SELECT id, featured, featured_order FROM products WHERE id IN (?, ?)')
      .all(first, second) as { id: number; featured: number; featured_order: number }[];
    const byId = new Map(rows.map((row) => [row.id, row]));
    assert.equal(byId.get(second)!.featured_order, 1);
    assert.equal(byId.get(first)!.featured_order, 2);
    assert.equal(byId.get(first)!.featured, 1);
  });
});

describe('home sections', () => {
  test('reorders by section key', () => {
    reorderHomeSections(db, ['offers', 'new_arrivals', 'featured', 'categories']);
    assert.deepEqual(
      listHomeSections(db).map((section) => section.section_key),
      ['offers', 'new_arrivals', 'featured', 'categories'],
    );
  });

  test('rejects unknown section keys', () => {
    assert.throws(() => reorderHomeSections(db, ['nope']), /Unknown section key/);
  });
});

describe('audit log', () => {
  test('records the action and strips secret-looking fields', () => {
    logAudit(db, {
      userId: null,
      action: 'product.update',
      entityType: 'product',
      entityId: 42,
      details: { name: 'Demo', password: 'super-secret', sessionToken: 'abc', apiSecret: 'xyz' },
    });

    const row = db
      .prepare("SELECT action, entity_id, details FROM audit_log ORDER BY id DESC LIMIT 1")
      .get() as { action: string; entity_id: string; details: string };

    assert.equal(row.action, 'product.update');
    assert.equal(row.entity_id, '42');
    const details = JSON.parse(row.details) as Record<string, unknown>;
    assert.deepEqual(details, { name: 'Demo' });
    assert.equal(row.details.includes('super-secret'), false);
  });
});
