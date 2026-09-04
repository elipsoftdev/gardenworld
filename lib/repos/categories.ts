import type { Db } from '@/lib/db';
import { ApiError } from '@/lib/http/response';
import { publicUrlFor } from '@/lib/uploads/storage';

export type CategoryRow = {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  image_path: string | null;
  published: number;
  show_in_menu: number;
  show_on_home: number;
  display_order: number;
  seo_title: string | null;
  seo_description: string | null;
  indexable: number;
  created_at: string;
  updated_at: string;
};

const COLUMNS = `id, parent_id, name, slug, description, image_path, published, show_in_menu,
  show_on_home, display_order, seo_title, seo_description, indexable, created_at, updated_at`;

export function listCategories(db: Db): CategoryRow[] {
  return db
    .prepare(`SELECT ${COLUMNS} FROM categories ORDER BY display_order, name`)
    .all() as CategoryRow[];
}

export function getCategory(db: Db, id: number): CategoryRow | undefined {
  return db.prepare(`SELECT ${COLUMNS} FROM categories WHERE id = ?`).get(id) as
    | CategoryRow
    | undefined;
}

export function requireCategory(db: Db, id: number): CategoryRow {
  const category = getCategory(db, id);
  if (!category) throw new ApiError('not_found', 'Category not found');
  return category;
}

export function categorySlugTaken(db: Db, slug: string, exceptId?: number): boolean {
  const row = exceptId
    ? db.prepare('SELECT 1 FROM categories WHERE slug = ? AND id <> ?').get(slug, exceptId)
    : db.prepare('SELECT 1 FROM categories WHERE slug = ?').get(slug);
  return row !== undefined;
}

/** Walks up the ancestor chain to reject self-parenting and cycles. */
export function wouldCreateCycle(db: Db, categoryId: number, parentId: number): boolean {
  if (categoryId === parentId) return true;
  const parentOf = db.prepare('SELECT parent_id FROM categories WHERE id = ?');
  let cursor: number | null = parentId;
  const seen = new Set<number>([categoryId]);

  while (cursor !== null) {
    if (seen.has(cursor)) return true;
    seen.add(cursor);
    const row = parentOf.get(cursor) as { parent_id: number | null } | undefined;
    if (!row) return false;
    cursor = row.parent_id;
  }
  return false;
}

export function countActiveProducts(db: Db, categoryId: number): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS total FROM products
        WHERE category_id = ? AND deleted_at IS NULL AND status <> 'archived'`,
    )
    .get(categoryId) as { total: number };
  return row.total;
}

export function countChildren(db: Db, categoryId: number): number {
  const row = db
    .prepare('SELECT COUNT(*) AS total FROM categories WHERE parent_id = ?')
    .get(categoryId) as { total: number };
  return row.total;
}

export function serializeCategory(row: CategoryRow) {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imagePath: row.image_path,
    imageUrl: row.image_path ? publicUrlFor(row.image_path) : null,
    published: row.published === 1,
    showInMenu: row.show_in_menu === 1,
    showOnHome: row.show_on_home === 1,
    displayOrder: row.display_order,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    indexable: row.indexable === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function serializePublicCategory(row: CategoryRow) {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.image_path ? publicUrlFor(row.image_path) : null,
    displayOrder: row.display_order,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    indexable: row.indexable === 1,
    updatedAt: row.updated_at,
  };
}

export function listPublicCategories(db: Db, options: { onlyHome?: boolean; onlyMenu?: boolean } = {}) {
  const clauses = ['published = 1'];
  if (options.onlyHome) clauses.push('show_on_home = 1');
  if (options.onlyMenu) clauses.push('show_in_menu = 1');
  return db
    .prepare(
      `SELECT ${COLUMNS} FROM categories WHERE ${clauses.join(' AND ')} ORDER BY display_order, name`,
    )
    .all() as CategoryRow[];
}

/** Public categories that can actually lead to at least one visible product. */
export function listPopulatedPublicCategories(
  db: Db,
  options: { onlyHome?: boolean; onlyMenu?: boolean } = {},
): CategoryRow[] {
  const clauses = ['categories.published = 1'];
  if (options.onlyHome) clauses.push('categories.show_on_home = 1');
  if (options.onlyMenu) clauses.push('categories.show_in_menu = 1');
  return db
    .prepare(
      `SELECT ${COLUMNS.split(', ').map((column) => `categories.${column.trim()}`).join(', ')}
       FROM categories
       WHERE ${clauses.join(' AND ')}
         AND EXISTS (
           SELECT 1 FROM products
           WHERE products.category_id = categories.id
             AND products.status = 'published'
             AND products.published = 1
             AND products.deleted_at IS NULL
         )
       ORDER BY categories.display_order, categories.name`,
    )
    .all() as CategoryRow[];
}

export function getPublicCategoryBySlug(db: Db, slug: string): CategoryRow | undefined {
  return db
    .prepare(`SELECT ${COLUMNS} FROM categories WHERE slug = ? AND published = 1`)
    .get(slug.toLowerCase()) as CategoryRow | undefined;
}

export function listPublicChildCategories(db: Db, parentId: number): CategoryRow[] {
  return db
    .prepare(`SELECT ${COLUMNS} FROM categories WHERE parent_id = ? AND published = 1 ORDER BY display_order, name`)
    .all(parentId) as CategoryRow[];
}

/** Applies an explicit ordering to the given ids in one transaction. */
export function reorderCategories(db: Db, orderedIds: number[]): void {
  const exists = db.prepare('SELECT 1 FROM categories WHERE id = ?');
  const update = db.prepare("UPDATE categories SET display_order = ?, updated_at = datetime('now') WHERE id = ?");

  const apply = db.transaction(() => {
    orderedIds.forEach((id, index) => {
      if (!exists.get(id)) throw new ApiError('validation_error', `Unknown category id: ${id}`);
      update.run(index + 1, id);
    });
  });
  apply();
}
