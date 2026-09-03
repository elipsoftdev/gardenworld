import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const DEFAULT_UPLOAD_DIR = './data/uploads';

export const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export type AllowedImageType = keyof typeof ALLOWED_IMAGE_TYPES;

export function resolveUploadDir(): string {
  const configured = process.env.UPLOAD_DIR?.trim();
  return path.resolve(configured && configured.length > 0 ? configured : DEFAULT_UPLOAD_DIR);
}

export function ensureUploadDir(): string {
  const dir = resolveUploadDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Content sniffing: the declared Content-Type of a multipart part is attacker
 * controlled, so the real format comes from the file's magic bytes.
 */
export function detectImageType(bytes: Uint8Array): AllowedImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && png.every((byte, index) => bytes[index] === byte)) {
    return 'image/png';
  }
  if (bytes.length >= 12) {
    const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (riff === 'RIFF' && webp === 'WEBP') return 'image/webp';
  }
  return null;
}

/** Relative, storage-internal path: YYYY/MM/<uuid>.<ext>. Never derived from user input. */
function buildRelativePath(type: AllowedImageType): string {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}/${month}/${randomUUID()}.${ALLOWED_IMAGE_TYPES[type]}`;
}

export async function storeImage(
  bytes: Uint8Array,
  type: AllowedImageType,
): Promise<{ relativePath: string; absolutePath: string }> {
  const root = ensureUploadDir();
  const relativePath = buildRelativePath(type);
  const absolutePath = path.join(root, relativePath);
  await fsp.mkdir(path.dirname(absolutePath), { recursive: true });
  await fsp.writeFile(absolutePath, bytes, { flag: 'wx' });
  return { relativePath, absolutePath };
}

const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;

/**
 * Maps a stored relative path back to an absolute one, rejecting traversal,
 * absolute paths, and anything that escapes the upload root.
 */
export function resolveStoredPath(relativePath: string): string | null {
  if (typeof relativePath !== 'string' || relativePath.length === 0) return null;
  if (relativePath.length > 300) return null;
  if (relativePath.includes('\0') || relativePath.includes('\\')) return null;
  if (relativePath.startsWith('/')) return null;

  const segments = relativePath.split('/').filter((segment) => segment.length > 0);
  if (segments.length === 0 || segments.length > 6) return null;
  for (const segment of segments) {
    if (segment === '.' || segment === '..') return null;
    if (!SAFE_SEGMENT.test(segment)) return null;
  }

  const root = resolveUploadDir();
  const absolute = path.resolve(root, segments.join('/'));
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (!absolute.startsWith(prefix)) return null;
  return absolute;
}

export function contentTypeForPath(relativePath: string): string {
  const extension = path.extname(relativePath).toLowerCase();
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.png') return 'image/png';
  if (extension === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

export async function deleteStoredFile(relativePath: string): Promise<boolean> {
  const absolute = resolveStoredPath(relativePath);
  if (!absolute) return false;
  try {
    await fsp.unlink(absolute);
    return true;
  } catch {
    return false;
  }
}

export function publicUrlFor(relativePath: string): string {
  return `/media/${relativePath}`;
}
