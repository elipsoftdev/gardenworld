import { getDb } from '@/lib/db';
import { ok, route } from '@/lib/http/response';
import {
  categorySlugMap,
  PUBLIC_VISIBILITY_SQL,
  serializePublicProduct,
  type ProductRow,
} from '@/lib/repos/products';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_PAGE_SIZE = 60;

export const GET = route(async (request: Request) => {
  const db = getDb();
  const url = new URL(request.url);

  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(url.searchParams.get('pageSize') ?? '24') || 24),
  );

  const clauses = [PUBLIC_VISIBILITY_SQL];
  const params: (string | number)[] = [];

  const categorySlug = url.searchParams.get('category');
  if (categorySlug) {
    clauses.push(
      'category_id IN (SELECT id FROM categories WHERE slug = ? AND published = 1)',
    );
    params.push(categorySlug);
  }

  for (const [param, column] of [
    ['featured', 'featured'],
    ['onSale', 'on_sale'],
    ['newArrival', 'new_arrival'],
  ] as const) {
    if (url.searchParams.get(param) === 'true') clauses.push(`${column} = 1`);
  }

  const search = url.searchParams.get('q')?.trim();
  if (search) {
    clauses.push('(name LIKE ? OR short_description LIKE ?)');
    const pattern = `%${search.replace(/[%_]/g, '').slice(0, 80)}%`;
    params.push(pattern, pattern);
  }

  const where = `WHERE ${clauses.join(' AND ')}`;
  const total = (
    db.prepare(`SELECT COUNT(*) AS total FROM products ${where}`).get(...params) as { total: number }
  ).total;

  const rows = db
    .prepare(
      `SELECT * FROM products ${where}
        ORDER BY featured_order, name COLLATE NOCASE
        LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, (page - 1) * pageSize) as ProductRow[];

  const slugs = categorySlugMap(db, rows);

  return ok({
    products: rows.map((row) =>
      serializePublicProduct(row, {
        categorySlug: row.category_id === null ? null : (slugs.get(row.category_id) ?? null),
      }),
    ),
    pagination: { page, pageSize, total },
  });
});
