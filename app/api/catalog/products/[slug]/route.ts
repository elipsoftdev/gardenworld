import { getDb } from '@/lib/db';
import { fail, ok, route } from '@/lib/http/response';
import {
  listProductImages,
  listProductSpecs,
  getPublicProductBySlug,
  serializePublicProduct,
  type ProductRow,
} from '@/lib/repos/products';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

export const GET = route(async (_request: Request, { params }: Params) => {
  const { slug: rawSlug } = await params;
  const db = getDb();
  const slug = rawSlug?.toLowerCase() ?? '';

  const product = getPublicProductBySlug(db, slug);
  if (!product) return fail('not_found', 'Product not found');

  const category = product.category_id
    ? (db.prepare('SELECT slug FROM categories WHERE id = ? AND published = 1').get(product.category_id) as
        | { slug: string }
        | undefined)
    : undefined;

  return ok({
    product: serializePublicProduct(product, {
      images: listProductImages(db, product.id),
      specs: listProductSpecs(db, product.id),
      categorySlug: category?.slug ?? null,
    }),
  });
});
