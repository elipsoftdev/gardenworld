import { getDb } from '@/lib/db';
import { ok, route } from '@/lib/http/response';
import { listPublicCategories, serializePublicCategory } from '@/lib/repos/categories';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route(async (request: Request) => {
  const db = getDb();
  const url = new URL(request.url);

  const rows = listPublicCategories(db, {
    onlyMenu: url.searchParams.get('menu') === 'true',
    onlyHome: url.searchParams.get('home') === 'true',
  });

  return ok({ categories: rows.map(serializePublicCategory) });
});
