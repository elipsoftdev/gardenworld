import { logAudit } from '@/lib/audit';
import { requireMutation } from '@/lib/auth/guard';
import { ok, route } from '@/lib/http/response';
import { listHomeSections, reorderHomeSections, serializeHomeSection } from '@/lib/repos/home';
import { readJsonBody, Validator } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PUT = route(async (request: Request) => {
  const { db, user } = await requireMutation(request);
  const body = await readJsonBody(request);
  const validator = new Validator(body);

  const raw = body.sectionKeys;
  let keys: string[] = [];
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 50) {
    validator.addError('sectionKeys', 'Must be a non-empty array of section keys');
  } else if (raw.some((key) => typeof key !== 'string' || key.length === 0 || key.length > 60)) {
    validator.addError('sectionKeys', 'Must contain section key strings');
  } else {
    keys = raw as string[];
    if (new Set(keys).size !== keys.length) {
      validator.addError('sectionKeys', 'Must not contain duplicate keys');
    }
  }
  validator.assertValid();

  reorderHomeSections(db, keys);
  logAudit(db, {
    userId: user.id,
    action: 'home.order_change',
    entityType: 'home_sections',
    details: { order: keys },
  });

  return ok({ sections: listHomeSections(db).map(serializeHomeSection) });
});
