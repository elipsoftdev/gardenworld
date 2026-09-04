import { logAudit } from '@/lib/audit';
import { requireMutation } from '@/lib/auth/guard';
import { ok } from '@/lib/http/response';
import { readJsonBody, Validator } from '@/lib/validation';
import { reorderProducts, type OrderField } from './products';

const LIST_LABEL: Record<OrderField, string> = {
  featured_order: 'featured',
  sale_order: 'offers',
  new_order: 'new_arrivals',
};

/**
 * Shared handler for the three curated product lists: one ordered array of ids
 * replaces the whole ordering in a single transaction.
 */
export async function handleProductOrder(request: Request, field: OrderField): Promise<Response> {
  const { db, user } = await requireMutation(request);
  const body = await readJsonBody(request);
  const validator = new Validator(body);
  const ids = validator.idList('ids');
  validator.assertValid();

  reorderProducts(db, field, ids!);
  logAudit(db, {
    userId: user.id,
    action: 'product.order_change',
    entityType: 'product_list',
    entityId: LIST_LABEL[field],
    details: { count: ids!.length },
  });

  return ok({ list: LIST_LABEL[field], ids });
}
