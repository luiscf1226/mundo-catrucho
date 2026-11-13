# Mundo Catrucho · guía para agentes

Juego 3D para navegador: un mapa gigante de Honduras, los 18 departamentos y minijuegos hechos con cosas de cada uno.
Todo el texto que ve el jugador va en **español de Honduras** (corto, con voseo). Los commits, issues y pull requests
también van en español.

## Dónde está cada cosa

| Carpeta | Qué es |
|---|---|
| `apps/web/` | El juego (`@mundo-catrucho/web`): React, TypeScript, React Three Fiber, Zustand, Tailwind, Vite. Se compila a un solo HTML. |
| `apps/web/docs/CONTRATO.md` | **Léelo antes de tocar el juego**: kit de escenas, motores, catálogo, jugador, `data-testid`, pruebas. |
| `apps/web/shared/data/` | Contenido: departamentos, catálogo de juegos, tienda, premios. |
| `apps/web/tools/` | Compilación (`build.mjs`), arnés de Chromium (`harness.mjs`), prueba de punta a punta (`smoke.mjs`), capturas (`capturas.mjs`). |
| `workers/salas/` | Sala en vivo (`@mundo-catrucho/salas`): Cloudflare Durable Object con WebSocket. |
| `convex/` | Modelo de datos (`schema.ts`). Las funciones llegan en la ola 2. |
| `packages/reglas/` | Reglas compartidas (`@mundo-catrucho/reglas`): premios, niveles, topes para validar resultados y límites de la sala. Las usan el juego, Convex y la sala. |
| `.github/` | Revisión automática (`workflows/revision.yml`) y plantillas de pull request e issues. |
| `docs/` | Plan, olas (`OLAS.md`), tickets (`TICKETS.md`) y el generador que los produce. |

## Comandos (siempre desde la raíz)

```bash
pnpm install       # instala todo el espacio de trabajo (Node 22.18 o más, pnpm 12)
pnpm dev           # juego en http://localhost:5173 y sala en ws://localhost:8799 (pide workers/salas/.dev.vars)
pnpm check         # Biome (lint y formato) + tipos de todo + validar que el contenido no se repita
pnpm test          # compila y juega solo de punta a punta en Chromium; la sala conecta dos jugadores; pruebas de reglas
pnpm --filter @mundo-catrucho/reglas test   # solo las pruebas unitarias de packages/reglas (node --test)
pnpm --filter @mundo-catrucho/web build:web # sitio estático en apps/web/dist/web, tamaños por trozo
node apps/web/tools/test-carga.mjs          # prueba HTTP de cargas diferidas (también MC_GPU=0 MC_LENTO=6)
pnpm build         # apps/web/dist/mundo-catrucho-hd.html y el empaquetado de la sala
pnpm capturas      # compila y deja ./capturas/*.png, ./capturas/recorrido.mp4 e INDICE.md
pnpm fix           # arregla el formato y lo que Biome sabe arreglar solo
pnpm avisos        # avisos de Biome que no bloquean: `any`, `!`, accesibilidad, variables sin usar
```

Antes de dar algo por terminado: `pnpm check` y `pnpm test` en verde. Si tocaste algo que se ve, corre `pnpm capturas`
y **mira las imágenes**. Una prueba en verde no prueba que se vea bien.

Para pruebas propias: `apps/web/tools/test-<algo>.mjs` con `run()` de `harness.mjs`; debe imprimir `PASA` y salir con 0.
En máquinas sin GPU (GitHub Actions) se corre con `MC_GPU=0`; `CHROME_BIN` elige el navegador. Sin GPU el juego va a
5–20 cuadros por segundo: en las pruebas **espera por lo que pasa** (`waitFor`, `holdUntil`), no por tiempo fijo.
Una prueba que anima cuadro a cuadro o saca muchas capturas puede no caber en GitHub (allá va a ~1 cuadro por
segundo): con `MC_GPU=0` sáltala o recórtala diciendo `SALTA …`, como `test-camara-mando`, y córrela vos con GPU.

Biome tiene apagadas a propósito algunas reglas que chocan con cómo está hecho el juego (`biome.json`): fábricas de
componentes del paquete de arte, dependencias de efectos de React Three Fiber, asignaciones dentro de expresiones y
llaves por índice en listas fijas. Código nuevo: sin `any` ni `!` si se puede evitar.

## Reglas duras

