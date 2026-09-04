import { logAudit } from '@/lib/audit';
import { requireMutation } from '@/lib/auth/guard';
import { ApiError, ok, route } from '@/lib/http/response';
import { deleteStoredFile } from '@/lib/uploads/storage';
import { parseId } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** Refuses to remove a file any product or category still points at. */
function countReferences(
  db: Awaited<ReturnType<typeof requireMutation>>['db'],
  path: string,
): { products: number; images: number; categories: number } {
  const one = (sql: string) => (db.prepare(sql).get(path) as { total: number }).total;
  return {
    products: one('SELECT COUNT(*) AS total FROM products WHERE main_image_path = ?'),
    images: one('SELECT COUNT(*) AS total FROM product_images WHERE path = ?'),
    categories: one('SELECT COUNT(*) AS total FROM categories WHERE image_path = ?'),
  };
}

export const DELETE = route(async (request: Request, { params }: Params) => {
  const { id: rawId } = await params;
  const { db, user } = await requireMutation(request);
  const id = parseId(rawId);

  const upload = db.prepare('SELECT * FROM uploads WHERE id = ?').get(id) as
    | { id: number; path: string }
    | undefined;
  if (!upload) throw new ApiError('not_found', 'Upload not found');

  const references = countReferences(db, upload.path);
  const total = references.products + references.images + references.categories;
  if (total > 0) {
    throw new ApiError('conflict', 'Upload is still referenced by other records', references);
  }

  db.prepare('DELETE FROM uploads WHERE id = ?').run(id);
  const removed = await deleteStoredFile(upload.path);

  logAudit(db, {
    userId: user.id,
    action: 'upload.delete',
    entityType: 'upload',
    entityId: id,
    details: { path: upload.path, fileRemoved: removed },
  });

  return ok({ deleted: true, fileRemoved: removed });
});
