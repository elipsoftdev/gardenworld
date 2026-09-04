import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import Database from 'better-sqlite3';
import { after, before, describe, test } from 'node:test';

import { makeTempDir, removeDir } from '../helpers/tmp';

const PORT = Number(process.env.TEST_PORT ?? 3399);
const BASE = `http://127.0.0.1:${PORT}`;
const SUPER_ADMIN = { email: 'super@gardenworld.test', password: 'Super-Admin-2026' };
const ADMIN = { email: 'admin@gardenworld.test', password: 'Admin-Client-2026' };

let server: ChildProcess;
let workDir: string;
let databasePath: string;
let uploadDir: string;

type ApiResponse = { status: number; body: any; headers: Headers };

async function api(
  pathname: string,
  options: { method?: string; body?: unknown; cookie?: string; origin?: string | null; raw?: BodyInit } = {},
): Promise<ApiResponse> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (options.cookie) headers.cookie = options.cookie;
  if (options.origin !== null) headers.origin = options.origin ?? BASE;

  const response = await fetch(`${BASE}${pathname}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.raw ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
    redirect: 'manual',
  });

  const text = await response.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // Non-JSON responses (media files) are returned as raw text.
  }
  return { status: response.status, body, headers: response.headers };
}

function cookieFrom(response: ApiResponse): string {
  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie, 'expected a Set-Cookie header');
  return setCookie.split(';')[0];
}

async function login(credentials: { email: string; password: string }): Promise<string> {
  const response = await api('/api/auth/login/', { method: 'POST', body: credentials });
  assert.equal(response.status, 200, `login failed: ${JSON.stringify(response.body)}`);
  return cookieFrom(response);
}

function openDatabase() {
  return new Database(databasePath);
}

async function waitForServer(timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/api/health/`);
      if (response.ok) return;
    } catch {
      // Server not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error('Next server did not become ready in time');
}

let superCookie: string;
let adminCookie: string;
let categoryId: number;
let productId: number;

before(async () => {
  workDir = makeTempDir('api');
  databasePath = path.join(workDir, 'api.db');
  uploadDir = path.join(workDir, 'uploads');

  server = spawn(
    process.execPath,
    [path.join('node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', String(PORT)],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        SITE_ENV: 'development',
        SITE_URL: BASE,
        DATABASE_PATH: databasePath,
        UPLOAD_DIR: uploadDir,
        BOOTSTRAP_SUPERADMIN_NAME: 'Elipsoft',
        BOOTSTRAP_SUPERADMIN_EMAIL: SUPER_ADMIN.email,
        BOOTSTRAP_SUPERADMIN_PASSWORD: SUPER_ADMIN.password,
        NEXT_TELEMETRY_DISABLED: '1',
      },
      stdio: 'ignore',
    },
  );

  await waitForServer();
  superCookie = await login(SUPER_ADMIN);
});

after(async () => {
  server?.kill();
  await new Promise((resolve) => setTimeout(resolve, 300));
  removeDir(workDir);
});

describe('health', () => {
  test('reports the development environment', async () => {
    const response = await api('/api/health/');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { ok: true, environment: 'development' });
  });
});

