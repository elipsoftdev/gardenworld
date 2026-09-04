import type { Db } from '@/lib/db';
import { slugify, uniqueSlug } from '@/lib/slug';
import { Validator } from '@/lib/validation';
import { categorySlugTaken, wouldCreateCycle, type CategoryRow } from './categories';

export type CategoryColumns = Record<string, string | number | null>;

export function parseCategoryPayload(
  db: Db,
  body: Record<string, unknown>,
  existing?: CategoryRow,
): CategoryColumns {
  const validator = new Validator(body);
  const columns: CategoryColumns = {};
  const isCreate = existing === undefined;

  const name = validator.string('name', { required: isCreate, min: 2, max: 120 });
  if (typeof name === 'string') columns.name = name;

  if (validator.has('slug')) {
    const slug = validator.slug('slug', { required: false });
    if (slug) {
      if (categorySlugTaken(db, slug, existing?.id)) validator.addError('slug', 'Slug already in use');
      else columns.slug = slug;
    }
  } else if (isCreate && typeof name === 'string') {
    columns.slug = uniqueSlug(slugify(name), (candidate) => categorySlugTaken(db, candidate));
  }

  if (validator.has('description')) {
    const description = validator.string('description', { max: 2000 });
    if (description !== undefined) columns.description = description;
  }
  if (validator.has('seoTitle')) {
    const seoTitle = validator.string('seoTitle', { max: 200 });
    if (seoTitle !== undefined) columns.seo_title = seoTitle;
  }
  if (validator.has('seoDescription')) {
    const seoDescription = validator.string('seoDescription', { max: 400 });
    if (seoDescription !== undefined) columns.seo_description = seoDescription;
  }

  if (validator.has('imagePath')) {
    const imagePath = validator.string('imagePath', { max: 300 });
    if (imagePath === null) columns.image_path = null;
    else if (typeof imagePath === 'string') {
      const upload = db.prepare('SELECT 1 FROM uploads WHERE path = ?').get(imagePath);
      if (!upload) validator.addError('imagePath', 'Unknown upload path');
      else columns.image_path = imagePath;
    }
  }

  if (validator.has('parentId')) {
    const parentId = validator.number('parentId', { integer: true, min: 1, nullable: true });
    if (parentId === null) columns.parent_id = null;
    else if (typeof parentId === 'number') {
      const parent = db.prepare('SELECT 1 FROM categories WHERE id = ?').get(parentId);
      if (!parent) validator.addError('parentId', 'Parent category does not exist');
      else if (existing && wouldCreateCycle(db, existing.id, parentId)) {
        validator.addError('parentId', 'Would create a category cycle');
      } else columns.parent_id = parentId;
    }
  }

  for (const [field, column] of [
    ['published', 'published'],
    ['showInMenu', 'show_in_menu'],
    ['showOnHome', 'show_on_home'],
    ['indexable', 'indexable'],
  ] as const) {
    if (!validator.has(field)) continue;
    const flag = validator.boolean(field);
    if (flag !== undefined) columns[column] = flag;
  }

  if (validator.has('displayOrder')) {
    const order = validator.number('displayOrder', { integer: true, min: 0, max: 100000 });
    if (typeof order === 'number') columns.display_order = order;
  }

  validator.assertValid();
  return columns;
}
