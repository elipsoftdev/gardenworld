import { logAudit } from '@/lib/audit';
import { requireSuperAdmin, requireSuperAdminMutation } from '@/lib/auth/guard';
import {
  hashPassword,
  passwordProblemMessage,
  validatePasswordStrength,
} from '@/lib/auth/password';
import { ApiError, created, ok, route } from '@/lib/http/response';
import { listUsers, requireUser, serializeUser } from '@/lib/repos/users';
import { readJsonBody, Validator } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route(async (request: Request) => {
  const { db } = await requireSuperAdmin(request);
  return ok({ users: listUsers(db).map(serializeUser) });
});

/** Creates admin accounts only: super_admin cannot be minted through the API. */
export const POST = route(async (request: Request) => {
  const { db, user } = await requireSuperAdminMutation(request);
  const body = await readJsonBody(request);

  if (body.role !== undefined && body.role !== 'admin') {
    throw new ApiError('forbidden', 'Only admin accounts can be created through this endpoint');
  }

  const validator = new Validator(body);
  const name = validator.string('name', { required: true, min: 2, max: 120 });
  const email = validator.email('email', { required: true });
  const problem = validatePasswordStrength(body.password);
  if (problem) validator.addError('password', passwordProblemMessage(problem));
  validator.assertValid();

  const taken = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
  if (taken) throw new ApiError('conflict', 'Email already registered');

  const hash = await hashPassword(body.password as string);
  const result = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role, active, must_change_password)
       VALUES (?, ?, ?, 'admin', 1, 1)`,
    )
    .run(name, email, hash);

  const userId = Number(result.lastInsertRowid);
  logAudit(db, {
    userId: user.id,
    action: 'user.create',
    entityType: 'user',
    entityId: userId,
    details: { email, role: 'admin' },
  });

  return created({ user: serializeUser(requireUser(db, userId)) });
});
