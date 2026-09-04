import { logAudit } from '@/lib/audit';
import { requireMutation } from '@/lib/auth/guard';
import { ok, route } from '@/lib/http/response';
import { requireHomeSection, serializeHomeSection } from '@/lib/repos/home';
import { readJsonBody, Validator } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ sectionKey: string }> };

export const PUT = route(async (request: Request, { params }: Params) => {
  const { sectionKey } = await params;
  const { db, user } = await requireMutation(request);
  const section = requireHomeSection(db, sectionKey);

  const body = await readJsonBody(request);
  const validator = new Validator(body);
  const title = validator.has('title') ? validator.string('title', { max: 120 }) : undefined;
  const subtitle = validator.has('subtitle') ? validator.string('subtitle', { max: 240 }) : undefined;
  const enabled = validator.has('enabled') ? validator.boolean('enabled') : undefined;
  const displayOrder = validator.has('displayOrder')
    ? validator.number('displayOrder', { integer: true, min: 0, max: 100000 })
    : undefined;
  validator.assertValid();

  db.prepare(
    `UPDATE home_sections
        SET title = ?, subtitle = ?, enabled = ?, display_order = ?, updated_at = datetime('now')
      WHERE section_key = ?`,
  ).run(
    title === undefined ? section.title : title,
    subtitle === undefined ? section.subtitle : subtitle,
    enabled === undefined ? section.enabled : enabled,
    typeof displayOrder === 'number' ? displayOrder : section.display_order,
    section.section_key,
  );

  logAudit(db, {
    userId: user.id,
    action: 'home.section_update',
    entityType: 'home_section',
    entityId: section.section_key,
  });

  return ok({ section: serializeHomeSection(requireHomeSection(db, section.section_key)) });
});
