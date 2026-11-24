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

## Producción hoy

| | Dirección |
|---|---|
| Juego | https://mundo-catrucho-web.luiscf1226.workers.dev |
| Sala en vivo | https://mundo-catrucho-salas.luiscf1226.workers.dev (el juego abre `wss://` solo) |
| Convex | `modest-newt-846` (https://modest-newt-846.convex.cloud) |

Cada push a `main` publica la sala y el juego. **Convex no se publica solo** mientras no exista el secreto
`CONVEX_DEPLOY_KEY`: si un cambio toca `convex/` o `packages/reglas`, corré `npx convex deploy` (con tu sesión de
Convex) o cargá la llave. El catálogo de producción no se sube a la tabla: el juego y Convex usan el empaquetado,
que se actualiza en cada publicación. Prueba de humo contra producción (dos jugadores en la misma sala):

```bash
node apps/web/tools/test-produccion.mjs        # capturas en capturas/produccion/
```

## Dónde va cada llave

**Nunca en el código.** `.env*` (menos `.env.example`) y `.dev.vars` están ignorados por git.

| Llave | Dónde | Cómo |
|---|---|---|
| `CONVEX_DEPLOY_KEY` | GitHub, entornos `preview` (llave de vista previa) y `production` (llave de producción) | Panel de Convex → proyecto → Settings → Deploy keys |
| `SALA_SECRETO` | Convex **y** GitHub (entorno `production`), igual en los dos; el flujo lo copia a la sala | `npx convex env set SALA_SECRETO … --prod` · `gh secret set SALA_SECRETO --env production` |
| `SALA_SECRETO` (vista previa) | Variables por defecto de vista previa en Convex **y** GitHub (entorno `preview`) | Panel de Convex → Settings → Environment variables → Preview · `gh secret set SALA_SECRETO --env preview` |
| `PANEL_LLAVE` | Convex de cada entorno | `npx convex env set PANEL_LLAVE …` |
| `CLOUDFLARE_API_TOKEN` | GitHub, secreto del repo (sirve para los dos entornos) | Cloudflare → My Profile → API Tokens, plantilla «Edit Cloudflare Workers» |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex de cada entorno (no es secreta) | `npx convex env set CLERK_JWT_ISSUER_DOMAIN …` (ver «Cuentas con Clerk») |
| `VITE_CLERK_PUBLISHABLE_KEY` | Variable de GitHub por entorno y `.env.local` (no es secreta) | `gh variable set VITE_CLERK_PUBLISHABLE_KEY --env …` |

Variables de GitHub (no secretas), por entorno: `VITE_CONVEX_URL` (`https://….convex.cloud`; solo hace falta si no
hay `CONVEX_DEPLOY_KEY`), `CONVEX_SITE_URL` (`https://….convex.site`; en vista previa dejala vacía: hay un Convex por rama pero una sola sala
de vista previa, así que la sala no reporta cuánta gente hay) y, si
querés fijarla, `VITE_SALAS_URL` (con `https://`, no `wss://`). De repositorio, opcional: `CLOUDFLARE_ACCOUNT_ID` (si el token ve varias cuentas).

## Host del juego: Cloudflare

Decidido por Luis (16 nov): todo vive en Cloudflare, igual que Tuerce. El juego compilado
(`pnpm --filter @mundo-catrucho/web build:web` → `apps/web/dist/web`) es estático y lo sirve un Worker solo de archivos
([`apps/web/wrangler.toml`](../apps/web/wrangler.toml)); la sala es el Durable Object de `workers/salas`. Un solo
token, una cuenta y una factura; los archivos estáticos no cobran ancho de banda. La vista previa del juego es una
sola a la vez (`mundo-catrucho-web-preview`, la del último pull request).

## Proteger `main` (MC-64)

`main` solo acepta cambios por pull request y con la revisión «check, test y capturas» en verde, también para los
administradores (`enforce_admins`). Está activa desde el 19 nov, cuando Luis hizo **público** el repo.

Hasta ese día el repo era privado en el plan gratis de GitHub: no dejaba proteger ramas (403) y, del 17 al 19 nov,
Actions no arrancaba ningún trabajo («recent account payments have failed or your spending limit needs to be
increased»): se acabaron los minutos del mes. En repos públicos los minutos de Actions no se cobran.

Para revisar que siga activa (sale con 1 si falta algo), y si alguna vez hay que volver a aplicarla:

```bash
bash scripts/proteger-main.sh --verificar
bash scripts/proteger-main.sh
```

O a mano: Settings → Branches → Add rule → `main` → «Require a pull request before merging» y «Require status
checks to pass» con `check, test y capturas`.

**Ojo, repo público:** nada de secretos, llaves ni datos personales en el código, los commits, los issues ni los PR
(regla 6 de `AGENTS.md`). Los pull requests desde forks no reciben secretos y el despliegue de vista previa no corre
para ellos.

## Cuentas con Clerk (MC-07)

El código ya está: `convex/auth.config.ts` (integración oficial Convex + Clerk), `apps/web/src/core/clerk.tsx` y
`cuentas:vincularCuenta`. Queda **apagado** mientras falten las llaves: sin `CLERK_JWT_ISSUER_DOMAIN` Convex no
acepta tokens (y publica igual), y sin `VITE_CLERK_PUBLISHABLE_KEY` el juego no compila ni carga nada de Clerk.
Mientras tanto se juega como invitado y se sigue en otro dispositivo con un código (Ajustes → «Tu cuenta»).

Lo que tiene que hacer Luis (una vez por instancia de Clerk: desarrollo y producción):

1. En https://dashboard.clerk.com → **Create application**, nombre «Mundo Catrucho», con **Email** y **Google**
   como formas de entrar. Eso crea la instancia de desarrollo (`pk_test_…`).
2. **Configure → JWT templates → New template → Convex**. Dejá el nombre `convex` (el juego lo pide así) y guardá.
   Copiá el **Issuer** de la plantilla (`https://<algo>.clerk.accounts.dev`).
3. Convex de desarrollo y vista previa:
   ```bash
   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<algo>.clerk.accounts.dev
   ```
   Para la vista previa, ponela también en el panel de Convex → Settings → Environment variables → Preview.
4. Juego: **API keys** de Clerk → *Publishable key*. En tu `.env.local`: `VITE_CLERK_PUBLISHABLE_KEY=pk_test_…`
   (junto con `VITE_CONVEX_URL`), y en GitHub: `gh variable set VITE_CLERK_PUBLISHABLE_KEY --env preview --body pk_test_…`.
   En Clerk → **Domains / Allowed origins** agregá `http://localhost:5173` y la dirección de la vista previa.
5. Producción: en Clerk, **Deploy to production** (pide un dominio propio con sus registros DNS; `workers.dev` no
   sirve). Repetí la plantilla `convex` en la instancia de producción y luego:
   ```bash
   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://clerk.<tu-dominio> --prod
   gh variable set VITE_CLERK_PUBLISHABLE_KEY --env production --body pk_live_…
   ```
6. Publicá Convex (`npx convex deploy`) y el juego (push a `main` o Actions → Despliegue).

Cómo se ve: en Ajustes → «Tu cuenta» aparece **Entrar con Google o correo**. Al entrar, `vincularCuenta` une la cuenta
de Clerk con el invitado de ese dispositivo; si la cuenta ya existía (otro dispositivo), el avance del invitado se
junta con ella una sola vez, sin repetir premios (`fusionarCuentas` de `packages/reglas`). Al salir, el juego vuelve a
ser el invitado del dispositivo. `CLERK_SECRET_KEY` no hace falta.

Probar sin llaves: `node apps/web/tools/test-cuentas.mjs` simula el token con `npx convex run --identity`.

## Primera vez en producción (checklist)

1. `npx convex login` y en el panel de Convex sacá la llave de producción y la de vista previa.
2. Generá dos `SALA_SECRETO` distintos (preview y producción) y cargalos en Convex y en GitHub (tabla de arriba).
3. Creá el token de Cloudflare (plantilla «Edit Cloudflare Workers») y guardalo: `gh secret set CLOUDFLARE_API_TOKEN`.
4. Cargá en GitHub los secretos y variables de cada entorno.
5. Corré Actions → Despliegue → `production` (o hacé push a `main`).