describe('authentication', () => {
  test('rejects wrong credentials with a generic message', async () => {
    const wrongPassword = await api('/api/auth/login/', {
      method: 'POST',
      body: { email: SUPER_ADMIN.email, password: 'not-the-password' },
    });
    const unknownEmail = await api('/api/auth/login/', {
      method: 'POST',
      body: { email: 'nobody@gardenworld.test', password: 'not-the-password' },
    });

    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownEmail.status, 401);
    assert.equal(wrongPassword.body.error.message, unknownEmail.body.error.message);
    assert.equal(wrongPassword.headers.get('set-cookie'), null);
  });

  test('issues an HttpOnly session cookie on success', async () => {
    const response = await api('/api/auth/login/', { method: 'POST', body: SUPER_ADMIN });
    const setCookie = response.headers.get('set-cookie') ?? '';
    assert.equal(response.status, 200);
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Lax/);
    assert.match(setCookie, /Path=\//);
    assert.equal(response.body.data.user.role, 'super_admin');
    assert.equal('passwordHash' in response.body.data.user, false);
  });

  test('stores only a token hash, never the raw token', () => {
    const db = openDatabase();
    const rows = db.prepare('SELECT token_hash FROM sessions').all() as { token_hash: string }[];
    db.close();
    const rawToken = superCookie.split('=')[1];
    assert.ok(rows.length > 0);
    for (const row of rows) {
      assert.match(row.token_hash, /^[0-9a-f]{64}$/);
      assert.notEqual(row.token_hash, decodeURIComponent(rawToken));
    }
  });

  test('/api/auth/me needs a session', async () => {
    const anonymous = await api('/api/auth/me/');
    assert.equal(anonymous.status, 401);

    const authenticated = await api('/api/auth/me/', { cookie: superCookie });
    assert.equal(authenticated.status, 200);
    assert.equal(authenticated.body.data.user.email, SUPER_ADMIN.email);
    assert.equal(authenticated.body.data.user.mustChangePassword, true);
  });

  test('logout invalidates the session server-side', async () => {
    const cookie = await login(SUPER_ADMIN);
    const loggedOut = await api('/api/auth/logout/', { method: 'POST', cookie });
    assert.equal(loggedOut.status, 200);

    const afterLogout = await api('/api/auth/me/', { cookie });
    assert.equal(afterLogout.status, 401);
  });

  test('expired sessions are refused and cleaned up', async () => {
    const cookie = await login(SUPER_ADMIN);
    const db = openDatabase();
    db.prepare("UPDATE sessions SET expires_at = '2000-01-01T00:00:00.000Z'").run();
    db.close();

    const response = await api('/api/auth/me/', { cookie });
    assert.equal(response.status, 401);

    superCookie = await login(SUPER_ADMIN);
  });

  test('rejects cross-origin mutations', async () => {
    const response = await api('/api/auth/login/', {
      method: 'POST',
      body: SUPER_ADMIN,
      origin: 'https://evil.example',
    });
    assert.equal(response.status, 403);
  });
});

describe('users and authorization', () => {
  test('super admin creates an admin account', async () => {
    const response = await api('/api/admin/users/', {
      method: 'POST',
      cookie: superCookie,
      body: { name: 'Cliente Garden World', email: ADMIN.email, password: ADMIN.password },
    });
    assert.equal(response.status, 201, JSON.stringify(response.body));
    assert.equal(response.body.data.user.role, 'admin');

    adminCookie = await login(ADMIN);
  });

  test('admin accounts cannot reach the users API', async () => {
    const list = await api('/api/admin/users/', { cookie: adminCookie });
    assert.equal(list.status, 403);

    const create = await api('/api/admin/users/', {
      method: 'POST',
      cookie: adminCookie,
      body: { name: 'Sneaky', email: 'sneaky@gardenworld.test', password: 'Sneaky-Pass-1' },
    });
    assert.equal(create.status, 403);
  });

  test('nobody can mint a super admin through the API', async () => {
    const response = await api('/api/admin/users/', {
      method: 'POST',
      cookie: superCookie,
      body: {
        name: 'Escalation',
        email: 'escalation@gardenworld.test',
        password: 'Escalation-1234',
        role: 'super_admin',
      },
    });
    assert.equal(response.status, 403);
  });

  test('role escalation through the update endpoint is refused', async () => {
    const db = openDatabase();
    const admin = db.prepare('SELECT id FROM users WHERE email = ?').get(ADMIN.email) as { id: number };
    db.close();

    const byAdmin = await api(`/api/admin/users/${admin.id}/`, {
      method: 'PUT',
      cookie: adminCookie,
      body: { role: 'super_admin' },
    });
    assert.equal(byAdmin.status, 403);

    const bySuperAdmin = await api(`/api/admin/users/${admin.id}/`, {
      method: 'PUT',
      cookie: superCookie,
      body: { role: 'super_admin' },
    });
    assert.equal(bySuperAdmin.status, 403);
  });

  test('the last active super admin cannot be deactivated', async () => {
    const db = openDatabase();
    const superUser = db.prepare('SELECT id FROM users WHERE email = ?').get(SUPER_ADMIN.email) as {
      id: number;
    };
    db.close();

    const response = await api(`/api/admin/users/${superUser.id}/`, {
      method: 'PUT',
      cookie: superCookie,
      body: { active: false },
    });
    assert.equal(response.status, 409);
  });

  test('admin endpoints require a session', async () => {
    for (const pathname of [
      '/api/admin/products/',
      '/api/admin/categories/',
      '/api/admin/home/sections/',
      '/api/admin/uploads/',
      '/api/admin/audit/',
    ]) {
      const response = await api(pathname);
      assert.equal(response.status, 401, `${pathname} should require auth`);
    }
  });

  test('bulk ordering endpoints require a session too', async () => {
    for (const pathname of [
      '/api/admin/products/featured/order/',
      '/api/admin/products/offers/order/',
      '/api/admin/products/new-arrivals/order/',
      '/api/admin/categories/order/',
      '/api/admin/home/sections/order/',
    ]) {
      const response = await api(pathname, { method: 'PUT', body: { ids: [], sectionKeys: [] } });
      assert.equal(response.status, 401, `${pathname} should require auth`);
    }
  });
});

