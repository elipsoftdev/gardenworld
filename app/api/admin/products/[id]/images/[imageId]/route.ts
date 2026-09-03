import { logAudit } from '@/lib/audit';
import { requireMutation } from '@/lib/auth/guard';
import { ApiError, ok, route } from '@/lib/http/response';
import { requireProduct, serializeImage, type ProductImageRow } from '@/lib/repos/products';
import { parseId, readJsonBody, Validator } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: { id: string; imageId: string } };

function requireImage(
  db: ReturnType<typeof requireMutation>['db'],
  productId: number,
  imageId: number,
): ProductImageRow {
  const image = db
    .prepare('SELECT * FROM product_images WHERE id = ? AND product_id = ?')
    .get(imageId, productId) as ProductImageRow | undefined;
  if (!image) throw new ApiError('not_found', 'Image not found');
  return image;
}

export const PUT = route(async (request: Request, { params }: Params) => {
  const { db, user } = requireMutation(request);
  const productId = parseId(params.id);
  const imageId = parseId(params.imageId);
  requireProduct(db, productId);
  const image = requireImage(db, productId, imageId);

  const body = await readJsonBody(request);
  const validator = new Validator(body);
  const altText = validator.has('altText') ? validator.string('altText', { max: 200 }) : undefined;
  const displayOrder = validator.has('displayOrder')
    ? validator.number('displayOrder', { integer: true, min: 0, max: 100000 })
    : undefined;
  validator.assertValid();

  db.prepare('UPDATE product_images SET alt_text = ?, display_order = ? WHERE id = ?').run(
    altText === undefined ? image.alt_text : altText,
    typeof displayOrder === 'number' ? displayOrder : image.display_order,
    imageId,
  );

  logAudit(db, {
    userId: user.id,
    action: 'product.image_order_change',
    entityType: 'product',
    entityId: productId,
    details: { imageId },
  });

  return ok({ image: serializeImage(requireImage(db, productId, imageId)) });
});

/** Detaches the image from the product. The stored file stays: it may be shared. */
export const DELETE = route(async (request: Request, { params }: Params) => {
  const { db, user } = requireMutation(request);
  const productId = parseId(params.id);
  const imageId = parseId(params.imageId);
  requireProduct(db, productId);
  const image = requireImage(db, productId, imageId);

  db.prepare('DELETE FROM product_images WHERE id = ?').run(imageId);
  db.prepare('UPDATE products SET main_image_path = NULL WHERE id = ? AND main_image_path = ?').run(
    productId,
    image.path,
  );

  logAudit(db, {
    userId: user.id,
    action: 'product.image_delete',
    entityType: 'product',
    entityId: productId,
    details: { imageId, path: image.path },
  });

  return ok({ deleted: true });
});
