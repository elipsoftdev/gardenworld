import { requireSuperAdmin } from '@/lib/auth/guard';
import { ok, route } from '@/lib/http/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AuditRow = {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: string | null;
  created_at: string;
};

export const GET = route(async (request: Request) => {
  const { db } = requireSuperAdmin(request);
  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? '50') || 50));

  const clauses: string[] = [];
  const params: (string | number)[] = [];

  const action = url.searchParams.get('action');
  if (action) {
    clauses.push('action = ?');
    params.push(action);
  }
  const entityType = url.searchParams.get('entityType');
  if (entityType) {
    clauses.push('entity_type = ?');
    params.push(entityType);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db
    .prepare(`SELECT * FROM audit_log ${where} ORDER BY id DESC LIMIT ?`)
    .all(...params, limit) as AuditRow[];

  return ok({
    entries: rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      details: row.details ? (JSON.parse(row.details) as unknown) : null,
      createdAt: row.created_at,
    })),
  });
});
