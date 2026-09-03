import { logAudit } from '@/lib/audit';
import { requireAuth, requireMutation } from '@/lib/auth/guard';
import { ApiError, ok, route } from '@/lib/http/response';
import {
  countActiveProducts,
  countChildren,
  requireCategory,
  serializeCategory,
} from '@/lib/repos/categories';
import { parseCategoryPayload } from '@/lib/repos/category-payload';
import { parseId, readJsonBody } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

export const GET = route(async (request: Request, { params }: Params) => {
  const { db } = requireAuth(request);
  const category = requireCategory(db, parseId(params.id));
  return ok({ category: serializeCategory(category) });
});

export const PUT = route(async (request: Request, { params }: Params) => {
  const { db, user } = requireMutation(request);
  const id = parseId(params.id);
  const existing = requireCategory(db, id);

  const body = await readJsonBody(request);
  const columns = parseCategoryPayload(db, body, existing);

  const names = Object.keys(columns);
  if (names.length > 0) {
    db.prepare(
      `UPDATE categories SET ${names.map((name) => `${name} = ?`).join(', ')},
              updated_at = datetime('now')
        WHERE id = ?`,
    ).run(...names.map((name) => columns[name]), id);
  }

  logAudit(db, {
    userId: user.id,
    action: 'category.update',
    entityType: 'category',
    entityId: id,
    details: { fields: names },
  });

  return ok({ category: serializeCategory(requireCategory(db, id)) });
});

/**
 * Unpublishes rather than deletes. A category still holding live products or
 * child categories is refused with 409 so nothing is orphaned silently.
 */
export const DELETE = route(async (request: Request, { params }: Params) => {
  const { db, user } = requireMutation(request);
  const id = parseId(params.id);
  requireCategory(db, id);

  const products = countActiveProducts(db, id);
  if (products > 0) {
    throw new ApiError(
      'conflict',
      'Category still has active products. Reassign them before archiving.',
      { activeProducts: products },
    );
  }
  const children = countChildren(db, id);
  if (children > 0) {
    throw new ApiError('conflict', 'Category still has child categories.', {
      childCategories: children,
    });
  }

  db.prepare(
    `UPDATE categories
        SET published = 0, show_in_menu = 0, show_on_home = 0, updated_at = datetime('now')
      WHERE id = ?`,
  ).run(id);

  logAudit(db, {
    userId: user.id,
    action: 'category.archive',
    entityType: 'category',
    entityId: id,
  });

  return ok({ category: serializeCategory(requireCategory(db, id)) });
});
