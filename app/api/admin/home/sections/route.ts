import { requireAuth } from '@/lib/auth/guard';
import { ok, route } from '@/lib/http/response';
import { listHomeSections, serializeHomeSection } from '@/lib/repos/home';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route(async (request: Request) => {
  const { db } = requireAuth(request);
  return ok({ sections: listHomeSections(db).map(serializeHomeSection) });
});
