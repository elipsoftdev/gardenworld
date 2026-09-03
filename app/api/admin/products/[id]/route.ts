import { logAudit, type AuditAction } from '@/lib/audit';
import { requireAuth, requireMutation } from '@/lib/auth/guard';
import type { Db } from '@/lib/db';
import { ok, route } from '@/lib/http/response';
import { parseProductPayload, type ProductColumns } from '@/lib/repos/product-payload';
import {
  listProductImages,
  listProductSpecs,
  requireProduct,
  serializeImage,
  serializeProduct,
  serializeSpec,
  type ProductRow,
} from '@/lib/repos/products';
import { parseId, readJsonBody } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

/** Derives the specific audit actions implied by a diff, on top of product.update. */
function auditChanges(
  db: Db,
  userId: number,
  before: ProductRow,
  after: ProductRow,
): void {
  const extra: { action: AuditAction; details?: Record<string, unknown> }[] = [];

  if (before.published !== after.published) {
    extra.push({ action: after.published === 1 ? 'product.publish' : 'product.unpublish' });
  }
  if (before.status !== after.status && after.status === 'archived') {
    extra.push({ action: 'product.archive' });
  }
  if (before.price !== after.price) {
    extra.push({ action: 'product.price_change', details: { from: before.price, to: after.price } });
  }
  if (before.featured !== after.featured || before.featured_order !== after.featured_order) {
    extra.push({ action: 'product.feature', details: { featured: after.featured === 1 } });
  }
  if (
    before.on_sale !== after.on_sale ||
    before.compare_at_price !== after.compare_at_price ||
    before.sale_order !== after.sale_order
  ) {
    extra.push({ action: 'product.sale_change', details: { onSale: after.on_sale === 1 } });
  }

  for (const entry of extra) {
    logAudit(db, {
      userId,
      action: entry.action,
      entityType: 'product',
      entityId: after.id,
      details: entry.details,
    });
  }
}

function applyUpdate(db: Db, id: number, columns: ProductColumns): void {
  const names = Object.keys(columns);
  if (names.length === 0) return;
  const assignments = names.map((name) => `${name} = ?`).join(', ');
  db.prepare(`UPDATE products SET ${assignments}, updated_at = datetime('now') WHERE id = ?`).run(
    ...names.map((name) => columns[name]),
    id,
  );
}

export const GET = route(async (request: Request, { params }: Params) => {
  const { db } = requireAuth(request);
  const id = parseId(params.id);
  const product = requireProduct(db, id);

  return ok({
    product: serializeProduct(product),
    images: listProductImages(db, id).map(serializeImage),
    specs: listProductSpecs(db, id).map(serializeSpec),
  });
});

export const PUT = route(async (request: Request, { params }: Params) => {
  const { db, user } = requireMutation(request);
  const id = parseId(params.id);
  const before = requireProduct(db, id);

  const body = await readJsonBody(request);
  const columns = parseProductPayload(db, body, before);
  applyUpdate(db, id, columns);

  const after = requireProduct(db, id);
  logAudit(db, {
    userId: user.id,
    action: 'product.update',
    entityType: 'product',
    entityId: id,
    details: { fields: Object.keys(columns) },
  });
  auditChanges(db, user.id, before, after);

  return ok({ product: serializeProduct(after) });
});

/** Soft delete: the row is archived and hidden, never physically removed. */
export const DELETE = route(async (request: Request, { params }: Params) => {
  const { db, user } = requireMutation(request);
  const id = parseId(params.id);
  const product = requireProduct(db, id);

  db.prepare(
    `UPDATE products
        SET status = 'archived', published = 0, featured = 0, on_sale = 0, new_arrival = 0,
            deleted_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?`,
  ).run(id);

  logAudit(db, {
    userId: user.id,
    action: 'product.archive',
    entityType: 'product',
    entityId: id,
    details: { slug: product.slug, softDelete: true },
  });

  return ok({ product: serializeProduct(requireProductIncludingDeleted(db, id)) });
});

function requireProductIncludingDeleted(db: Db, id: number): ProductRow {
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id) as ProductRow;
}