describe('categories', () => {
  test('admin creates a category with a generated slug', async () => {
    const response = await api('/api/admin/categories/', {
      method: 'POST',
      cookie: adminCookie,
      body: { name: 'Riego', published: true, showOnHome: true, showInMenu: true },
    });
    assert.equal(response.status, 201, JSON.stringify(response.body));
    assert.equal(response.body.data.category.slug, 'riego');
    assert.equal(response.body.data.category.indexable, true);
    categoryId = response.body.data.category.id;
  });

  test('rejects a duplicate slug', async () => {
    const response = await api('/api/admin/categories/', {
      method: 'POST',
      cookie: adminCookie,
      body: { name: 'Riego duplicado', slug: 'riego' },
    });
    assert.equal(response.status, 422);
    assert.equal(response.body.error.details.slug, 'Slug already in use');
  });

  test('supports a parent category and refuses cycles', async () => {
    const child = await api('/api/admin/categories/', {
      method: 'POST',
      cookie: adminCookie,
      body: { name: 'Porta mangueras', parentId: categoryId, published: true },
    });
    assert.equal(child.status, 201);
    assert.equal(child.body.data.category.parentId, categoryId);

    const cycle = await api(`/api/admin/categories/${categoryId}/`, {
      method: 'PUT',
      cookie: adminCookie,
      body: { parentId: child.body.data.category.id },
    });
    assert.equal(cycle.status, 422);
    assert.equal(cycle.body.error.details.parentId, 'Would create a category cycle');

    const selfParent = await api(`/api/admin/categories/${categoryId}/`, {
      method: 'PUT',
      cookie: adminCookie,
      body: { parentId: categoryId },
    });
    assert.equal(selfParent.status, 422);
  });

  test('reorders categories in bulk', async () => {
    const list = await api('/api/admin/categories/', { cookie: adminCookie });
    const ids = list.body.data.categories.map((category: { id: number }) => category.id).reverse();

    const response = await api('/api/admin/categories/order/', {
      method: 'PUT',
      cookie: adminCookie,
      body: { ids },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.data.categories.map((category: { id: number }) => category.id),
      ids,
    );
  });
});

describe('products', () => {
  test('creates a draft product', async () => {
    const response = await api('/api/admin/products/', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        name: 'Base Premium Silver',
        categoryId,
        price: 0,
        currency: 'USD',
        shortDescription: 'Placeholder used by the automated test suite',
      },
    });
    assert.equal(response.status, 201, JSON.stringify(response.body));
    assert.equal(response.body.data.product.status, 'draft');
    assert.equal(response.body.data.product.published, false);
    assert.equal(response.body.data.product.slug, 'base-premium-silver');
    productId = response.body.data.product.id;
  });

  test('rejects a duplicate slug, a negative price and an unknown category', async () => {
    const duplicate = await api('/api/admin/products/', {
      method: 'POST',
      cookie: adminCookie,
      body: { name: 'Otra base', slug: 'base-premium-silver', price: 10 },
    });
    assert.equal(duplicate.status, 422);
    assert.equal(duplicate.body.error.details.slug, 'Slug already in use');

    const negativePrice = await api('/api/admin/products/', {
      method: 'POST',
      cookie: adminCookie,
      body: { name: 'Precio invalido', price: -1 },
    });
    assert.equal(negativePrice.status, 422);
    assert.ok(negativePrice.body.error.details.price);

    const badCategory = await api('/api/admin/products/', {
      method: 'POST',
      cookie: adminCookie,
      body: { name: 'Categoria invalida', price: 1, categoryId: 999999 },
    });
    assert.equal(badCategory.status, 422);
    assert.equal(badCategory.body.error.details.categoryId, 'Category does not exist');
  });

  test('refuses an incoherent sale price', async () => {
    const response = await api(`/api/admin/products/${productId}/`, {
      method: 'PUT',
      cookie: adminCookie,
      body: { price: 100, compareAtPrice: 50, onSale: true },
    });
    assert.equal(response.status, 422);
  });

  test('publishes, features and puts the product on sale', async () => {
    const response = await api(`/api/admin/products/${productId}/`, {
      method: 'PUT',
      cookie: adminCookie,
      body: {
        status: 'published',
        published: true,
        price: 80,
        compareAtPrice: 100,
        onSale: true,
        featured: true,
        newArrival: true,
      },
    });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.body.data.product.published, true);
    assert.equal(response.body.data.product.featured, true);
    assert.equal(response.body.data.product.onSale, true);
  });

  test('reads back the product with its images and specs', async () => {
    const response = await api(`/api/admin/products/${productId}/`, { cookie: adminCookie });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.product.id, productId);
    assert.ok(Array.isArray(response.body.data.images));
    assert.ok(Array.isArray(response.body.data.specs));
  });

  test('manages specifications with an explicit order', async () => {
    const first = await api(`/api/admin/products/${productId}/specs/`, {
      method: 'POST',
      cookie: adminCookie,
      body: { name: 'Material', value: 'Acero inoxidable 304' },
    });
    const second = await api(`/api/admin/products/${productId}/specs/`, {
      method: 'POST',
      cookie: adminCookie,
      body: { name: 'Espesor', value: '3 mm' },
    });
    assert.equal(first.status, 201);
    assert.equal(second.status, 201);

    const reordered = await api(`/api/admin/products/${productId}/specs/order/`, {
      method: 'PUT',
      cookie: adminCookie,
      body: { ids: [second.body.data.spec.id, first.body.data.spec.id] },
    });
    assert.equal(reordered.status, 200);
    assert.deepEqual(
      reordered.body.data.specs.map((spec: { name: string }) => spec.name),
      ['Espesor', 'Material'],
    );
  });

  test('orders the curated home lists in bulk', async () => {
    const second = await api('/api/admin/products/', {
      method: 'POST',
      cookie: adminCookie,
      body: { name: 'Base Black', price: 90, categoryId, status: 'published', published: true },
    });
    assert.equal(second.status, 201);
    const secondId = second.body.data.product.id;

    for (const pathname of [
      '/api/admin/products/featured/order/',
      '/api/admin/products/offers/order/',
      '/api/admin/products/new-arrivals/order/',
    ]) {
      const response = await api(pathname, {
        method: 'PUT',
        cookie: adminCookie,
        body: { ids: [secondId, productId] },
      });
      assert.equal(response.status, 200, `${pathname} -> ${JSON.stringify(response.body)}`);
      assert.deepEqual(response.body.data.ids, [secondId, productId]);
    }

    // The bulk order endpoints also flag the products, so restore the sale state.
    await api(`/api/admin/products/${secondId}/`, {
      method: 'PUT',
      cookie: adminCookie,
      body: { onSale: false, compareAtPrice: null },
    });
  });

  test('archives the product instead of deleting the row', async () => {
    const disposable = await api('/api/admin/products/', {
      method: 'POST',
      cookie: adminCookie,
      body: { name: 'Producto descartable', price: 5 },
    });
    const disposableId = disposable.body.data.product.id;

    const removed = await api(`/api/admin/products/${disposableId}/`, {
      method: 'DELETE',
      cookie: adminCookie,
    });
    assert.equal(removed.status, 200);
    assert.equal(removed.body.data.product.status, 'archived');

    const db = openDatabase();
    const row = db.prepare('SELECT status, deleted_at FROM products WHERE id = ?').get(disposableId) as {
      status: string;
      deleted_at: string | null;
    };
    db.close();
    assert.equal(row.status, 'archived');
    assert.ok(row.deleted_at);

    const afterDelete = await api(`/api/admin/products/${disposableId}/`, { cookie: adminCookie });
    assert.equal(afterDelete.status, 404);
  });
});

