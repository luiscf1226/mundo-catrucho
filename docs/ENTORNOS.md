# Entornos y secretos (MC-64, MC-65)

Tres entornos separados. Cada uno tiene su propio Convex, su propia sala y su propio `SALA_SECRETO`; nada se
comparte entre ellos. Las variables están todas en [`.env.example`](../.env.example), con dónde vive cada una.

| | Desarrollo | Vista previa | Producción |
|---|---|---|---|
| Para qué | Tu máquina, `pnpm dev` | Cada pull request | El juego publicado (push a `main`) |
| Convex | `dev:…` de cada quien (`npx convex dev`) | Un Convex de vista previa **por rama** (llave de vista previa) | El Convex de producción de `mundo-catrucho` |
| Sala (Cloudflare) | `wrangler dev` local, puerto 8799 | Worker `mundo-catrucho-salas-preview` | Worker `mundo-catrucho-salas` |
| Juego | Vite en `localhost:5173` | Host elegido, sin `--prod` / `--env preview` | Host elegido, producción |
| Clerk (MC-07) | Instancia de desarrollo (`pk_test_…`) | La misma de desarrollo | Instancia de producción (`pk_live_…`) |
| Llaves | `.env.local`, `workers/salas/.dev.vars` | Entorno `preview` de GitHub | Entorno `production` de GitHub |

El flujo [`despliegue.yml`](../.github/workflows/despliegue.yml) publica en este orden: sala → Convex (que compila el
juego con su propia URL en `VITE_CONVEX_URL`) → juego. Si falta una llave, ese paso se salta con un aviso y el flujo
queda en verde. A mano: Actions → Despliegue → Run workflow → `preview` o `production`.

## Dónde va cada llave

**Nunca en el código.** `.env*` (menos `.env.example`) y `.dev.vars` están ignorados por git.

| Llave | Dónde | Cómo |
|---|---|---|
| `CONVEX_DEPLOY_KEY` | GitHub, entornos `preview` (llave de vista previa) y `production` (llave de producción) | Panel de Convex → proyecto → Settings → Deploy keys |
| `SALA_SECRETO` | Convex **y** Cloudflare del mismo entorno, igual en los dos | `npx convex env set SALA_SECRETO … --prod` · `wrangler secret put SALA_SECRETO --env production` |
| `SALA_SECRETO` (vista previa) | Variables por defecto de vista previa en Convex **y** el Worker de vista previa | Panel de Convex → Settings → Environment variables → Preview · `wrangler secret put SALA_SECRETO --env preview` |
| `PANEL_LLAVE` | Convex de cada entorno | `npx convex env set PANEL_LLAVE …` |
| `CLOUDFLARE_API_TOKEN` | GitHub, los dos entornos | Cloudflare → My Profile → API Tokens, plantilla «Edit Cloudflare Workers» |
| `VERCEL_TOKEN` | GitHub, los dos entornos (solo si se elige Vercel) | Vercel → Account Settings → Tokens |
| `CLERK_SECRET_KEY` | Clerk / Convex cuando llegue MC-07 | Panel de Clerk |

Variables de GitHub (no secretas), por entorno: `VITE_SALAS_URL` (`wss://…` de la sala de ese entorno) y
`CONVEX_SITE_URL` (`https://….convex.site` de ese entorno; en vista previa se puede dejar vacía). De repositorio:
`HOST_WEB`, `CLOUDFLARE_ACCOUNT_ID`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

## Host del juego: Cloudflare o Vercel

Todavía no está elegido. Las dos opciones quedan listas; se elige con la variable de repositorio `HOST_WEB`.
El juego compilado (`pnpm --filter @mundo-catrucho/web build:web` → `apps/web/dist/web`) es estático: cualquiera de
los dos lo sirve igual.

**Cloudflare** (`apps/web/wrangler.toml`, Worker solo de archivos estáticos)

- Todo en una cuenta: la sala ya es un Durable Object de Cloudflare, así que el juego y la sala comparten dominio,
  token y facturación. Un solo `CLOUDFLARE_API_TOKEN`.
- Archivos estáticos gratis y sin límite de ancho de banda en el plan gratis.
- Vista previa: Worker `mundo-catrucho-web-preview` (una sola vista previa a la vez, la del último PR).
- Falta: `HOST_WEB=cloudflare`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

**Vercel** (`apps/web/vercel.json`, se sube ya compilado con `--prebuilt`)

- Una URL de vista previa distinta por cada despliegue y comentarios sobre la vista previa.
- Integración oficial con Convex y Clerk desde su panel.
- Dos proveedores en vez de uno: la sala sigue en Cloudflare igual. El plan gratis (Hobby) no permite uso comercial
  y limita el ancho de banda (100 GB al mes).
- Falta: crear el proyecto con raíz `apps/web` (`vercel link`), `HOST_WEB=vercel`, `VERCEL_TOKEN`,
  `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. `vercel.json` apaga los despliegues por Git de Vercel para que solo publique
  `despliegue.yml`; si preferís que Vercel compile solo, quitá `"github": { "enabled": false }`.

## Proteger `main` (MC-64)

`main` solo acepta cambios por pull request y con la revisión «check, test y capturas» en verde. Lo activa el dueño
del repo una vez (los agentes no tienen permiso de administración):

```bash
gh auth login
bash scripts/proteger-main.sh
```

O a mano: Settings → Branches → Add rule → `main` → «Require a pull request before merging» y «Require status
checks to pass» con `check, test y capturas`.

## Primera vez en producción (checklist)

1. `npx convex login` y en el panel de Convex sacá la llave de producción y la de vista previa.
2. Generá dos `SALA_SECRETO` distintos (preview y producción) y cargalos en Convex y Cloudflare (tabla de arriba).
3. `cd workers/salas && pnpm exec wrangler login && pnpm run deploy:production` (o dejá que lo haga el flujo).
4. Cargá en GitHub los secretos y variables de cada entorno.
5. Elegí `HOST_WEB` y corré Actions → Despliegue → `production`.
