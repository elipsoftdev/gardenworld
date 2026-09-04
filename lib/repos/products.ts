import type { Db } from '@/lib/db';
import { ApiError } from '@/lib/http/response';
import { publicUrlFor } from '@/lib/uploads/storage';

export type ProductRow = {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  brand: string | null;
  model: string | null;
  category_id: number | null;
  short_description: string | null;
  description: string | null;
  benefits: string | null;
  uses: string | null;
  price: number;
  compare_at_price: number | null;
  currency: string;
  stock_quantity: number | null;
  stock_status: string;
  delivery_text: string | null;
  warranty_text: string | null;
  status: 'draft' | 'published' | 'archived';
  published: number;
  featured: number;
  featured_order: number;
  on_sale: number;
  sale_order: number;
  new_arrival: number;
  new_order: number;
  main_image_path: string | null;
  seo_title: string | null;
  seo_description: string | null;
  indexable: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ProductImageRow = {
  id: number;
  product_id: number;
  path: string;
  alt_text: string | null;
  display_order: number;
  created_at: string;
};

export type ProductSpecRow = {
  id: number;
  product_id: number;
  name: string;
  value: string;
  display_order: number;
};

/** A product is publicly visible only when published, live and not soft-deleted. */
export const PUBLIC_VISIBILITY_SQL =
  "status = 'published' AND published = 1 AND deleted_at IS NULL";

export function getProduct(db: Db, id: number): ProductRow | undefined {
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id) as ProductRow | undefined;
}

export function requireProduct(db: Db, id: number): ProductRow {
  const product = getProduct(db, id);
  if (!product || product.deleted_at !== null) {
    throw new ApiError('not_found', 'Product not found');
  }
  return product;
}

export function productSlugTaken(db: Db, slug: string, exceptId?: number): boolean {
  const row = exceptId
    ? db.prepare('SELECT 1 FROM products WHERE slug = ? AND id <> ?').get(slug, exceptId)
    : db.prepare('SELECT 1 FROM products WHERE slug = ?').get(slug);
  return row !== undefined;
}

export function listProductImages(db: Db, productId: number): ProductImageRow[] {
  return db
    .prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order, id')
    .all(productId) as ProductImageRow[];
}

export function listProductSpecs(db: Db, productId: number): ProductSpecRow[] {
  return db
    .prepare('SELECT * FROM product_specs WHERE product_id = ? ORDER BY display_order, id')
    .all(productId) as ProductSpecRow[];
}

export function serializeProduct(row: ProductRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    brand: row.brand,
    model: row.model,
    categoryId: row.category_id,
    shortDescription: row.short_description,
    description: row.description,
    benefits: row.benefits,
    uses: row.uses,
    price: row.price,
    compareAtPrice: row.compare_at_price,
    currency: row.currency,
    stockQuantity: row.stock_quantity,
    stockStatus: row.stock_status,
    deliveryText: row.delivery_text,
    warrantyText: row.warranty_text,
    status: row.status,
    published: row.published === 1,
    featured: row.featured === 1,
    featuredOrder: row.featured_order,
    onSale: row.on_sale === 1,
    saleOrder: row.sale_order,
    newArrival: row.new_arrival === 1,
    newOrder: row.new_order,
    mainImagePath: row.main_image_path,
    mainImageUrl: row.main_image_path ? publicUrlFor(row.main_image_path) : null,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    indexable: row.indexable === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function serializeImage(row: ProductImageRow) {
  return {
    id: row.id,
    productId: row.product_id,
    path: row.path,
    url: publicUrlFor(row.path),
    altText: row.alt_text,
    displayOrder: row.display_order,
  };
}

export function serializeSpec(row: ProductSpecRow) {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    value: row.value,
    displayOrder: row.display_order,
  };
}

/** Public shape: no draft-only bookkeeping, no audit fields. */
export function serializePublicProduct(
  row: ProductRow,
  extras: { images?: ProductImageRow[]; specs?: ProductSpecRow[]; categorySlug?: string | null } = {},
) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    brand: row.brand,
    model: row.model,
    categoryId: row.category_id,
    categorySlug: extras.categorySlug ?? null,
    shortDescription: row.short_description,
    description: row.description,
    benefits: row.benefits,
    uses: row.uses,
    price: row.price,
    compareAtPrice: row.compare_at_price,
    currency: row.currency,
    stockStatus: row.stock_status,
    deliveryText: row.delivery_text,
    warrantyText: row.warranty_text,
    featured: row.featured === 1,
    onSale: row.on_sale === 1,
    newArrival: row.new_arrival === 1,
    mainImageUrl: row.main_image_path ? publicUrlFor(row.main_image_path) : null,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    indexable: row.indexable === 1,
    updatedAt: row.updated_at,
    images: (extras.images ?? []).map((image) => ({
      url: publicUrlFor(image.path),
      altText: image.alt_text,
      displayOrder: image.display_order,
    })),
    specs: (extras.specs ?? []).map((spec) => ({
      name: spec.name,
      value: spec.value,
      displayOrder: spec.display_order,
    })),
  };
}

export type OrderField = 'featured_order' | 'sale_order' | 'new_order';

const FLAG_BY_ORDER_FIELD: Record<OrderField, string> = {
  featured_order: 'featured',
  sale_order: 'on_sale',
  new_order: 'new_arrival',
};

