import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Db } from '@/lib/db';

export const SESSION_COOKIE = 'gw_session';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'admin';
  active: number;
  must_change_password: number;
  last_login_at: string | null;
};

export type ActiveSession = {
  sessionId: number;
  user: SessionUser;
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createSession(db: Db, userId: number): { token: string; expiresAt: Date } {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  db.prepare(
    `INSERT INTO sessions (user_id, token_hash, expires_at, created_at, last_seen_at)
     VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
  ).run(userId, hashToken(token), expiresAt.toISOString());
  return { token, expiresAt };
}

export function lookupSession(db: Db, token: string | undefined | null): ActiveSession | null {
  if (!token) return null;

  const row = db
    .prepare(
      `SELECT s.id AS session_id, s.expires_at AS expires_at,
              u.id, u.name, u.email, u.role, u.active, u.must_change_password, u.last_login_at,
              u.deleted_at
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ?`,
    )
    .get(hashToken(token)) as
    | (SessionUser & { session_id: number; expires_at: string; deleted_at: string | null })
    | undefined;

  if (!row) return null;

  if (row.deleted_at !== null) {
    destroyUserSessions(db, row.id);
    return null;
  }

  if (Date.parse(row.expires_at) <= Date.now()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(row.session_id);
    return null;
  }
  if (!row.active) return null;

  db.prepare("UPDATE sessions SET last_seen_at = datetime('now') WHERE id = ?").run(row.session_id);

  return {
    sessionId: row.session_id,
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      active: row.active,
      must_change_password: row.must_change_password,
      last_login_at: row.last_login_at,
    },
  };
}

export function destroySession(db: Db, token: string | undefined | null): void {
  if (!token) return;
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

export function destroyUserSessions(db: Db, userId: number, exceptToken?: string): void {
  if (exceptToken) {
    db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?').run(
      userId,
      hashToken(exceptToken),
    );
    return;
  }
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

export function purgeExpiredSessions(db: Db): void {
  db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
}

/** Constant-time compare for short opaque strings (used by CSRF token checks). */
export function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
