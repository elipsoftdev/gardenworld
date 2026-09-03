import { getDb } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { sessionTokenFromRequest } from '@/lib/auth/guard';
import { destroySession, lookupSession } from '@/lib/auth/session';
import { clearedSessionCookie } from '@/lib/auth/cookie';
import { assertSameOrigin, isSecureRequest } from '@/lib/http/origin';
import { ok, route } from '@/lib/http/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = route(async (request: Request) => {
  assertSameOrigin(request);

  const db = getDb();
  const token = sessionTokenFromRequest(request);
  const session = lookupSession(db, token);
  if (session) {
    logAudit(db, {
      userId: session.user.id,
      action: 'auth.logout',
      entityType: 'user',
      entityId: session.user.id,
    });
  }
  destroySession(db, token);

  return ok({ loggedOut: true }, 200, {
    headers: { 'Set-Cookie': clearedSessionCookie(isSecureRequest(request)) },
  });
});
