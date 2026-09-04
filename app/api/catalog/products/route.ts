import { getDb } from '@/lib/db';
import { ok, route } from '@/lib/http/response';
import {
  categorySlugMap,
  countPublicProducts,
  listPublicProducts,
  serializePublicProduct,
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

  const categorySlug = url.searchParams.get('category');
  const search = url.searchParams.get('q')?.trim();
  const filters = {
    categorySlug: categorySlug || undefined,
    search,
    featured: url.searchParams.get('featured') === 'true',
    onSale: url.searchParams.get('onSale') === 'true',
    newArrival: url.searchParams.get('newArrival') === 'true',
  };
  const rows = listPublicProducts(db, { ...filters, limit: pageSize, offset: (page - 1) * pageSize });
  const total = countPublicProducts(db, filters);

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
