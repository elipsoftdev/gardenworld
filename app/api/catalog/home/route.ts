import { getDb } from '@/lib/db';
import { ok, route } from '@/lib/http/response';
import { getPublicHomeSections } from '@/lib/public/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Returns only enabled sections, in their configured order, each already filled
 * with the cards that belong to it in their own configured order.
 */
export const GET = route(async () => {
  return ok({ sections: getPublicHomeSections(getDb()) });
});
