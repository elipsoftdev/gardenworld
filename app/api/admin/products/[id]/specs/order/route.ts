import { logAudit } from '@/lib/audit';
import { requireMutation } from '@/lib/auth/guard';
import { ApiError, ok, route } from '@/lib/http/response';
import { listProductSpecs, requireProduct, serializeSpec } from '@/lib/repos/products';
import { parseId, readJsonBody, Validator } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

export const PUT = route(async (request: Request, { params }: Params) => {
  const { db, user } = requireMutation(request);
  const productId = parseId(params.id);
  requireProduct(db, productId);

  const body = await readJsonBody(request);
  const validator = new Validator(body);
  const ids = validator.idList('ids', { max: 200 });
  validator.assertValid();

  const belongs = db.prepare('SELECT 1 FROM product_specs WHERE id = ? AND product_id = ?');
  const update = db.prepare('UPDATE product_specs SET display_order = ? WHERE id = ?');
  const apply = db.transaction(() => {
    ids!.forEach((specId, index) => {
      if (!belongs.get(specId, productId)) {
        throw new ApiError('validation_error', `Spec ${specId} does not belong to this product`);
      }
      update.run(index + 1, specId);
    });
  });
  apply();

  logAudit(db, {
    userId: user.id,
    action: 'product.spec_change',
    entityType: 'product',
    entityId: productId,
    details: { operation: 'reorder', count: ids!.length },
  });

  return ok({ specs: listProductSpecs(db, productId).map(serializeSpec) });
});
