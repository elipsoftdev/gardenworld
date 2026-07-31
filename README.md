# GardenWorld — sitio Next.js

Roll up (soporte de manguera, 5 acabados) + consumibles de jardinería.
WhatsApp: **+58 414-3228003** — Atención: **Sr. Héctor Guevara**.

## 🚀 Publicar en GitHub Pages (recomendado — automático)

1. **Crea el repo en GitHub** (público, para que Pages sea gratis). Puede llamarse como quieras, por ejemplo `gardenworld`.

2. **Sube este código**:
   ```bash
   git init
   git add .
   git commit -m "GardenWorld — sitio inicial"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
   git push -u origin main
   ```

3. **Activa GitHub Pages con GitHub Actions**:
   - Ve a tu repo → **Settings** → **Pages**
   - En "Build and deployment" → **Source**, elige **GitHub Actions** (no "Deploy from a branch")
   - Guarda

4. **Listo.** El workflow en `.github/workflows/deploy.yml` ya está incluido. En cuanto hagas push a `main`, GitHub compila el sitio y lo publica solo. Puedes ver el progreso en la pestaña **Actions** del repo.

5. Tu sitio quedará en:
   `https://TU-USUARIO.github.io/TU-REPO/`

   (o en `https://TU-USUARIO.github.io/` si nombraste el repo exactamente `TU-USUARIO.github.io`)

### ¿Por qué no hay que configurar nada manualmente?

`next.config.js` detecta automáticamente el nombre del repo dentro de GitHub Actions (variable `GITHUB_REPOSITORY`) y ajusta el `basePath` solo. No importa cómo llames al repo — funciona igual. Ya lo probé localmente simulando ambos casos (repo normal y repo `usuario.github.io`) antes de entregarlo.

---

## 💻 Desarrollo local

```bash
npm install
npm run dev
```
Abre `http://localhost:3000`

## 🔨 Build de producción (verificar antes de publicar)

```bash
npm run build
```
Genera la carpeta `out/` con el sitio estático. Ya viene verificado — este build corrió sin errores antes de la entrega.

---

## 📁 Qué hay en el proyecto

```
app/
  page.tsx        → toda la página (hero, dial de acabados, catálogo, mayoristas, cotizador, footer)
  layout.tsx       → fuentes (Google Fonts) + metadata SEO
  globals.css      → sistema de diseño completo
public/
  images/          → las 15 fotos de Roll up (5 acabados × 3 recortes cada una)
.github/workflows/
  deploy.yml        → publica solo en cada push a main
```

## ✏️ Cosas para editar antes de publicar en serio

- **Precios**: en `page.tsx`, buscar `USD —` y `por confirmar` — hay que poner los precios reales.
- **Foto "antes"** (manguera enredada en el piso): la sección "Problema/Solución" tiene el "después" con foto real, pero el "antes" es un placeholder de textura. Falta una foto real (una manguera cualquiera tirada en el piso sirve).
- **Fotos de consumibles** (nylon, malla, tutores, grapas): hoy usan el motivo de anillos como placeholder. Cuando llegue el primer lote, se reemplazan por fotos reales en `public/images/` y se actualiza el `src` correspondiente en `page.tsx`.
- **Instagram / redes**: los links del footer están vacíos (`href="#"`), agregar las URLs reales.
- **Descuentos por volumen**: la sección "Mayoristas" tiene la tabla con "Por definir" — falta cerrar los porcentajes.
- **RAL de fábrica**: los RAL que puse (9010, 1019, 8004, 9005) son la aproximación más cercana a las fotos que me diste. Antes de mandar a producción, confírmalos contra la carta RAL física con el proveedor de pintura en polvo.

## 🔧 Cambiar el número de WhatsApp o el contacto

En `app/page.tsx`, buscar `584143228003` (aparece una sola vez, en el `useEffect`). El nombre de contacto ("Sr. Héctor Guevara") está en el footer, sección "Contacto" del JSX.

## 🌐 Dominio propio (opcional)

Si más adelante compran un dominio (ej. `gardenworld.com`):
1. Agregar un archivo `public/CNAME` con el dominio adentro (una sola línea: `gardenworld.com`)
2. Configurar el DNS del dominio apuntando a GitHub Pages (registros A o CNAME según su proveedor)
3. En ese caso, GitHub Pages sirve el sitio en la raíz — no haría falta el `basePath`, pero como ya usamos rutas relativas para las imágenes, funciona igual sin tocar nada.
