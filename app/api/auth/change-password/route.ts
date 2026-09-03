import { logAudit } from '@/lib/audit';
import { requireMutation } from '@/lib/auth/guard';
import {
  hashPassword,
  passwordProblemMessage,
  validatePasswordStrength,
  verifyPassword,
} from '@/lib/auth/password';
import { destroyUserSessions } from '@/lib/auth/session';
import { ApiError, fail, ok, route } from '@/lib/http/response';
import { readJsonBody } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = route(async (request: Request) => {
  const { db, user, token } = requireMutation(request);

  const body = await readJsonBody(request);
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

  const problem = validatePasswordStrength(newPassword);
  if (problem) {
    throw new ApiError('validation_error', 'Invalid request payload', {
      newPassword: passwordProblemMessage(problem),
    });
  }

  const stored = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id) as
    | { password_hash: string }
    | undefined;
  if (!stored) throw new ApiError('unauthorized', 'Authentication required');

  if (!(await verifyPassword(currentPassword, stored.password_hash))) {
    return fail('unauthorized', 'Credenciales invalidas');
  }
  if (currentPassword === newPassword) {
    throw new ApiError('validation_error', 'Invalid request payload', {
      newPassword: 'Must differ from the current password',
    });
  }

  const hash = await hashPassword(newPassword);
  db.prepare(
    `UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = datetime('now')
      WHERE id = ?`,
  ).run(hash, user.id);

  // Any other session for this user is invalidated; the current one stays alive.
  destroyUserSessions(db, user.id, token);
  logAudit(db, {
    userId: user.id,
    action: 'user.password_change',
    entityType: 'user',
    entityId: user.id,
  });

  return ok({ changed: true });
});
