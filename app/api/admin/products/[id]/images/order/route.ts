import { logAudit } from '@/lib/audit';
import { requireMutation } from '@/lib/auth/guard';
import { ApiError, ok, route } from '@/lib/http/response';
import { listProductImages, requireProduct, serializeImage } from '@/lib/repos/products';
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
  const ids = validator.idList('ids', { max: 100 });
  validator.assertValid();

  const belongs = db.prepare('SELECT 1 FROM product_images WHERE id = ? AND product_id = ?');
  const update = db.prepare('UPDATE product_images SET display_order = ? WHERE id = ?');
  const apply = db.transaction(() => {
    ids!.forEach((imageId, index) => {
      if (!belongs.get(imageId, productId)) {
        throw new ApiError('validation_error', `Image ${imageId} does not belong to this product`);
      }
      update.run(index + 1, imageId);
    });
  });
  apply();

  logAudit(db, {
    userId: user.id,
    action: 'product.image_order_change',
    entityType: 'product',
    entityId: productId,
    details: { count: ids!.length },
  });

  return ok({ images: listProductImages(db, productId).map(serializeImage) });
});
