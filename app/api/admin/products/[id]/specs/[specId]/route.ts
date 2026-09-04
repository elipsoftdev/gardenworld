import { logAudit } from '@/lib/audit';
import { requireMutation } from '@/lib/auth/guard';
import type { Db } from '@/lib/db';
import { ApiError, ok, route } from '@/lib/http/response';
import { requireProduct, serializeSpec, type ProductSpecRow } from '@/lib/repos/products';
import { parseId, readJsonBody, Validator } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string; specId: string }> };

function requireSpec(db: Db, productId: number, specId: number): ProductSpecRow {
  const spec = db
    .prepare('SELECT * FROM product_specs WHERE id = ? AND product_id = ?')
    .get(specId, productId) as ProductSpecRow | undefined;
  if (!spec) throw new ApiError('not_found', 'Specification not found');
  return spec;
}

export const PUT = route(async (request: Request, { params }: Params) => {
  const { id: rawId, specId: rawSpecId } = await params;
  const { db, user } = await requireMutation(request);
  const productId = parseId(rawId);
  const specId = parseId(rawSpecId);
  requireProduct(db, productId);
  const spec = requireSpec(db, productId, specId);

  const body = await readJsonBody(request);
  const validator = new Validator(body);
  const name = validator.has('name') ? validator.string('name', { required: true, max: 120 }) : undefined;
  const value = validator.has('value') ? validator.string('value', { required: true, max: 400 }) : undefined;
  const displayOrder = validator.has('displayOrder')
    ? validator.number('displayOrder', { integer: true, min: 0, max: 100000 })
    : undefined;
  validator.assertValid();

  db.prepare('UPDATE product_specs SET name = ?, value = ?, display_order = ? WHERE id = ?').run(
    typeof name === 'string' ? name : spec.name,
    typeof value === 'string' ? value : spec.value,
    typeof displayOrder === 'number' ? displayOrder : spec.display_order,
    specId,
  );

  logAudit(db, {
    userId: user.id,
    action: 'product.spec_change',
    entityType: 'product',
    entityId: productId,
    details: { specId, operation: 'update' },
  });

  return ok({ spec: serializeSpec(requireSpec(db, productId, specId)) });
});

export const DELETE = route(async (request: Request, { params }: Params) => {
  const { id: rawId, specId: rawSpecId } = await params;
  const { db, user } = await requireMutation(request);
  const productId = parseId(rawId);
  const specId = parseId(rawSpecId);
  requireProduct(db, productId);
  requireSpec(db, productId, specId);

  db.prepare('DELETE FROM product_specs WHERE id = ?').run(specId);
  logAudit(db, {
    userId: user.id,
    action: 'product.spec_change',
    entityType: 'product',
    entityId: productId,
    details: { specId, operation: 'delete' },
  });

  return ok({ deleted: true });
});
