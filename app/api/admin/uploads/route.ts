import { logAudit } from '@/lib/audit';
import { requireAuth, requireMutation } from '@/lib/auth/guard';
import { ApiError, created, ok, route } from '@/lib/http/response';
import {
  detectImageType,
  MAX_UPLOAD_BYTES,
  publicUrlFor,
  storeImage,
} from '@/lib/uploads/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type UploadRow = {
  id: number;
  path: string;
  original_name: string | null;
  mime_type: string;
  size_bytes: number;
  created_by: number | null;
  created_at: string;
};

function serializeUpload(row: UploadRow) {
  return {
    id: row.id,
    path: row.path,
    url: publicUrlFor(row.path),
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}

/** Only the base name is kept, for display; it never influences the stored path. */
function safeOriginalName(name: unknown): string | null {
  if (typeof name !== 'string' || name.length === 0) return null;
  const base = name.split(/[\\/]/).pop() ?? '';
  const cleaned = base.replace(/[^A-Za-z0-9._ -]/g, '').slice(0, 120);
  return cleaned.length > 0 ? cleaned : null;
}

export const GET = route(async (request: Request) => {
  const { db } = await requireAuth(request);
  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? '50') || 50));
  const rows = db
    .prepare('SELECT * FROM uploads ORDER BY id DESC LIMIT ?')
    .all(limit) as UploadRow[];
  return ok({ uploads: rows.map(serializeUpload) });
});

export const POST = route(async (request: Request) => {
  const { db, user } = await requireMutation(request);

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    throw new ApiError('unsupported_media_type', 'Expected multipart/form-data body');
  }

  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BYTES * 1.1) {
    throw new ApiError('payload_too_large', 'File exceeds the maximum allowed size');
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new ApiError('bad_request', 'Malformed multipart body');
  }

  const file = form.get('file');
  if (!file || typeof file === 'string') {
    throw new ApiError('validation_error', 'Invalid request payload', { file: 'Required' });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length === 0) {
    throw new ApiError('validation_error', 'Invalid request payload', { file: 'File is empty' });
  }
  if (bytes.length > MAX_UPLOAD_BYTES) {
    throw new ApiError('payload_too_large', 'File exceeds the maximum allowed size');
  }

  // The declared content type is ignored: only the magic bytes decide.
  const detected = detectImageType(bytes);
  if (!detected) {
    throw new ApiError('unsupported_media_type', 'Only JPEG, PNG and WebP images are accepted');
  }

  const { relativePath } = await storeImage(bytes, detected);
  const originalName = safeOriginalName((file as File).name);

  const result = db
    .prepare(
      `INSERT INTO uploads (path, original_name, mime_type, size_bytes, created_by)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(relativePath, originalName, detected, bytes.length, user.id);

  const uploadId = Number(result.lastInsertRowid);
  logAudit(db, {
    userId: user.id,
    action: 'upload.create',
    entityType: 'upload',
    entityId: uploadId,
    details: { path: relativePath, mimeType: detected, sizeBytes: bytes.length },
  });

  const row = db.prepare('SELECT * FROM uploads WHERE id = ?').get(uploadId) as UploadRow;
  return created({ upload: serializeUpload(row) });
});
