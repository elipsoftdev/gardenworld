import { logAudit } from '@/lib/audit';
import { requireAuth, requireMutation } from '@/lib/auth/guard';
import { created, ok, route } from '@/lib/http/response';
import { getCategory, listCategories, serializeCategory } from '@/lib/repos/categories';
import { parseCategoryPayload } from '@/lib/repos/category-payload';
import { readJsonBody } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route(async (request: Request) => {
  const { db } = requireAuth(request);
  return ok({ categories: listCategories(db).map(serializeCategory) });
});

export const POST = route(async (request: Request) => {
  const { db, user } = requireMutation(request);
  const body = await readJsonBody(request);
  const columns = parseCategoryPayload(db, body);

  const names = Object.keys(columns);
  const result = db
    .prepare(
      `INSERT INTO categories (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})`,
    )
    .run(...names.map((name) => columns[name]));

  const categoryId = Number(result.lastInsertRowid);
  logAudit(db, {
    userId: user.id,
    action: 'category.create',
    entityType: 'category',
    entityId: categoryId,
    details: { name: columns.name, slug: columns.slug },
  });

  return created({ category: serializeCategory(getCategory(db, categoryId)!) });
});
