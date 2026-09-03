import { cookies } from 'next/headers';
import { getDb, type Db } from '@/lib/db';
import { ApiError } from '@/lib/http/response';
import { assertSameOrigin } from '@/lib/http/origin';
import { lookupSession, SESSION_COOKIE, type ActiveSession, type SessionUser } from './session';

export type AuthContext = ActiveSession & { db: Db; token: string };

export function sessionTokenFromRequest(request: Request): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

function readToken(request?: Request): string | undefined {
  if (request) {
    const fromRequest = sessionTokenFromRequest(request);
    if (fromRequest) return fromRequest;
  }
  try {
    return cookies().get(SESSION_COOKIE)?.value;
  } catch {
    return undefined;
  }
}

/** Resolves the caller's session, or throws 401. */
export function requireAuth(request?: Request): AuthContext {
  const db = getDb();
  const token = readToken(request);
  const session = lookupSession(db, token);
  if (!session || !token) throw new ApiError('unauthorized', 'Authentication required');
  return { ...session, db, token };
}

/** Authenticated + same-origin check, for any state-changing admin call. */
export function requireMutation(request: Request): AuthContext {
  assertSameOrigin(request);
  return requireAuth(request);
}

export function requireSuperAdmin(request?: Request): AuthContext {
  const context = requireAuth(request);
  if (context.user.role !== 'super_admin') {
    throw new ApiError('forbidden', 'Super admin role required');
  }
  return context;
}

export function requireSuperAdminMutation(request: Request): AuthContext {
  assertSameOrigin(request);
  return requireSuperAdmin(request);
}

export function isSuperAdmin(user: SessionUser): boolean {
  return user.role === 'super_admin';
}
