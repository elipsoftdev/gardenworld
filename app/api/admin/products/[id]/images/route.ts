import { logAudit } from '@/lib/audit';
import { requireAuth, requireMutation } from '@/lib/auth/guard';
import { ApiError, created, ok, route } from '@/lib/http/response';
import { listProductImages, requireProduct, serializeImage } from '@/lib/repos/products';
import { parseId, readJsonBody, Validator } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export const GET = route(async (request: Request, { params }: Params) => {
  const { id: rawId } = await params;
  const { db } = await requireAuth(request);
  const id = parseId(rawId);
  requireProduct(db, id);
  return ok({ images: listProductImages(db, id).map(serializeImage) });
});

export const POST = route(async (request: Request, { params }: Params) => {
  const { id: rawId } = await params;
  const { db, user } = await requireMutation(request);
  const productId = parseId(rawId);
  requireProduct(db, productId);

  const body = await readJsonBody(request);
  const validator = new Validator(body);
  const path = validator.string('path', { required: true, max: 300 });
  const altText = validator.has('altText') ? validator.string('altText', { max: 200 }) : null;
  const displayOrder = validator.has('displayOrder')
    ? validator.number('displayOrder', { integer: true, min: 0, max: 100000 })
    : undefined;
  validator.assertValid();

  const upload = db.prepare('SELECT 1 FROM uploads WHERE path = ?').get(path);
  if (!upload) throw new ApiError('validation_error', 'Invalid request payload', { path: 'Unknown upload path' });

  const nextOrder =
    typeof displayOrder === 'number'
      ? displayOrder
      : ((
          db
            .prepare('SELECT COALESCE(MAX(display_order), 0) AS max FROM product_images WHERE product_id = ?')
            .get(productId) as { max: number }
        ).max +
        1);

  const result = db
    .prepare('INSERT INTO product_images (product_id, path, alt_text, display_order) VALUES (?, ?, ?, ?)')
    .run(productId, path, altText ?? null, nextOrder);

  logAudit(db, {
    userId: user.id,
    action: 'product.image_add',
    entityType: 'product',
    entityId: productId,
    details: { imageId: Number(result.lastInsertRowid), path },
  });

  const image = db
    .prepare('SELECT * FROM product_images WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as Parameters<typeof serializeImage>[0];

  return created({ image: serializeImage(image) });
});
