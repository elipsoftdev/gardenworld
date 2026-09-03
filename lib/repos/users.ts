import type { Db } from '@/lib/db';
import { ApiError } from '@/lib/http/response';

export type UserRow = {
  id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'admin';
  active: number;
  must_change_password: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Never includes password_hash: it must not leave the database layer. */
export const USER_SAFE_COLUMNS =
  'id, name, email, role, active, must_change_password, last_login_at, created_at, updated_at';

export function listUsers(db: Db): UserRow[] {
  return db.prepare(`SELECT ${USER_SAFE_COLUMNS} FROM users ORDER BY id`).all() as UserRow[];
}

export function getUser(db: Db, id: number): UserRow | undefined {
  return db.prepare(`SELECT ${USER_SAFE_COLUMNS} FROM users WHERE id = ?`).get(id) as
    | UserRow
    | undefined;
}

export function requireUser(db: Db, id: number): UserRow {
  const user = getUser(db, id);
  if (!user) throw new ApiError('not_found', 'User not found');
  return user;
}

export function countActiveSuperAdmins(db: Db): number {
  const row = db
    .prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'super_admin' AND active = 1")
    .get() as { total: number };
  return row.total;
}

export function serializeUser(row: UserRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active === 1,
    mustChangePassword: row.must_change_password === 1,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
