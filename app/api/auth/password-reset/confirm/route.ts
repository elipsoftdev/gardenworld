import { getDb } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { hashPassword, passwordProblemMessage, validatePasswordStrength } from '@/lib/auth/password';
import { PASSWORD_RESET_MAX_ATTEMPTS, resetCodeMatches } from '@/lib/auth/password-reset';
import { destroyUserSessions } from '@/lib/auth/session';
import { consume, PASSWORD_RESET_LIMITS } from '@/lib/auth/rate-limit';
import { assertSameOrigin, clientIp } from '@/lib/http/origin';
import { fail, ok, route } from '@/lib/http/response';
import { readJsonBody, Validator } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ResetRow = {
  id: number;
  user_id: number;
  email: string;
  code_hmac: string;
  expires_at: string;
  attempts: number;
};

export const POST = route(async (request: Request) => {
  assertSameOrigin(request);

  const body = await readJsonBody(request);
  const validator = new Validator(body);
  const email = validator.email('email', { required: true });
  const code = validator.string('code', { required: true, min: 6, max: 6, pattern: /^\d{6}$/ });
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
  const problem = validatePasswordStrength(newPassword);
  if (problem) validator.addError('newPassword', passwordProblemMessage(problem));
  validator.assertValid();

  const ip = clientIp(request);
  const byIp = consume('password-reset:confirm:ip:' + ip, PASSWORD_RESET_LIMITS.confirmPerIp.limit, PASSWORD_RESET_LIMITS.confirmPerIp.windowMs);
  const byEmail = consume('password-reset:confirm:email:' + email, PASSWORD_RESET_LIMITS.confirmPerEmail.limit, PASSWORD_RESET_LIMITS.confirmPerEmail.windowMs);
  if (!byIp.allowed || !byEmail.allowed) {
    const retryAfter = Math.max(byIp.retryAfterSeconds, byEmail.retryAfterSeconds);
    return fail('rate_limited', 'Demasiados intentos. Intente mas tarde.', {
      headers: { 'Retry-After': String(retryAfter) },
    });
  }

  const db = getDb();
  const row = db.prepare(
    'SELECT o.id, o.user_id, u.email, o.code_hmac, o.expires_at, o.attempts ' +
    'FROM password_reset_otps o JOIN users u ON u.id = o.user_id ' +
    'WHERE u.email = ? AND u.active = 1 AND o.consumed_at IS NULL ORDER BY o.id DESC LIMIT 1'
  ).get(email) as ResetRow | undefined;

  if (!row || Date.parse(row.expires_at) <= Date.now() || row.attempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
    return fail('validation_error', 'Codigo invalido o vencido.', { status: 422 });
  }

  if (!resetCodeMatches(row.email, code as string, row.code_hmac)) {
    const nextAttempts = row.attempts + 1;
    db.prepare("UPDATE password_reset_otps SET attempts = ?, consumed_at = CASE WHEN ? >= ? THEN datetime('now') ELSE consumed_at END WHERE id = ?")
      .run(nextAttempts, nextAttempts, PASSWORD_RESET_MAX_ATTEMPTS, row.id);
    return fail('validation_error', 'Codigo invalido o vencido.', { status: 422 });
  }

  const hash = await hashPassword(newPassword);
  db.transaction(() => {
    db.prepare("UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = datetime('now') WHERE id = ?").run(hash, row.user_id);
    db.prepare("UPDATE password_reset_otps SET consumed_at = datetime('now') WHERE id = ?").run(row.id);
    db.prepare("UPDATE password_reset_otps SET consumed_at = datetime('now') WHERE user_id = ? AND consumed_at IS NULL").run(row.user_id);
    destroyUserSessions(db, row.user_id);
    logAudit(db, {
      userId: row.user_id,
      action: 'user.password_reset_otp',
      entityType: 'user',
      entityId: row.user_id,
    });
  })();

  return ok({ changed: true });
});
