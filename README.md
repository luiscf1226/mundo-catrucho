# Mundo Catrucho

Juego 3D para navegador. Se entra a un mapa gigante de Honduras, se viaja a los 18 departamentos y en cada uno
se juegan minijuegos hechos con cosas de ahí.

- **Prototipo jugable:** https://claude.ai/artifact/SmctS5HY3fg18rh2C1hUmS
- **Plan (requerimientos, arquitectura, 216 juegos exclusivos, viajes y turismo):** `docs/plan.html` · https://claude.ai/artifact/LEve6F6zgDJTY4ChFj3W8E

## Qué hay aquí

| Carpeta | Qué es | Estado |
|---|---|---|
| `apps/web/` | El juego: React, TypeScript, React Three Fiber, Zustand, Tailwind, Vite | Prototipo completo; todo vive en el navegador |
| `convex/` | Modelo de datos (`schema.ts`) | Solo el esquema; faltan las funciones y conectar un proyecto de Convex |
| `workers/salas/` | Sala en vivo (Cloudflare Durable Object con WebSocket) | Reparte posiciones y emotes en local; sin pase firmado todavía |
| `packages/reglas/` | Reglas compartidas (premios, niveles, validación) | Vacío: se llena en la ola 5 |
| `docs/` | Plan, tickets y su generador | `docs/generador/catrucho.mjs` regenera el plan; `contenido.json` y `viajes.json` son el contenido nuevo |

El contenido del prototipo (departamentos, lugares, juegos, comidas, palabras, ropa) está en `apps/web/shared/data/`.

### Regla del contenido

Cada motor de juego existe en **un solo departamento**: si un juego está en Olancho, no hay otro igual en Colón con
otro nombre. Cada departamento trae 8 motores, 12 juegos (estrella, normales y locos), lugares para explorar y
locuras con su fuente. `docs/generador/contenido.json` lo describe todo y `node docs/generador/validar-contenido.mjs`
comprueba que nada se repita. Los viajes reales (rutas, vehículos, eventos de carretera) están en `viajes.json`.

## Cómo se corre

```bash
pnpm install       # instala todo el espacio de trabajo (Node 22.18+, pnpm 12)

pnpm dev           # el juego en http://localhost:5173 y la sala en ws://localhost:8799
pnpm check         # Biome (lint y formato), tipos del juego, la sala y Convex, y que el contenido no se repita
pnpm test          # compila, juega solo de punta a punta en Chromium y conecta dos jugadores a la sala; imprime PASA
pnpm build         # apps/web/dist/mundo-catrucho-hd.html (un solo archivo) y el empaquetado de la sala
pnpm capturas      # ./capturas: imágenes de las escenas clave, un video corto e INDICE.md
```

Cada pull request corre `check`, `test` y `capturas` en GitHub Actions (`.github/workflows/revision.yml`) y deja las
capturas como artefacto. `AGENTS.md` es la guía para los agentes.

`apps/web/docs/CONTRATO.md` explica cómo está hecho el juego por dentro (kit de escenas, motores, catálogo, pruebas).

## Decisiones

- **Cuentas:** Clerk, con su integración oficial con Convex. Se puede jugar sin cuenta; la cuenta guarda el avance.
- **Datos y reglas:** Convex. **En vivo:** Cloudflare Durable Objects. **Hosting:** Cloudflare Workers en tu cuenta.
- **Chat:** sí, moderado (filtro, límite de mensajes, reportar, silenciar, bloquear; se puede apagar).
- **Marcas y clubes:** con apodos, sin logotipos oficiales.

## Cómo se trabaja: por olas

El trabajo va en **11 olas, de la 0 a la 10** (`docs/OLAS.md`, y un hito por ola en los
[issues](https://github.com/luiscf1226/mundo-catrucho/milestones)). Cada ola junta varios tickets que se hacen al
mismo tiempo, cada uno con su agente; se juntan en una rama `ola-N`, se prueban y se entregan con vista previa,
capturas y un pull request. Con «full send» se une a `main`. La fase de cada ticket queda como etiqueta.

`node docs/generador/issues.mjs luiscf1226/mundo-catrucho catrucho` deja GitHub igual que `olas.mjs`.

La ola 0 prepara el repo y las herramientas: comandos, revisión automática, guía para los agentes, capturas
automáticas, vistas previas por rama y entornos. Necesita tus cuentas de Convex, Clerk y Cloudflare (`wrangler login`).
