import type { Db } from '@/lib/db';
import { ApiError } from '@/lib/http/response';

export type HomeSectionRow = {
  id: number;
  section_key: string;
  title: string | null;
  subtitle: string | null;
  enabled: number;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export function listHomeSections(db: Db, options: { onlyEnabled?: boolean } = {}): HomeSectionRow[] {
  const where = options.onlyEnabled ? 'WHERE enabled = 1' : '';
  return db
    .prepare(`SELECT * FROM home_sections ${where} ORDER BY display_order, id`)
    .all() as HomeSectionRow[];
}

export function requireHomeSection(db: Db, sectionKey: string): HomeSectionRow {
  const row = db.prepare('SELECT * FROM home_sections WHERE section_key = ?').get(sectionKey) as
    | HomeSectionRow
    | undefined;
  if (!row) throw new ApiError('not_found', 'Home section not found');
  return row;
}

export function serializeHomeSection(row: HomeSectionRow) {
  return {
    id: row.id,
    sectionKey: row.section_key,
    title: row.title,
    subtitle: row.subtitle,
    enabled: row.enabled === 1,
    displayOrder: row.display_order,
    updatedAt: row.updated_at,
  };
}

/** Section keys arrive as an ordered list; every existing key must be present. */
export function reorderHomeSections(db: Db, orderedKeys: string[]): void {
  const known = new Set(listHomeSections(db).map((section) => section.section_key));
  for (const key of orderedKeys) {
    if (!known.has(key)) throw new ApiError('validation_error', `Unknown section key: ${key}`);
  }

  const update = db.prepare(
    "UPDATE home_sections SET display_order = ?, updated_at = datetime('now') WHERE section_key = ?",
  );
  const apply = db.transaction(() => {
    orderedKeys.forEach((key, index) => update.run(index + 1, key));
  });
  apply();
}
