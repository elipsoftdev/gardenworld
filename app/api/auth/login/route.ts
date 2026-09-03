import { randomBytes } from 'node:crypto';
import { getDb } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { hashPasswordSync, verifyPassword } from '@/lib/auth/password';
import { createSession, purgeExpiredSessions } from '@/lib/auth/session';
import { sessionCookie } from '@/lib/auth/cookie';
import { consume, LOGIN_LIMITS } from '@/lib/auth/rate-limit';
import { assertSameOrigin, clientIp, isSecureRequest } from '@/lib/http/origin';
import { fail, ok, route } from '@/lib/http/response';
import { readJsonBody, Validator } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const INVALID_CREDENTIALS = 'Credenciales invalidas';

let decoy: string | undefined;

/** Lazily built throwaway hash, used to equalise timing for unknown emails. */
function decoyHash(): string {
  decoy ??= hashPasswordSync(randomBytes(32).toString('hex'));
  return decoy;
}

type UserRow = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: 'super_admin' | 'admin';
  active: number;
  must_change_password: number;
};

export const POST = route(async (request: Request) => {
  assertSameOrigin(request);

  const body = await readJsonBody(request);
  const validator = new Validator(body);
  const email = validator.email('email', { required: true });
  const password = typeof body.password === 'string' ? body.password : '';
  if (password.length === 0 || password.length > 200) {
    validator.addError('password', 'Required');
  }
  validator.assertValid();

  const ip = clientIp(request);
  const byIp = consume(`login:ip:${ip}`, LOGIN_LIMITS.perIp.limit, LOGIN_LIMITS.perIp.windowMs);
  const byEmail = consume(
    `login:email:${email}`,
    LOGIN_LIMITS.perEmail.limit,
    LOGIN_LIMITS.perEmail.windowMs,
  );
  if (!byIp.allowed || !byEmail.allowed) {
    const retryAfter = Math.max(byIp.retryAfterSeconds, byEmail.retryAfterSeconds);
    return fail('rate_limited', 'Demasiados intentos. Intente mas tarde.', {
      headers: { 'Retry-After': String(retryAfter) },
    });
  }

  const db = getDb();
  const user = db
    .prepare(
      'SELECT id, name, email, password_hash, role, active, must_change_password FROM users WHERE email = ?',
    )
    .get(email) as UserRow | undefined;

  // Same generic answer for unknown email, wrong password and disabled account.
  // The dummy verification keeps the response time of an unknown email in line
  // with a real one, so timing cannot be used to enumerate accounts.
  if (!user) {
    await verifyPassword(password, decoyHash());
    return fail('unauthorized', INVALID_CREDENTIALS);
  }
  const passwordMatches = await verifyPassword(password, user.password_hash);
  if (!passwordMatches || user.active !== 1) return fail('unauthorized', INVALID_CREDENTIALS);

  purgeExpiredSessions(db);
  const { token, expiresAt } = createSession(db, user.id);
  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);
  logAudit(db, { userId: user.id, action: 'auth.login', entityType: 'user', entityId: user.id });

  return ok(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.must_change_password === 1,
      },
      expiresAt: expiresAt.toISOString(),
    },
    200,
    { headers: { 'Set-Cookie': sessionCookie(token, expiresAt, isSecureRequest(request)) } },
  );
});
