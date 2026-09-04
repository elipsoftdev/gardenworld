import { logAudit } from '@/lib/audit';
import { requireAuth, requireMutation } from '@/lib/auth/guard';
import { created, ok, route } from '@/lib/http/response';
import { parseProductPayload } from '@/lib/repos/product-payload';
import { getProduct, serializeProduct, type ProductRow } from '@/lib/repos/products';
import { readJsonBody } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_PAGE_SIZE = 100;

function readPaging(url: URL): { limit: number; offset: number; page: number } {
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);
  const requested = Number(url.searchParams.get('pageSize') ?? '25') || 25;
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, requested));
  return { limit, offset: (page - 1) * limit, page };
}

export const GET = route(async (request: Request) => {
  const { db } = await requireAuth(request);
  const url = new URL(request.url);
  const { limit, offset, page } = readPaging(url);

  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (url.searchParams.get('includeDeleted') !== 'true') clauses.push('deleted_at IS NULL');

  const status = url.searchParams.get('status');
  if (status && ['draft', 'published', 'archived'].includes(status)) {
    clauses.push('status = ?');
    params.push(status);
  }

  const categoryId = Number(url.searchParams.get('categoryId'));
  if (Number.isInteger(categoryId) && categoryId > 0) {
    clauses.push('category_id = ?');
    params.push(categoryId);
  }

  for (const [param, column] of [
    ['featured', 'featured'],
    ['onSale', 'on_sale'],
    ['newArrival', 'new_arrival'],
  ] as const) {
    const value = url.searchParams.get(param);
    if (value === 'true') clauses.push(`${column} = 1`);
    else if (value === 'false') clauses.push(`${column} = 0`);
  }

  const search = url.searchParams.get('q')?.trim();
  if (search) {
    clauses.push('(name LIKE ? OR slug LIKE ? OR sku LIKE ?)');
    const pattern = `%${search.replace(/[%_]/g, '')}%`;
    params.push(pattern, pattern, pattern);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const total = (
    db.prepare(`SELECT COUNT(*) AS total FROM products ${where}`).get(...params) as { total: number }
  ).total;

  const rows = db
    .prepare(`SELECT * FROM products ${where} ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as ProductRow[];

  return ok({
    products: rows.map(serializeProduct),
    pagination: { page, pageSize: limit, total },
  });
});

export const POST = route(async (request: Request) => {
  const { db, user } = await requireMutation(request);
  const body = await readJsonBody(request);
  const columns = parseProductPayload(db, body);

  const names = Object.keys(columns);
  const placeholders = names.map(() => '?').join(', ');
  const result = db
    .prepare(`INSERT INTO products (${names.join(', ')}) VALUES (${placeholders})`)
    .run(...names.map((name) => columns[name]));

  const productId = Number(result.lastInsertRowid);
  logAudit(db, {
    userId: user.id,
    action: 'product.create',
    entityType: 'product',
    entityId: productId,
    details: { name: columns.name, slug: columns.slug, status: columns.status ?? 'draft' },
  });
  if (columns.published === 1) {
    logAudit(db, {
      userId: user.id,
      action: 'product.publish',
      entityType: 'product',
      entityId: productId,
    });
  }

  return created({ product: serializeProduct(getProduct(db, productId)!) });
});
