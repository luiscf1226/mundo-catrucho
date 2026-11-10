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
| `packages/reglas/` | Reglas compartidas (premios, niveles, validación) | Vacío: se llena en la fase 2 |
| `docs/` | Plan, tickets y su generador | `docs/generador/catrucho.mjs` regenera el plan; `contenido.json` y `viajes.json` son el contenido nuevo |

El contenido del prototipo (departamentos, lugares, juegos, comidas, palabras, ropa) está en `apps/web/shared/data/`.

### Regla del contenido

Cada motor de juego existe en **un solo departamento**: si un juego está en Olancho, no hay otro igual en Colón con
otro nombre. Cada departamento trae 8 motores, 12 juegos (estrella, normales y locos), lugares para explorar y
locuras con su fuente. `docs/generador/contenido.json` lo describe todo y `node docs/generador/validar-contenido.mjs`
comprueba que nada se repita. Los viajes reales (rutas, vehículos, eventos de carretera) están en `viajes.json`.

## Cómo se corre

```bash
pnpm install && pnpm --dir apps/web install && pnpm --dir workers/salas install

pnpm web:dev        # el juego en http://localhost:5173
pnpm web:build      # compila apps/web/dist/mundo-catrucho-hd.html (un solo archivo)
pnpm web:test       # juega solo de punta a punta en Chromium sin ventana; debe imprimir PASA
pnpm convex:check   # revisa los tipos del esquema
pnpm salas:test     # levanta la sala en local y conecta dos jugadores; debe imprimir PASA
```

`apps/web/docs/CONTRATO.md` explica cómo está hecho el juego por dentro (kit de escenas, motores, catálogo, pruebas).

## Decisiones

- **Cuentas:** Clerk, con su integración oficial con Convex. Se puede jugar sin cuenta; la cuenta guarda el avance.
- **Datos y reglas:** Convex. **En vivo:** Cloudflare Durable Objects. **Hosting:** Cloudflare Workers en tu cuenta.
- **Chat:** sí, moderado (filtro, límite de mensajes, reportar, silenciar, bloquear; se puede apagar).
- **Marcas y clubes:** con apodos, sin logotipos oficiales.

## Cómo se trabaja

El trabajo está en los [issues](https://github.com/luiscf1226/mundo-catrucho/issues), un hito por fase.
Cada issue dice cuándo está listo, su tamaño y de qué depende; los de departamento traen la lista de motores,
juegos, lugares y locuras. `node docs/generador/issues.mjs luiscf1226/mundo-catrucho catrucho` los vuelve a crear
si faltan (no repite los que ya existen).

Lo primero es la fase 0 (pulido y vista desde arriba del mapa). Para la fase 1 hacen falta tus cuentas de Convex,
Clerk y Cloudflare (`wrangler login`).
