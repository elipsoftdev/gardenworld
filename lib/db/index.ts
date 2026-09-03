import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { migrations } from './migrations';
import { runBootstrap } from './bootstrap';
import { isDevelopmentEnv, runDevSeed, runStructuralSeed } from './seed';

export type Db = Database.Database;

const DEFAULT_DB_PATH = './data/gardenworld-dev.db';

type DbState = {
  db: Db;
  file: string;
};

// Survives Next.js dev hot reloads, which re-evaluate modules.
const globalState = globalThis as unknown as { __gwDb?: DbState };

export function resolveDatabasePath(): string {
  const configured = process.env.DATABASE_PATH?.trim();
  return path.resolve(configured && configured.length > 0 ? configured : DEFAULT_DB_PATH);
}

function ensureParentDirectory(file: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function applyPragmas(db: Db): void {
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  try {
    db.pragma('journal_mode = WAL');
  } catch {
    // Some ephemeral/networked filesystems reject WAL; the default journal still works.
    db.pragma('journal_mode = DELETE');
  }
  db.pragma('synchronous = NORMAL');
}

function runMigrations(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = new Set<number>(
    db
      .prepare('SELECT id FROM schema_migrations')
      .all()
      .map((row) => (row as { id: number }).id),
  );

  const record = db.prepare('INSERT INTO schema_migrations (id, name) VALUES (?, ?)');

  for (const migration of migrations) {
    if (applied.has(migration.id)) continue;
    const apply = db.transaction(() => {
      db.exec(migration.sql);
      record.run(migration.id, migration.name);
    });
    apply();
  }
}

function openDatabase(): DbState {
  const file = resolveDatabasePath();
  ensureParentDirectory(file);
  const db = new Database(file);
  applyPragmas(db);
  runMigrations(db);
  runStructuralSeed(db);
  runBootstrap(db);
  if (isDevelopmentEnv() && process.env.ENABLE_DEV_SEED === 'true') runDevSeed(db);
  return { db, file };
}

/** True when the backing file vanished (ephemeral /tmp wiped under a live process). */
function isStale(state: DbState): boolean {
  if (state.file === ':memory:') return false;
  try {
    return !fs.existsSync(state.file);
  } catch {
    return false;
  }
}

/**
 * Returns a ready database: created if missing, migrated up to date, and
 * transparently reopened when the underlying file was wiped.
 */
export function getDb(): Db {
  const state = globalState.__gwDb;

  if (state) {
    if (state.file === resolveDatabasePath() && !isStale(state)) return state.db;
    try {
      state.db.close();
    } catch {
      // Nothing useful to do: we are replacing the handle anyway.
    }
    globalState.__gwDb = undefined;
  }

  const next = openDatabase();
  globalState.__gwDb = next;
  return next.db;
}

/** Test helper: drops the cached handle so the next getDb() reopens from disk. */
export function closeDb(): void {
  const state = globalState.__gwDb;
  if (!state) return;
  try {
    state.db.close();
  } catch {
    // Already closed.
  }
  globalState.__gwDb = undefined;
}

export function appliedMigrationIds(db: Db): number[] {
  return db
    .prepare('SELECT id FROM schema_migrations ORDER BY id')
    .all()
    .map((row) => (row as { id: number }).id);
}
