import { logAudit } from '@/lib/audit';
import { requireAuth, requireMutation } from '@/lib/auth/guard';
import { created, ok, route } from '@/lib/http/response';
import { listProductSpecs, requireProduct, serializeSpec, type ProductSpecRow } from '@/lib/repos/products';
import { parseId, readJsonBody, Validator } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

export const GET = route(async (request: Request, { params }: Params) => {
  const { db } = requireAuth(request);
  const id = parseId(params.id);
  requireProduct(db, id);
  return ok({ specs: listProductSpecs(db, id).map(serializeSpec) });
});

export const POST = route(async (request: Request, { params }: Params) => {
  const { db, user } = requireMutation(request);
  const productId = parseId(params.id);
  requireProduct(db, productId);

  const body = await readJsonBody(request);
  const validator = new Validator(body);
  const name = validator.string('name', { required: true, max: 120 });
  const value = validator.string('value', { required: true, max: 400 });
  const displayOrder = validator.has('displayOrder')
    ? validator.number('displayOrder', { integer: true, min: 0, max: 100000 })
    : undefined;
  validator.assertValid();

  const nextOrder =
    typeof displayOrder === 'number'
      ? displayOrder
      : ((
          db
            .prepare('SELECT COALESCE(MAX(display_order), 0) AS max FROM product_specs WHERE product_id = ?')
            .get(productId) as { max: number }
        ).max +
        1);

  const result = db
    .prepare('INSERT INTO product_specs (product_id, name, value, display_order) VALUES (?, ?, ?, ?)')
    .run(productId, name, value, nextOrder);

  logAudit(db, {
    userId: user.id,
    action: 'product.spec_change',
    entityType: 'product',
    entityId: productId,
    details: { specId: Number(result.lastInsertRowid), operation: 'create' },
  });

  const spec = db
    .prepare('SELECT * FROM product_specs WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as ProductSpecRow;

  return created({ spec: serializeSpec(spec) });
});
