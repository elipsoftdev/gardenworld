import type { Db } from '@/lib/db';

export type AuditAction =
  | 'product.create'
  | 'product.update'
  | 'product.publish'
  | 'product.unpublish'
  | 'product.archive'
  | 'product.price_change'
  | 'product.feature'
  | 'product.sale_change'
  | 'product.order_change'
  | 'product.image_add'
  | 'product.image_delete'
  | 'product.image_order_change'
  | 'product.spec_change'
  | 'category.create'
  | 'category.update'
  | 'category.archive'
  | 'category.order_change'
  | 'home.section_update'
  | 'home.order_change'
  | 'user.create'
  | 'user.update'
  | 'user.disable'
  | 'user.enable'
  | 'user.password_change'
  | 'auth.login'
  | 'auth.logout'
  | 'upload.create'
  | 'upload.delete';

const SECRET_KEY = /(password|token|secret|cookie|hash|authorization)/i;

/** Drops anything that smells like a credential before persisting audit details. */
function sanitize(details: Record<string, unknown> | undefined): string | null {
  if (!details) return null;
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (SECRET_KEY.test(key)) continue;
    if (value === undefined) continue;
    if (typeof value === 'string' && value.length > 300) {
      safe[key] = `${value.slice(0, 300)}...`;
      continue;
    }
    safe[key] = value;
  }
  const json = JSON.stringify(safe);
  return json.length > 2000 ? `${json.slice(0, 2000)}...` : json;
}

export function logAudit(
  db: Db,
  entry: {
    userId: number | null;
    action: AuditAction;
    entityType?: string;
    entityId?: string | number | null;
    details?: Record<string, unknown>;
  },
): void {
  db.prepare(
    `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    entry.userId,
    entry.action,
    entry.entityType ?? null,
    entry.entityId === undefined || entry.entityId === null ? null : String(entry.entityId),
    sanitize(entry.details),
  );
}
