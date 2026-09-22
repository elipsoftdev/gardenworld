import { getDb } from '@/lib/db';
import { consume, PASSWORD_RESET_LIMITS } from '@/lib/auth/rate-limit';
import { generateResetCode, hashResetCode, PASSWORD_RESET_TTL_MS } from '@/lib/auth/password-reset';
import { assertSameOrigin, clientIp } from '@/lib/http/origin';
import { fail, ok, route } from '@/lib/http/response';
import { readJsonBody, Validator } from '@/lib/validation';
import { sendPasswordResetOtp } from '@/lib/mail/smtp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GENERIC_MESSAGE = 'Si el correo corresponde a una cuenta activa, enviaremos un codigo de verificacion.';

export const POST = route(async (request: Request) => {
  assertSameOrigin(request);

  if (!process.env.PASSWORD_RESET_SECRET || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    return fail('internal_error', 'El servicio de recuperacion de contrasena no esta configurado.');
  }

  const body = await readJsonBody(request);
  const validator = new Validator(body);
  const email = validator.email('email', { required: true });
  validator.assertValid();

  const ip = clientIp(request);
  const byIp = consume('password-reset:request:ip:' + ip, PASSWORD_RESET_LIMITS.requestPerIp.limit, PASSWORD_RESET_LIMITS.requestPerIp.windowMs);
  const byEmail = consume('password-reset:request:email:' + email, PASSWORD_RESET_LIMITS.requestPerEmail.limit, PASSWORD_RESET_LIMITS.requestPerEmail.windowMs);
  if (!byIp.allowed || !byEmail.allowed) {
    const retryAfter = Math.max(byIp.retryAfterSeconds, byEmail.retryAfterSeconds);
    return fail('rate_limited', 'Demasiados intentos. Intente mas tarde.', {
      headers: { 'Retry-After': String(retryAfter) },
    });
  }

  const db = getDb();
  const user = db.prepare('SELECT id, email, active FROM users WHERE email = ? AND deleted_at IS NULL').get(email) as
    | { id: number; email: string; active: number }
    | undefined;

  if (!user || user.active !== 1) {
    return ok({ message: GENERIC_MESSAGE });
  }

  const code = generateResetCode();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString();
  const codeHmac = hashResetCode(user.email, code);

  db.transaction(() => {
    db.prepare("UPDATE password_reset_otps SET consumed_at = datetime('now') WHERE user_id = ? AND consumed_at IS NULL").run(user.id);
    db.prepare('INSERT INTO password_reset_otps (user_id, code_hmac, expires_at, requested_ip) VALUES (?, ?, ?, ?)').run(user.id, codeHmac, expiresAt, ip);
  })();

  try {
    await sendPasswordResetOtp(user.email, code);
  } catch (error) {
    console.error('[password-reset] SMTP delivery failed', error instanceof Error ? error.message : error);
    db.prepare("UPDATE password_reset_otps SET consumed_at = datetime('now') WHERE user_id = ? AND code_hmac = ? AND consumed_at IS NULL").run(user.id, codeHmac);
    return fail('internal_error', 'No fue posible enviar el codigo. Intente nuevamente.');
  }

  return ok({ message: GENERIC_MESSAGE });
});