describe('home sections', () => {
  test('lists the four structural sections', async () => {
    const response = await api('/api/admin/home/sections/', { cookie: adminCookie });
    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.data.sections.map((section: { sectionKey: string }) => section.sectionKey).sort(),
      ['categories', 'featured', 'new_arrivals', 'offers'],
    );
  });

  test('updates a single section', async () => {
    const response = await api('/api/admin/home/sections/featured/', {
      method: 'PUT',
      cookie: adminCookie,
      body: { title: 'Lo mas buscado', subtitle: 'Seleccion del equipo', enabled: true },
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.section.title, 'Lo mas buscado');
  });

  test('reorders sections independently of the cards inside them', async () => {
    const response = await api('/api/admin/home/sections/order/', {
      method: 'PUT',
      cookie: adminCookie,
      body: { sectionKeys: ['offers', 'featured', 'categories', 'new_arrivals'] },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.data.sections.map((section: { sectionKey: string }) => section.sectionKey),
      ['offers', 'featured', 'categories', 'new_arrivals'],
    );
  });
});

describe('uploads', () => {
  const PNG_BYTES = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ]);
  let uploadedPath: string;

  function form(bytes: Uint8Array, filename: string, type: string): FormData {
    const data = new FormData();
    data.append('file', new Blob([bytes as unknown as BlobPart], { type }), filename);
    return data;
  }

  test('accepts a real image and serves it back from /media', async () => {
    const response = await api('/api/admin/uploads/', {
      method: 'POST',
      cookie: adminCookie,
      raw: form(PNG_BYTES, 'photo.png', 'image/png'),
    });
    assert.equal(response.status, 201, JSON.stringify(response.body));
    uploadedPath = response.body.data.upload.path;
    assert.match(uploadedPath, /^\d{4}\/\d{2}\/[0-9a-f-]{36}\.png$/);

    const media = await fetch(`${BASE}${response.body.data.upload.url}`);
    assert.equal(media.status, 200);
    assert.equal(media.headers.get('content-type'), 'image/png');
    assert.equal(media.headers.get('x-content-type-options'), 'nosniff');
  });

  test('rejects a payload whose bytes are not an allowed image', async () => {
    const response = await api('/api/admin/uploads/', {
      method: 'POST',
      cookie: adminCookie,
      raw: form(new TextEncoder().encode('<?php system($_GET[0]); ?>'), 'shell.php.png', 'image/png'),
    });
    assert.equal(response.status, 415);
  });

  test('rejects an empty file and an oversized one', async () => {
    const empty = await api('/api/admin/uploads/', {
      method: 'POST',
      cookie: adminCookie,
      raw: form(new Uint8Array(0), 'empty.png', 'image/png'),
    });
    assert.equal(empty.status, 422);

    const oversized = new Uint8Array(6 * 1024 * 1024);
    oversized.set(PNG_BYTES, 0);
    const tooBig = await api('/api/admin/uploads/', {
      method: 'POST',
      cookie: adminCookie,
      raw: form(oversized, 'big.png', 'image/png'),
    });
    assert.equal(tooBig.status, 413);
  });

  test('requires authentication', async () => {
    const response = await api('/api/admin/uploads/', {
      method: 'POST',
      raw: form(PNG_BYTES, 'photo.png', 'image/png'),
    });
    assert.equal(response.status, 401);
  });

  test('refuses path traversal through /media', async () => {
    for (const suffix of [
      '/media/../../package.json',
      '/media/..%2f..%2fpackage.json',
      '/media/2026/../../../package.json',
    ]) {
      const response = await fetch(`${BASE}${suffix}`, { redirect: 'manual' });
      assert.notEqual(response.status, 200, `${suffix} must not be served`);
    }
  });

  test('attaches the upload to a product and blocks deleting a referenced file', async () => {
    const attached = await api(`/api/admin/products/${productId}/images/`, {
      method: 'POST',
      cookie: adminCookie,
      body: { path: uploadedPath, altText: 'Imagen de prueba' },
    });
    assert.equal(attached.status, 201, JSON.stringify(attached.body));

    const db = openDatabase();
    const upload = db.prepare('SELECT id FROM uploads WHERE path = ?').get(uploadedPath) as { id: number };
    db.close();

    const blocked = await api(`/api/admin/uploads/${upload.id}/`, {
      method: 'DELETE',
      cookie: adminCookie,
    });
    assert.equal(blocked.status, 409);
  });

  test('rejects an unknown upload path as a product image', async () => {
    const response = await api(`/api/admin/products/${productId}/images/`, {
      method: 'POST',
      cookie: adminCookie,
      body: { path: '../../etc/passwd' },
    });
    assert.equal(response.status, 422);
  });
});