1. **Cero red en tiempo de ejecución.** Nada de `fetch`, imágenes, modelos ni fuentes externas (salvo Google Fonts).
   En la compilación web se permiten los assets del propio sitio (trozos JS/CSS); el HTML autónomo sigue sin red.
   Texto 3D con `Label`/`Plate` del kit, texturas con lienzo. Excepción: si se compila con `VITE_CONVEX_URL`,
   el juego consulta el catálogo público de ese Convex al iniciar (máximo 3 s; respaldo empaquetado si falla).
   Sin esa variable no hay peticiones a Convex. El arnés solo permite ese dominio cuando la prueba lo pide explícitamente.
   Segunda excepción: si se compila con `VITE_SALAS_URL` **y** `VITE_CONVEX_URL`, el juego pide a Convex un pase
   (`salas:pase`), pregunta a la sala qué tramo tiene espacio y se conecta por WebSocket (MC-18 a MC-21). Sin las dos
   variables sigue `LocalNet`, sin red. Las pruebas permiten esa sala con la opción `red` del arnés.
2. **Cada motor de juego existe en un solo departamento.** `node docs/generador/validar-contenido.mjs` lo revisa.
3. **Marcas, clubes y la Selección van con apodos**, nunca con logotipos ni nombres oficiales.
4. **Rendimiento:** menos de ~350 llamadas de dibujo por escena y una sola luz con sombras.
5. **Nada que valga se decide en el navegador** una vez que exista el servidor (desde la ola 5): premios, compras y
   puntajes los valida Convex con `packages/reglas`. Premios, niveles y topes se cambian **solo** en ese paquete (o en
   `rewards.json`); si cambiás metas o reloj de un motor del kit, cambiá también `TOPES` (`test-reglas.mjs` lo revisa).
6. **Secretos nunca en el código.** Las llaves viven en los secretos de GitHub y de Cloudflare; `.env*` está ignorado.

## Qué no tocar

- `apps/web/src/generated/`: lo genera `tools/embed-roblox.mjs`.
- `convex/_generated/`: lo genera `npx convex dev`.
- `docs/plan.html`, `docs/OLAS.md`, `docs/TICKETS.md`: los genera `node docs/generador/catrucho.mjs`; cambia el
  generador o `contenido.json`, no el resultado.
- Los `data-testid` que lista `CONTRATO.md` son contrato con las pruebas: no los renombres.
- Si tu ticket no es de infraestructura, no reescribas `apps/web/tools/`, `src/core/`, `kit/index.tsx`, `kit/core.ts`,
  `GameCanvas`, `PlayerController`, `minigames/api.ts` ni `minigames/index.ts`. Si te hace falta algo de ahí, dilo en tu informe.

## Cómo se trabaja: por olas

El trabajo va en olas (`docs/OLAS.md`); cada ola es un hito en GitHub y cada ticket un issue `MC-NN`. La skill
`.claude/skills/ola/SKILL.md` explica cómo repartir una ola entre agentes, juntarla en la rama `ola-N` y entregarla.

- Una rama por ticket (`ola-N-mc-NN-algo`) que sale de `ola-N`; el pull request de la ola va de `ola-N` a `main`.
- `main` solo recibe cambios por pull request con la revisión automática en verde. Los PR cierran sus issues con
  `Closes #NN` (GitHub no entiende «Cierra»).
- **Nunca se une un pull request a `main` sin que el usuario diga «full send»** o lo pida claramente.

## Panel de contenido (MC-33)

`apps/panel/` (`@mundo-catrucho/panel`) edita el catálogo existente sin compilar el juego.
Corré `pnpm --filter @mundo-catrucho/panel dev` (puerto 5174) o `build`.
Usa `CONVEX_URL` de `.env.local`, o `VITE_CONVEX_URL`. `pnpm check` incluye sus tipos y Biome.
La llave se obtiene con `npx convex env get PANEL_LLAVE`; ingresala en la pantalla de acceso.
Solo se guarda en `sessionStorage`; nunca la agregués al código ni a variables `VITE_*`.
Con Clerk (MC-07) el acceso debe migrar a roles. Prueba real (edita y restaura):
`node apps/panel/tools/test-panel.mjs`. No la corras junto a otras publicaciones en ese entorno.
Capturas en `capturas/mc-33/`. `catalogo:subir` exige `--forzar` si la última publicación vino del panel.
