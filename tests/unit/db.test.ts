import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, beforeEach, describe, test } from 'node:test';

import { appliedMigrationIds, closeDb, getDb, resolveDatabasePath } from '@/lib/db';
import { migrations } from '@/lib/db/migrations';
import { HOME_SECTION_KEYS } from '@/lib/db/seed';
import { makeTempDir, removeDir } from '../helpers/tmp';

let workDir: string;

before(() => {
  workDir = makeTempDir('db');
});

after(() => {
  closeDb();
  removeDir(workDir);
});

beforeEach(() => {
  closeDb();
  delete process.env.BOOTSTRAP_SUPERADMIN_EMAIL;
  delete process.env.BOOTSTRAP_SUPERADMIN_PASSWORD;
});

function useDatabase(name: string) {
  process.env.DATABASE_PATH = path.join(workDir, `${name}.db`);
  return getDb();
}

describe('database bootstrap', () => {
  test('creates the file and its parent directory on demand', () => {
    process.env.DATABASE_PATH = path.join(workDir, 'nested', 'deep', 'created.db');
    const db = getDb();
    assert.equal(fs.existsSync(resolveDatabasePath()), true);
    assert.ok(db.prepare('SELECT 1 AS one').get());
  });

  test('applies every migration exactly once', () => {
    const db = useDatabase('migrations');
    assert.deepEqual(
      appliedMigrationIds(db),
      migrations.map((migration) => migration.id),
    );

    closeDb();
    const reopened = useDatabase('migrations');
    assert.deepEqual(
      appliedMigrationIds(reopened),
      migrations.map((migration) => migration.id),
    );
    const rows = reopened.prepare('SELECT COUNT(*) AS total FROM schema_migrations').get() as {
      total: number;
    };
    assert.equal(rows.total, migrations.length);
  });

  test('enforces foreign keys', () => {
    const db = useDatabase('fk');
    assert.equal(db.pragma('foreign_keys', { simple: true }), 1);
    assert.throws(
      () =>
        db
          .prepare('INSERT INTO product_images (product_id, path) VALUES (?, ?)')
          .run(999999, 'nope.jpg'),
      /FOREIGN KEY/i,
    );
  });

  test('seeds the four structural home sections without duplicating them', () => {
    const db = useDatabase('seed');
    const keys = db
      .prepare('SELECT section_key FROM home_sections ORDER BY display_order')
      .all()
      .map((row) => (row as { section_key: string }).section_key);
    assert.deepEqual(keys, [...HOME_SECTION_KEYS]);

    closeDb();
    const reopened = useDatabase('seed');
    const total = reopened.prepare('SELECT COUNT(*) AS total FROM home_sections').get() as {
      total: number;
    };
    assert.equal(total.total, HOME_SECTION_KEYS.length);
  });

  test('recreates everything after the database file is wiped', () => {
    const db = useDatabase('ephemeral');
    db.prepare("INSERT INTO site_settings (key, value) VALUES ('probe', '1')").run();
    closeDb();

    fs.rmSync(resolveDatabasePath(), { force: true });
    fs.rmSync(`${resolveDatabasePath()}-wal`, { force: true });
    fs.rmSync(`${resolveDatabasePath()}-shm`, { force: true });

    const rebuilt = getDb();
    assert.deepEqual(
      appliedMigrationIds(rebuilt),
      migrations.map((migration) => migration.id),
    );
    assert.equal(rebuilt.prepare("SELECT 1 FROM site_settings WHERE key = 'probe'").get(), undefined);
  });

  test('bootstraps a super admin from the environment and never stores plaintext', () => {
    process.env.BOOTSTRAP_SUPERADMIN_NAME = 'Elipsoft';
    process.env.BOOTSTRAP_SUPERADMIN_EMAIL = 'root@example.com';
    process.env.BOOTSTRAP_SUPERADMIN_PASSWORD = 'Bootstrap-1234';

    const db = useDatabase('bootstrap');
    const user = db
      .prepare('SELECT name, email, role, password_hash, must_change_password FROM users WHERE email = ?')
      .get('root@example.com') as {
      name: string;
      email: string;
      role: string;
      password_hash: string;
      must_change_password: number;
    };

    assert.equal(user.role, 'super_admin');
    assert.equal(user.must_change_password, 1);
    assert.ok(user.password_hash.startsWith('scrypt$'));
    assert.equal(user.password_hash.includes('Bootstrap-1234'), false);
  });

  test('does not overwrite an existing super admin password', () => {
    process.env.BOOTSTRAP_SUPERADMIN_EMAIL = 'root2@example.com';
    process.env.BOOTSTRAP_SUPERADMIN_PASSWORD = 'Bootstrap-1234';
    const db = useDatabase('bootstrap-twice');
    const first = db.prepare('SELECT password_hash FROM users WHERE email = ?').get('root2@example.com') as {
      password_hash: string;
    };

    closeDb();
    process.env.BOOTSTRAP_SUPERADMIN_PASSWORD = 'Different-9876';
    const reopened = useDatabase('bootstrap-twice');
    const second = reopened
      .prepare('SELECT password_hash FROM users WHERE email = ?')
      .get('root2@example.com') as { password_hash: string };

    assert.equal(second.password_hash, first.password_hash);
    const total = reopened.prepare('SELECT COUNT(*) AS total FROM users').get() as { total: number };
    assert.equal(total.total, 1);
  });
});