describe('audit trail', () => {
  test('records mutations and hides the log from non super admins', async () => {
    const forbidden = await api('/api/admin/audit/', { cookie: adminCookie });
    assert.equal(forbidden.status, 403);

    const response = await api('/api/admin/audit/?limit=200', { cookie: superCookie });
    assert.equal(response.status, 200);

    assert.equal(response.body.ok, true);
    const entries = response.body.data.entries as { action: string; details: unknown }[];
    const recorded = new Set(entries.map((entry) => entry.action));

    for (const expected of [
      'auth.login',
      'user.create',
      'category.create',
      'product.create',
      'product.publish',
      'product.price_change',
      'upload.create',
    ]) {
      assert.equal(recorded.has(expected), true, `missing audit action: ${expected}`);
    }

    const serialized = JSON.stringify(entries);
    assert.equal(serialized.includes(ADMIN.password), false);
    assert.equal(serialized.includes(SUPER_ADMIN.password), false);
  });
});

describe('public catalog', () => {
  test('lists only published products', async () => {
    const response = await api('/api/catalog/products/', { origin: null });
    assert.equal(response.status, 200);

    const slugs = response.body.data.products.map((product: { slug: string }) => product.slug);
    assert.ok(slugs.includes('base-premium-silver'));
    assert.equal(slugs.includes('producto-descartable'), false);

    for (const product of response.body.data.products) {
      assert.equal('deletedAt' in product, false);
      assert.equal('stockQuantity' in product, false);
    }
  });

  test('returns a single published product by slug and 404 for a draft one', async () => {
    const published = await api('/api/catalog/products/base-premium-silver/');
    assert.equal(published.status, 200);
    assert.equal(published.body.data.product.specs.length, 2);

    const draft = await api('/api/admin/products/', {
      method: 'POST',
      cookie: adminCookie,
      body: { name: 'Borrador oculto', price: 1 },
    });
    assert.equal(draft.status, 201);

    const hidden = await api(`/api/catalog/products/${draft.body.data.product.slug}/`);
    assert.equal(hidden.status, 404);
  });

  test('exposes published categories only', async () => {
    const response = await api('/api/catalog/categories/');
    assert.equal(response.status, 200);
    const slugs = response.body.data.categories.map((category: { slug: string }) => category.slug);
    assert.ok(slugs.includes('riego'));
  });

  test('home respects section order and the enabled flag', async () => {
    const before = await api('/api/catalog/home/');
    assert.equal(before.status, 200);
    assert.deepEqual(
      before.body.data.sections.map((section: { sectionKey: string }) => section.sectionKey),
      ['offers', 'featured', 'categories', 'new_arrivals'],
    );

    const featured = before.body.data.sections.find(
      (section: { sectionKey: string }) => section.sectionKey === 'featured',
    );
    assert.ok(featured.items.length > 0);

    await api('/api/admin/home/sections/offers/', {
      method: 'PUT',
      cookie: adminCookie,
      body: { enabled: false },
    });

    const after = await api('/api/catalog/home/');
    assert.deepEqual(
      after.body.data.sections.map((section: { sectionKey: string }) => section.sectionKey),
      ['featured', 'categories', 'new_arrivals'],
    );

    await api('/api/admin/home/sections/offers/', {
      method: 'PUT',
      cookie: adminCookie,
      body: { enabled: true },
    });
  });

  test('public endpoints need no session', async () => {
    for (const pathname of [
      '/api/catalog/products/',
      '/api/catalog/categories/',
      '/api/catalog/home/',
    ]) {
      const response = await api(pathname, { origin: null });
      assert.equal(response.status, 200, pathname);
    }
  });
});

