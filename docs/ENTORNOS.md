# Entornos y secretos (MC-64, MC-65)

Tres entornos separados. Cada uno tiene su propio Convex, su propia sala y su propio `SALA_SECRETO`; nada se
comparte entre ellos. Las variables están todas en [`.env.example`](../.env.example), con dónde vive cada una.

| | Desarrollo | Vista previa | Producción |
|---|---|---|---|
| Para qué | Tu máquina, `pnpm dev` | Cada pull request | El juego publicado (push a `main`) |
| Convex | `dev:…` de cada quien (`npx convex dev`) | Un Convex de vista previa **por rama** (llave de vista previa) | El Convex de producción de `mundo-catrucho` |
| Sala (Cloudflare) | `wrangler dev` local, puerto 8799 | Worker `mundo-catrucho-salas-preview` | Worker `mundo-catrucho-salas` |
| Juego (Cloudflare) | Vite en `localhost:5173` | Worker `mundo-catrucho-web-preview` | Worker `mundo-catrucho-web` |
| Clerk (MC-07) | Instancia de desarrollo (`pk_test_…`) | La misma de desarrollo | Instancia de producción (`pk_live_…`) |
| Llaves | `.env.local`, `workers/salas/.dev.vars` | Entorno `preview` de GitHub (o del repo) | Entorno `production` de GitHub (o del repo) |

El flujo [`despliegue.yml`](../.github/workflows/despliegue.yml) publica en este orden: sala → Convex (si hay
`CONVEX_DEPLOY_KEY`) → juego. La dirección de la sala (`VITE_SALAS_URL`) sale sola de la publicación de la sala. Si
falta una llave, ese paso se salta con un aviso y el flujo queda en verde. A mano: Actions → Despliegue → Run
workflow → `preview` o `production`.

## Dónde va cada llave

**Nunca en el código.** `.env*` (menos `.env.example`) y `.dev.vars` están ignorados por git.

| Llave | Dónde | Cómo |
|---|---|---|
| `CONVEX_DEPLOY_KEY` | GitHub, entornos `preview` (llave de vista previa) y `production` (llave de producción) | Panel de Convex → proyecto → Settings → Deploy keys |
| `SALA_SECRETO` | Convex **y** GitHub (entorno `production`), igual en los dos; el flujo lo copia a la sala | `npx convex env set SALA_SECRETO … --prod` · `gh secret set SALA_SECRETO --env production` |
| `SALA_SECRETO` (vista previa) | Variables por defecto de vista previa en Convex **y** GitHub (entorno `preview`) | Panel de Convex → Settings → Environment variables → Preview · `gh secret set SALA_SECRETO --env preview` |
| `PANEL_LLAVE` | Convex de cada entorno | `npx convex env set PANEL_LLAVE …` |
| `CLOUDFLARE_API_TOKEN` | GitHub, secreto del repo (sirve para los dos entornos) | Cloudflare → My Profile → API Tokens, plantilla «Edit Cloudflare Workers» |
| `CLERK_SECRET_KEY` | Clerk / Convex cuando llegue MC-07 | Panel de Clerk |

Variables de GitHub (no secretas), por entorno: `VITE_CONVEX_URL` (`https://….convex.cloud`; solo hace falta si no
hay `CONVEX_DEPLOY_KEY`), `CONVEX_SITE_URL` (`https://….convex.site`; en vista previa se puede dejar vacía) y, si
querés fijarla, `VITE_SALAS_URL`. De repositorio, opcional: `CLOUDFLARE_ACCOUNT_ID` (si el token ve varias cuentas).

## Host del juego: Cloudflare

Decidido por Luis (16 nov): todo vive en Cloudflare, igual que Tuerce. El juego compilado
(`pnpm --filter @mundo-catrucho/web build:web` → `apps/web/dist/web`) es estático y lo sirve un Worker solo de archivos
([`apps/web/wrangler.toml`](../apps/web/wrangler.toml)); la sala es el Durable Object de `workers/salas`. Un solo
token, una cuenta y una factura; los archivos estáticos no cobran ancho de banda. La vista previa del juego es una
sola a la vez (`mundo-catrucho-web-preview`, la del último pull request).

## Proteger `main` (MC-64)

`main` solo acepta cambios por pull request y con la revisión «check, test y capturas» en verde. Lo activa el dueño
del repo una vez.

**Hoy no se puede:** el repo es privado y la cuenta usa el plan gratis de GitHub, que no permite proteger ramas ni
reglas (rulesets) en repos privados (responde 403). Hay dos salidas, las decide Luis:

- Pasar la cuenta a **GitHub Pro** (de pago) y correr el script de abajo.
- Hacer el repo **público** (gratis, pero el código queda a la vista).

Mientras tanto la regla se cumple por costumbre: todo entra por pull request con la revisión en verde (`AGENTS.md`).
Con Pro o repo público:

```bash
gh auth login
bash scripts/proteger-main.sh
```

O a mano: Settings → Branches → Add rule → `main` → «Require a pull request before merging» y «Require status
checks to pass» con `check, test y capturas`.

## Primera vez en producción (checklist)

1. `npx convex login` y en el panel de Convex sacá la llave de producción y la de vista previa.
2. Generá dos `SALA_SECRETO` distintos (preview y producción) y cargalos en Convex y en GitHub (tabla de arriba).
3. Creá el token de Cloudflare (plantilla «Edit Cloudflare Workers») y guardalo: `gh secret set CLOUDFLARE_API_TOKEN`.
4. Cargá en GitHub los secretos y variables de cada entorno.
5. Corré Actions → Despliegue → `production` (o hacé push a `main`).
