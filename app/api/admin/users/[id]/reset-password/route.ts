import { logAudit } from '@/lib/audit';
import { requireSuperAdminMutation } from '@/lib/auth/guard';
import { hashPassword, passwordProblemMessage, validatePasswordStrength } from '@/lib/auth/password';
import { destroyUserSessions } from '@/lib/auth/session';
import { ApiError, ok, route } from '@/lib/http/response';
import { requireUser } from '@/lib/repos/users';
import { parseId, readJsonBody } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Params) => {
  const { id: rawId } = await params;
  const { db, user: actor } = await requireSuperAdminMutation(request);
  const id = parseId(rawId);
  const target = requireUser(db, id);

  if (target.id === actor.id) {
    throw new ApiError('conflict', 'Usa Mi cuenta para cambiar tu propia contrasena.');
  }

  const body = await readJsonBody(request);
  const password = typeof body.password === 'string' ? body.password : '';
  const problem = validatePasswordStrength(password);
  if (problem) {
    throw new ApiError('validation_error', 'Invalid request payload', {
      password: passwordProblemMessage(problem),
    });
  }

  const hash = await hashPassword(password);
  db.prepare("UPDATE users SET password_hash = ?, must_change_password = 1, updated_at = datetime('now') WHERE id = ?").run(hash, id);
  destroyUserSessions(db, id);

  logAudit(db, {
    userId: actor.id,
    action: 'user.password_reset_admin',
    entityType: 'user',
    entityId: id,
    details: { email: target.email, role: target.role },
  });

  return ok({ reset: true });
});
