import { logAudit } from '@/lib/audit';
import { requireSuperAdmin, requireSuperAdminMutation } from '@/lib/auth/guard';
import { destroyUserSessions } from '@/lib/auth/session';
import { ApiError, ok, route } from '@/lib/http/response';
import { countActiveSuperAdmins, requireUser, serializeUser } from '@/lib/repos/users';
import { parseId, readJsonBody, Validator } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export const GET = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { db } = await requireSuperAdmin(request);
  return ok({ user: serializeUser(requireUser(db, parseId(id))) });
});

export const PUT = route(async (request: Request, { params }: Params) => {
  const { id: rawId } = await params;
  const { db, user: actor } = await requireSuperAdminMutation(request);
  const id = parseId(rawId);
  const target = requireUser(db, id);

  const body = await readJsonBody(request);

  // Role changes are out of scope for this endpoint in either direction.
  if (body.role !== undefined && body.role !== target.role) {
    throw new ApiError('forbidden', 'Role changes are not allowed through this endpoint');
  }

  const validator = new Validator(body);
  const name = validator.has('name')
    ? validator.string('name', { required: true, min: 2, max: 120 })
    : undefined;
  const active = validator.has('active') ? validator.boolean('active') : undefined;
  const mustChangePassword = validator.has('mustChangePassword')
    ? validator.boolean('mustChangePassword')
    : undefined;
  validator.assertValid();

  if (active === 0) {
    if (target.id === actor.id) {
      throw new ApiError('conflict', 'You cannot deactivate your own account');
    }
    if (target.role === 'super_admin' && countActiveSuperAdmins(db) <= 1) {
      throw new ApiError('conflict', 'At least one active super admin must remain');
    }
  }

  db.prepare(
    `UPDATE users SET name = ?, active = ?, must_change_password = ?, updated_at = datetime('now')
      WHERE id = ?`,
  ).run(
    typeof name === 'string' ? name : target.name,
    active === undefined ? target.active : active,
    mustChangePassword === undefined ? target.must_change_password : mustChangePassword,
    id,
  );

  if (active === 0) destroyUserSessions(db, id);

  logAudit(db, {
    userId: actor.id,
    action: active === 0 ? 'user.disable' : active === 1 ? 'user.enable' : 'user.update',
    entityType: 'user',
    entityId: id,
  });

  return ok({ user: serializeUser(requireUser(db, id)) });
});
