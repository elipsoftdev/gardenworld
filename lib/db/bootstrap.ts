import { hashPasswordSync, validatePasswordStrength } from '@/lib/auth/password';
import type { Db } from './index';

type BootstrapSpec = {
  role: 'super_admin' | 'admin';
  nameVar: string;
  emailVar: string;
  passwordVar: string;
};

const SPECS: BootstrapSpec[] = [
  {
    role: 'super_admin',
    nameVar: 'BOOTSTRAP_SUPERADMIN_NAME',
    emailVar: 'BOOTSTRAP_SUPERADMIN_EMAIL',
    passwordVar: 'BOOTSTRAP_SUPERADMIN_PASSWORD',
  },
  {
    role: 'admin',
    nameVar: 'BOOTSTRAP_ADMIN_NAME',
    emailVar: 'BOOTSTRAP_ADMIN_EMAIL',
    passwordVar: 'BOOTSTRAP_ADMIN_PASSWORD',
  },
];

function countByRole(db: Db, role: string): number {
  const row = db.prepare('SELECT COUNT(*) AS total FROM users WHERE role = ?').get(role) as {
    total: number;
  };
  return row.total;
}

function emailExists(db: Db, email: string): boolean {
  return db.prepare('SELECT 1 FROM users WHERE email = ?').get(email) !== undefined;
}

/**
 * Creates the bootstrap accounts described by the environment, but only when no
 * user holds that role yet. Existing passwords are never overwritten, and no
 * credential value is ever logged.
 */
export function runBootstrap(db: Db): void {
  for (const spec of SPECS) {
    const email = process.env[spec.emailVar]?.trim().toLowerCase();
    const password = process.env[spec.passwordVar];
    const name = process.env[spec.nameVar]?.trim();

    if (!email || !password) continue;
    if (countByRole(db, spec.role) > 0) continue;
    if (emailExists(db, email)) continue;

    if (validatePasswordStrength(password) !== null) {
      console.warn(`[bootstrap] ${spec.passwordVar} does not meet the password policy; skipped`);
      continue;
    }

    db.prepare(
      `INSERT INTO users (name, email, password_hash, role, active, must_change_password)
       VALUES (?, ?, ?, ?, 1, 1)`,
    ).run(name && name.length > 0 ? name : spec.role, email, hashPasswordSync(password), spec.role);

    console.info(`[bootstrap] created ${spec.role} account`);
  }
}