/** Bulk ordering for one of the curated home lists, applied in a single transaction. */
export function reorderProducts(db: Db, field: OrderField, orderedIds: number[]): void {
  const flag = FLAG_BY_ORDER_FIELD[field];
  const exists = db.prepare('SELECT 1 FROM products WHERE id = ? AND deleted_at IS NULL');
  const update = db.prepare(
    `UPDATE products SET ${field} = ?, ${flag} = 1, updated_at = datetime('now') WHERE id = ?`,
  );

  const apply = db.transaction(() => {
    orderedIds.forEach((id, index) => {
      if (!exists.get(id)) throw new ApiError('validation_error', `Unknown product id: ${id}`);
      update.run(index + 1, id);
    });
  });
  apply();
}

/** Resolves published category slugs for a batch of products in one query. */
export function categorySlugMap(db: Db, rows: ProductRow[]): Map<number, string> {
  const ids = [...new Set(rows.map((row) => row.category_id).filter((id): id is number => id !== null))];
  if (ids.length === 0) return new Map();
  const placeholders = ids.map(() => '?').join(', ');
  const categories = db
    .prepare(`SELECT id, slug FROM categories WHERE published = 1 AND id IN (${placeholders})`)
    .all(...ids) as { id: number; slug: string }[];
  return new Map(categories.map((category) => [category.id, category.slug]));
}

export function listCuratedPublicProducts(db: Db, flag: 'featured' | 'on_sale' | 'new_arrival', limit = 24) {
  const orderField = flag === 'featured' ? 'featured_order' : flag === 'on_sale' ? 'sale_order' : 'new_order';
  return db
    .prepare(
      `SELECT * FROM products
        WHERE ${PUBLIC_VISIBILITY_SQL} AND ${flag} = 1
        ORDER BY ${orderField}, id
        LIMIT ?`,
    )
    .all(limit) as ProductRow[];
}

export type PublicProductQuery = {
  categoryId?: number;
  categorySlug?: string;
  search?: string;
  featured?: boolean;
  onSale?: boolean;
  newArrival?: boolean;
  limit?: number;
  offset?: number;
};

/** Shared public catalog query used by Server Components and HTTP routes. */
export function listPublicProducts(db: Db, options: PublicProductQuery = {}): ProductRow[] {
  const clauses = [PUBLIC_VISIBILITY_SQL];
  const params: (string | number)[] = [];

  if (options.categoryId !== undefined) {
    clauses.push('category_id = ?');
    params.push(options.categoryId);
  } else if (options.categorySlug) {
    clauses.push('category_id IN (SELECT id FROM categories WHERE slug = ? AND published = 1)');
    params.push(options.categorySlug);
  }

  if (options.search?.trim()) {
    clauses.push('(name LIKE ? OR short_description LIKE ?)');
    const pattern = `%${options.search.trim().replace(/[%_]/g, '').slice(0, 80)}%`;
    params.push(pattern, pattern);
  }
  if (options.featured) clauses.push('featured = 1');
  if (options.onSale) clauses.push('on_sale = 1');
  if (options.newArrival) clauses.push('new_arrival = 1');

  const paging = options.limit === undefined ? '' : ' LIMIT ? OFFSET ?';
  if (options.limit !== undefined) params.push(options.limit, options.offset ?? 0);

  return db
    .prepare(
      `SELECT * FROM products WHERE ${clauses.join(' AND ')}
       ORDER BY featured DESC, featured_order, name COLLATE NOCASE${paging}`,
    )
    .all(...params) as ProductRow[];
}

export function countPublicProducts(db: Db, options: Omit<PublicProductQuery, 'limit' | 'offset'> = {}): number {
  const clauses = [PUBLIC_VISIBILITY_SQL];
  const params: (string | number)[] = [];
  if (options.categoryId !== undefined) {
    clauses.push('category_id = ?');
    params.push(options.categoryId);
  } else if (options.categorySlug) {
    clauses.push('category_id IN (SELECT id FROM categories WHERE slug = ? AND published = 1)');
    params.push(options.categorySlug);
  }
  if (options.search?.trim()) {
    clauses.push('(name LIKE ? OR short_description LIKE ?)');
    const pattern = `%${options.search.trim().replace(/[%_]/g, '').slice(0, 80)}%`;
    params.push(pattern, pattern);
  }
  if (options.featured) clauses.push('featured = 1');
  if (options.onSale) clauses.push('on_sale = 1');
  if (options.newArrival) clauses.push('new_arrival = 1');
  return (db.prepare(`SELECT COUNT(*) AS total FROM products WHERE ${clauses.join(' AND ')}`).get(...params) as { total: number }).total;
}

export function getPublicProductBySlug(db: Db, slug: string): ProductRow | undefined {
  return db
    .prepare(`SELECT * FROM products WHERE slug = ? AND ${PUBLIC_VISIBILITY_SQL}`)
    .get(slug.toLowerCase()) as ProductRow | undefined;
}

export function listRelatedPublicProducts(db: Db, product: ProductRow, limit = 4): ProductRow[] {
  if (product.category_id === null) return [];
  return db
    .prepare(
      `SELECT * FROM products
       WHERE category_id = ? AND id <> ? AND ${PUBLIC_VISIBILITY_SQL}
       ORDER BY featured DESC, featured_order, name COLLATE NOCASE
       LIMIT ?`,
    )
    .all(product.category_id, product.id, limit) as ProductRow[];
}