describe('password change', () => {
  test('clears the must-change flag and keeps the current session alive', async () => {
    const cookie = await login(ADMIN);
    const newPassword = 'Admin-Rotated-2026';

    const wrongCurrent = await api('/api/auth/change-password/', {
      method: 'POST',
      cookie,
      body: { currentPassword: 'wrong', newPassword },
    });
    assert.equal(wrongCurrent.status, 401);

    const weak = await api('/api/auth/change-password/', {
      method: 'POST',
      cookie,
      body: { currentPassword: ADMIN.password, newPassword: 'short' },
    });
    assert.equal(weak.status, 422);

    const changed = await api('/api/auth/change-password/', {
      method: 'POST',
      cookie,
      body: { currentPassword: ADMIN.password, newPassword },
    });
    assert.equal(changed.status, 200);

    const me = await api('/api/auth/me/', { cookie });
    assert.equal(me.status, 200);
    assert.equal(me.body.data.user.mustChangePassword, false);

    const oldSession = await api('/api/auth/me/', { cookie: adminCookie });
    assert.equal(oldSession.status, 401);

    adminCookie = await login({ email: ADMIN.email, password: newPassword });
  });
});

describe('public pages still render', () => {
  test('serves dynamic public routes and SEO files', async () => {
    for (const pathname of ['/', '/productos/', '/productos/base-premium-silver/', '/productos/categoria/riego/', '/nosotros/', '/robots.txt', '/sitemap.xml']) {
      const response = await fetch(`${BASE}${pathname}`);
      assert.equal(response.status, 200, pathname);
    }

    const home = await (await fetch(`${BASE}/`)).text();
    assert.match(home, /data-section-key="offers"/);
    assert.doesNotMatch(home, /Producto borrador/);

    const catalog = await (await fetch(`${BASE}/productos/`)).text();
    assert.match(catalog, /Base Premium Silver/);
    assert.doesNotMatch(catalog, /Borrador oculto/);

    const product = await (await fetch(`${BASE}/productos/base-premium-silver/`)).text();
    assert.match(product, /Hola%20Garden%20World%2C%20estoy%20interesado%20en%20Base%20Premium%20Silver/);
    assert.match(product, /BreadcrumbList/);
    assert.match(product, /name="robots" content="noindex, nofollow"/);
    assert.doesNotMatch(product, /rel="canonical"/);

    const about = await (await fetch(`${BASE}/nosotros/`)).text();
    assert.match(about, /Diseñamos para que el exterior/);

    assert.equal((await fetch(`${BASE}/productos/no-existe/`)).status, 404);
    assert.equal((await fetch(`${BASE}/productos/categoria/no-existe/`)).status, 404);

    const robots = await (await fetch(`${BASE}/robots.txt`)).text();
    assert.match(robots, /Disallow: \//);
    const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
    assert.doesNotMatch(sitemap, /gardenworld\.online/);
  });
});
