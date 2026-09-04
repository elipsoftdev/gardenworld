import { logAudit } from '@/lib/audit';
import { requireMutation } from '@/lib/auth/guard';
import { ok, route } from '@/lib/http/response';
import { listCategories, reorderCategories, serializeCategory } from '@/lib/repos/categories';
import { readJsonBody, Validator } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PUT = route(async (request: Request) => {
  const { db, user } = await requireMutation(request);
  const body = await readJsonBody(request);
  const validator = new Validator(body);
  const ids = validator.idList('ids');
  validator.assertValid();

  reorderCategories(db, ids!);
  logAudit(db, {
    userId: user.id,
    action: 'category.order_change',
    entityType: 'category_list',
    details: { count: ids!.length },
  });

  return ok({ categories: listCategories(db).map(serializeCategory) });
});
