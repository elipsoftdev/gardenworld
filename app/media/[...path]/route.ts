import fsp from 'node:fs/promises';
import { contentTypeForPath, resolveStoredPath } from '@/lib/uploads/storage';
import { fail, route } from '@/lib/http/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ path: string[] }> };

/**
 * Serves stored uploads from UPLOAD_DIR. The same code works for the ephemeral
 * DEV directory and a future persistent disk: only the env var changes.
 */
export const GET = route(async (_request: Request, { params }: Params) => {
  const { path } = await params;
  const relativePath = (path ?? []).join('/');
  const absolute = resolveStoredPath(relativePath);
  if (!absolute) return fail('not_found', 'File not found');

  const contentType = contentTypeForPath(relativePath);
  if (contentType === 'application/octet-stream') return fail('not_found', 'File not found');

  let file: Buffer;
  try {
    const stats = await fsp.stat(absolute);
    if (!stats.isFile()) return fail('not_found', 'File not found');
    file = await fsp.readFile(absolute);
  } catch {
    return fail('not_found', 'File not found');
  }

  return new Response(new Uint8Array(file), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(file.length),
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
});
