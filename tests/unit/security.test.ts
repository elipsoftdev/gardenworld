import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';

import { hashPassword, validatePasswordStrength, verifyPassword } from '@/lib/auth/password';
import { assertSameOrigin, isSecureRequest } from '@/lib/http/origin';
import { consume, reset } from '@/lib/auth/rate-limit';
import {
  detectImageType,
  MAX_UPLOAD_BYTES,
  resolveStoredPath,
  storeImage,
} from '@/lib/uploads/storage';
import { makeTempDir, removeDir } from '../helpers/tmp';

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

describe('password storage', () => {
  test('hashes are salted, prefixed and never contain the plaintext', async () => {
    const hash = await hashPassword('Correct-Horse-9');
    assert.ok(hash.startsWith('scrypt$16384$8$1$'));
    assert.equal(hash.includes('Correct-Horse-9'), false);

    const second = await hashPassword('Correct-Horse-9');
    assert.notEqual(hash, second);
  });

  test('verifies the right password and rejects the wrong one', async () => {
    const hash = await hashPassword('Correct-Horse-9');
    assert.equal(await verifyPassword('Correct-Horse-9', hash), true);
    assert.equal(await verifyPassword('correct-horse-9', hash), false);
    assert.equal(await verifyPassword('', hash), false);
  });

  test('rejects malformed hashes instead of throwing', async () => {
    assert.equal(await verifyPassword('whatever', 'not-a-hash'), false);
    assert.equal(await verifyPassword('whatever', 'scrypt$a$b$c$d$e'), false);
  });

  test('enforces the minimum password policy', () => {
    assert.equal(validatePasswordStrength('short1!'), 'too_short');
    assert.equal(validatePasswordStrength('onlyletterssss'), 'too_simple');
    assert.equal(validatePasswordStrength('Valid-Password-1'), null);
  });
});

describe('origin protection', () => {
  const url = 'http://localhost:3100/api/admin/products';

  test('allows same-origin mutations', () => {
    const request = new Request(url, {
      method: 'POST',
      headers: { origin: 'http://localhost:3100', host: 'localhost:3100' },
    });
    assert.doesNotThrow(() => assertSameOrigin(request));
  });

  test('rejects cross-origin mutations', () => {
    const request = new Request(url, {
      method: 'POST',
      headers: { origin: 'https://evil.example', host: 'localhost:3100' },
    });
    assert.throws(() => assertSameOrigin(request), /Cross-site/);
  });

  test('rejects cross-site fetches that omit Origin', () => {
    const request = new Request(url, {
      method: 'DELETE',
      headers: { host: 'localhost:3100', 'sec-fetch-site': 'cross-site' },
    });
    assert.throws(() => assertSameOrigin(request), /Cross-site/);
  });

  test('never blocks safe methods', () => {
    const request = new Request(url, { headers: { origin: 'https://evil.example' } });
    assert.doesNotThrow(() => assertSameOrigin(request));
  });

  test('detects HTTPS behind a proxy', () => {
    const request = new Request(url, { headers: { 'x-forwarded-proto': 'https,http' } });
    assert.equal(isSecureRequest(request), true);
    assert.equal(isSecureRequest(new Request(url)), false);
  });
});

describe('login rate limiting', () => {
  test('blocks once the window budget is spent', () => {
    reset();
    const key = 'login:test';
    for (let attempt = 0; attempt < 3; attempt += 1) {
      assert.equal(consume(key, 3, 60_000).allowed, true);
    }
    const blocked = consume(key, 3, 60_000);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSeconds > 0);
    reset();
  });
});

describe('upload storage', () => {
  let uploadDir: string;

  before(() => {
    uploadDir = makeTempDir('uploads');
    process.env.UPLOAD_DIR = uploadDir;
  });

  after(() => removeDir(uploadDir));

  test('detects allowed image formats from magic bytes', () => {
    assert.equal(detectImageType(JPEG), 'image/jpeg');
    assert.equal(detectImageType(PNG), 'image/png');
    assert.equal(detectImageType(WEBP), 'image/webp');
  });

  test('rejects non-image payloads regardless of their declared type', () => {
    assert.equal(detectImageType(new TextEncoder().encode('<?php echo 1; ?>')), null);
    assert.equal(detectImageType(new TextEncoder().encode('GIF89a')), null);
    assert.equal(detectImageType(new Uint8Array(0)), null);
  });

  test('stores images under a generated path, ignoring any client name', async () => {
    const { relativePath, absolutePath } = await storeImage(PNG, 'image/png');
    assert.match(relativePath, /^\d{4}\/\d{2}\/[0-9a-f-]{36}\.png$/);
    assert.equal(fs.existsSync(absolutePath), true);
    assert.equal(absolutePath.startsWith(path.resolve(uploadDir)), true);
  });

  test('resolves stored paths only inside the upload root', () => {
    assert.ok(resolveStoredPath('2026/09/abc.png'));
    assert.equal(resolveStoredPath('../../etc/passwd'), null);
    assert.equal(resolveStoredPath('2026/../../secret.png'), null);
    assert.equal(resolveStoredPath('/etc/passwd'), null);
    assert.equal(resolveStoredPath('2026\\09\\abc.png'), null);
    assert.equal(resolveStoredPath('a/b/c/d/e/f/g/h.png'), null);
    assert.equal(resolveStoredPath(''), null);
  });

  test('caps the accepted file size', () => {
    assert.equal(MAX_UPLOAD_BYTES, 5 * 1024 * 1024);
  });
});
