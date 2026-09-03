# Garden World — Backend (Fase 1)

Capa de datos y API sobre el servidor Next.js existente. No incluye UI de
backoffice ni cambios en la web pública.

## Arranque

`getDb()` es el único punto de entrada a la base de datos. En la primera llamada:

1. resuelve `DATABASE_PATH` (fallback `./data/gardenworld-dev.db`) y crea el directorio;
2. aplica los PRAGMAs (`foreign_keys=ON`, `busy_timeout`, WAL con fallback);
3. ejecuta las migraciones pendientes;
4. siembra las secciones estructurales del Home;
5. crea los usuarios bootstrap si las variables están presentes.

Si el archivo desaparece (almacenamiento efímero en `/tmp`), la siguiente llamada
detecta el hueco, reabre y repite el ciclo completo. No hay estado que dependa de
que el filesystem sobreviva a un deploy.

## Dependencia nativa

`better-sqlite3` está fijado a la versión exacta `12.9.0`: es la última que
publica binarios precompilados tanto para Node 20 en Linux (el `NODE_VERSION` del
servicio DEV) como para Node 24 en Windows (desarrollo local). Subir de versión
sin comprobar los prebuilds obliga a Render a compilar con node-gyp en el build.

## Variables de entorno

Ver `.env.example`. Las de bootstrap solo crean la cuenta si no existe ningún
usuario con ese rol; nunca sobrescriben una contraseña ni se escriben en logs.

## Migraciones

`lib/db/migrations.ts` es una lista ordenada y de solo-anexado. Cada entrada se
aplica una vez dentro de una transacción y queda registrada en `schema_migrations`.
Nunca se edita una migración ya aplicada: se agrega una nueva.

## Formato de respuesta

```json
{ "ok": true, "data": { } }
{ "ok": false, "error": { "code": "validation_error", "message": "...", "details": { } } }
```

Códigos: 200, 201, 400, 401, 403, 404, 409, 413, 415, 422, 429, 500.

## Endpoints

### Auth
- `POST /api/auth/login` — rate limit por IP y por email, cookie `gw_session` HttpOnly.
- `POST /api/auth/logout` — invalida la sesión en la base de datos.
- `GET /api/auth/me`
- `POST /api/auth/change-password` — invalida el resto de sesiones del usuario.

### Admin (requiere sesión)
- `GET|POST /api/admin/products`
- `GET|PUT|DELETE /api/admin/products/{id}` — `DELETE` archiva (soft delete).
- `PUT /api/admin/products/featured/order`
- `PUT /api/admin/products/offers/order`
- `PUT /api/admin/products/new-arrivals/order`
- `GET|POST /api/admin/products/{id}/images`
- `PUT|DELETE /api/admin/products/{id}/images/{imageId}`
- `PUT /api/admin/products/{id}/images/order`
- `GET|POST /api/admin/products/{id}/specs`
- `PUT|DELETE /api/admin/products/{id}/specs/{specId}`
- `PUT /api/admin/products/{id}/specs/order`
- `GET|POST /api/admin/categories`
- `GET|PUT|DELETE /api/admin/categories/{id}` — `DELETE` despublica; 409 si tiene hijos o productos activos.
- `PUT /api/admin/categories/order`
- `GET /api/admin/home/sections`
- `PUT /api/admin/home/sections/order`
- `PUT /api/admin/home/sections/{sectionKey}`
- `GET|POST /api/admin/uploads`
- `DELETE /api/admin/uploads/{id}` — 409 si el archivo sigue referenciado.

### Admin — solo super_admin
- `GET|POST /api/admin/users`
- `GET|PUT /api/admin/users/{id}`
- `GET /api/admin/audit`

### Público (sin sesión)
- `GET /api/catalog/products`
- `GET /api/catalog/products/{slug}`
- `GET /api/catalog/categories`
- `GET /api/catalog/categories/{slug}`
- `GET /api/catalog/home`
- `GET /media/{...path}`

Solo devuelven contenido con `status='published'`, `published=1` y `deleted_at IS NULL`.

## Roles

| Acción | super_admin | admin |
| --- | --- | --- |
| Catálogo, categorías, Home, imágenes, orden | sí | sí |
| Uploads | sí | sí |
| Gestión de usuarios | sí | no (403) |
| Auditoría | sí | no (403) |
| Crear un super_admin | no (403 en la API) | no |
| Cambiar roles vía API | no | no |

Un super_admin activo no puede quedarse sin reemplazo: desactivar el último
devuelve 409.

## Uploads

Se acepta JPEG, PNG y WebP, hasta 5 MB, y el tipo se decide por los magic bytes,
nunca por el `Content-Type` declarado. El nombre en disco es `YYYY/MM/<uuid>.<ext>`
y no deriva del nombre del cliente. `/media/...` resuelve la ruta contra
`UPLOAD_DIR` y rechaza cualquier cosa que se salga de ese directorio.

## Pruebas

```bash
npm run test:unit
npm run build && npm run test:api
```

`test:api` levanta `next start` en el puerto 3399 con una base de datos y un
directorio de uploads temporales, por lo que necesita un build previo.
