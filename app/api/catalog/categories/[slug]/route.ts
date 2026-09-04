import { getDb } from '@/lib/db';
import { fail, ok, route } from '@/lib/http/response';
import { getPublicCategoryPage } from '@/lib/public/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

export const GET = route(async (_request: Request, { params }: Params) => {
  const { slug: rawSlug } = await params;
  const db = getDb();
  const slug = rawSlug?.toLowerCase() ?? '';

  const page = getPublicCategoryPage(db, slug);
  if (!page) return fail('not_found', 'Category not found');
  return ok(page);
});
