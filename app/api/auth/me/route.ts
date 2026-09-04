import { requireAuth } from '@/lib/auth/guard';
import { ok, route } from '@/lib/http/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route(async (request: Request) => {
  const { user } = await requireAuth(request);
  return ok({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.must_change_password === 1,
      lastLoginAt: user.last_login_at,
    },
  });
});
