import type { Db } from '@/lib/db';
import { slugify, uniqueSlug } from '@/lib/slug';
import { CURRENCIES, PRODUCT_STATUSES, STOCK_STATUSES, Validator } from '@/lib/validation';
import { productSlugTaken, type ProductRow } from './products';

export type ProductColumns = Record<string, string | number | null>;

function assignString(
  columns: ProductColumns,
  validator: Validator,
  field: string,
  column: string,
  max: number,
): void {
  if (!validator.has(field)) return;
  const value = validator.string(field, { max });
  if (value !== undefined) columns[column] = value;
}

function uploadExists(db: Db, path: string): boolean {
  return db.prepare('SELECT 1 FROM uploads WHERE path = ?').get(path) !== undefined;
}

/**
 * Validates a create/update payload into a column map. Only fields present in
 * the body are returned, so PUT behaves as a partial update.
 */
export function parseProductPayload(
  db: Db,
  body: Record<string, unknown>,
  existing?: ProductRow,
): ProductColumns {
  const validator = new Validator(body);
  const columns: ProductColumns = {};
  const isCreate = existing === undefined;

  const name = validator.string('name', { required: isCreate, min: 2, max: 200 });
  if (typeof name === 'string') columns.name = name;

  if (validator.has('slug')) {
    const slug = validator.slug('slug', { required: false });
    if (slug) {
      if (productSlugTaken(db, slug, existing?.id)) validator.addError('slug', 'Slug already in use');
      else columns.slug = slug;
    }
  } else if (isCreate && typeof name === 'string') {
    columns.slug = uniqueSlug(slugify(name), (candidate) => productSlugTaken(db, candidate));
  }

  assignString(columns, validator, 'sku', 'sku', 60);
  assignString(columns, validator, 'brand', 'brand', 100);
  assignString(columns, validator, 'model', 'model', 100);
  assignString(columns, validator, 'shortDescription', 'short_description', 400);
  assignString(columns, validator, 'description', 'description', 8000);
  assignString(columns, validator, 'benefits', 'benefits', 4000);
  assignString(columns, validator, 'uses', 'uses', 4000);
  assignString(columns, validator, 'deliveryText', 'delivery_text', 400);
  assignString(columns, validator, 'warrantyText', 'warranty_text', 400);
  assignString(columns, validator, 'seoTitle', 'seo_title', 200);
  assignString(columns, validator, 'seoDescription', 'seo_description', 400);

  if (validator.has('categoryId')) {
    const categoryId = validator.number('categoryId', { integer: true, min: 1, nullable: true });
    if (categoryId === null) columns.category_id = null;
    else if (typeof categoryId === 'number') {
      const exists = db.prepare('SELECT 1 FROM categories WHERE id = ?').get(categoryId);
      if (!exists) validator.addError('categoryId', 'Category does not exist');
      else columns.category_id = categoryId;
    }
  }

  const price = validator.has('price')
    ? validator.number('price', { min: 0, max: 1_000_000_000 })
    : undefined;
  if (typeof price === 'number') columns.price = price;

  if (validator.has('compareAtPrice')) {
    const compareAt = validator.number('compareAtPrice', { min: 0, max: 1_000_000_000, nullable: true });
    if (compareAt === null) columns.compare_at_price = null;
    else if (typeof compareAt === 'number') columns.compare_at_price = compareAt;
  }

  if (validator.has('currency')) {
    const currency = validator.oneOf('currency', CURRENCIES);
    if (currency) columns.currency = currency;
  }

  if (validator.has('stockQuantity')) {
    const quantity = validator.number('stockQuantity', { integer: true, min: 0, nullable: true });
    if (quantity === null) columns.stock_quantity = null;
    else if (typeof quantity === 'number') columns.stock_quantity = quantity;
  }

  if (validator.has('stockStatus')) {
    const stockStatus = validator.oneOf('stockStatus', STOCK_STATUSES);
    if (stockStatus) columns.stock_status = stockStatus;
  }

  if (validator.has('status')) {
    const status = validator.oneOf('status', PRODUCT_STATUSES);
    if (status) columns.status = status;
  }

  for (const [field, column] of [
    ['published', 'published'],
    ['featured', 'featured'],
    ['onSale', 'on_sale'],
    ['newArrival', 'new_arrival'],
    ['indexable', 'indexable'],
  ] as const) {
    if (!validator.has(field)) continue;
    const flag = validator.boolean(field);
    if (flag !== undefined) columns[column] = flag;
  }

  for (const [field, column] of [
    ['featuredOrder', 'featured_order'],
    ['saleOrder', 'sale_order'],
    ['newOrder', 'new_order'],
  ] as const) {
    if (!validator.has(field)) continue;
    const order = validator.number(field, { integer: true, min: 0, max: 100000 });
    if (typeof order === 'number') columns[column] = order;
  }

  if (validator.has('mainImagePath')) {
    const imagePath = validator.string('mainImagePath', { max: 300 });
    if (imagePath === null) columns.main_image_path = null;
    else if (typeof imagePath === 'string') {
      if (!uploadExists(db, imagePath)) validator.addError('mainImagePath', 'Unknown upload path');
      else columns.main_image_path = imagePath;
    }
  }

  // Cross-field rules, evaluated against the merged (existing + incoming) state.
  const effectiveStatus = (columns.status as string | undefined) ?? existing?.status ?? 'draft';
  if (effectiveStatus !== 'published') columns.published = 0;
  else if (columns.published === undefined && existing === undefined) columns.published = 1;

  const effectivePrice = (columns.price as number | undefined) ?? existing?.price ?? 0;
  const effectiveCompareAt =
    columns.compare_at_price !== undefined
      ? (columns.compare_at_price as number | null)
      : (existing?.compare_at_price ?? null);
  const effectiveOnSale =
    columns.on_sale !== undefined ? columns.on_sale === 1 : existing?.on_sale === 1;

  if (effectiveCompareAt !== null && effectiveCompareAt < effectivePrice) {
    validator.addError('compareAtPrice', 'Must be greater than or equal to price');
  }
  if (effectiveOnSale && (effectiveCompareAt === null || effectiveCompareAt <= effectivePrice)) {
    validator.addError('onSale', 'A sale needs compareAtPrice greater than price');
  }

  validator.assertValid();
  return columns;
}
