import { getDb } from '@/lib/db';
import { fail, ok, route } from '@/lib/http/response';
import { serializePublicCategory, type CategoryRow } from '@/lib/repos/categories';
import { PUBLIC_VISIBILITY_SQL, serializePublicProduct, type ProductRow } from '@/lib/repos/products';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: { slug: string } };

export const GET = route(async (_request: Request, { params }: Params) => {
  const db = getDb();
  const slug = params.slug?.toLowerCase() ?? '';

  const category = db
    .prepare('SELECT * FROM categories WHERE slug = ? AND published = 1')
    .get(slug) as CategoryRow | undefined;
  if (!category) return fail('not_found', 'Category not found');

  const children = db
    .prepare('SELECT * FROM categories WHERE parent_id = ? AND published = 1 ORDER BY display_order, name')
    .all(category.id) as CategoryRow[];

  const products = db
    .prepare(
      `SELECT * FROM products
        WHERE category_id = ? AND ${PUBLIC_VISIBILITY_SQL}
        ORDER BY featured_order, name COLLATE NOCASE`,
    )
    .all(category.id) as ProductRow[];

  return ok({
    category: serializePublicCategory(category),
    children: children.map(serializePublicCategory),
    products: products.map((row) => serializePublicProduct(row, { categorySlug: category.slug })),
  });
});
