# convex

`schema.ts` es el modelo de datos completo. El proyecto es `mundo-catrucho` en el equipo `luiscf1226` de Convex,
con un entorno de desarrollo en la nube.

```bash
npx convex dev            # sube esquema y funciones al entorno de desarrollo y regenera _generated/ al guardar
npx convex dev --once     # lo mismo una sola vez
```

La primera vez en una máquina nueva: `npx convex login` y luego `npx convex dev` (elegí el proyecto existente
`mundo-catrucho`). Eso escribe `.env.local` con `CONVEX_DEPLOYMENT` y `CONVEX_URL`; está ignorado por git.

`partidas.validar` es una consulta pura: recibe `{ motor, puntos, estrellas, duracion, etapa, etapas?, gano? }` y
responde `validarResultado` de `@mundo-catrucho/reglas` (`{ ok, motivos, estrellasPosibles, conocido }`). No toca
tablas; la usará `cerrarPartida` (MC-14).

```bash
npx convex run partidas:validar '{"motor":"cortes.chuco","puntos":320,"estrellas":2,"duracion":74,"etapa":0}'
```

## Tienda y partidas (MC-13, MC-14)

Identidad de invitado mientras no exista Clerk (MC-07): el juego genera un secreto de 32 bytes, lo guarda en
`localStorage` y lo manda como `invitado` en cada llamada. Convex guarda solo `invitado:<sha256>` en
`usuarios.tokenIdentifier`. Todo pasa por `usuarioActual` / `asegurarUsuario` de `identidad.ts`; con Clerk solo
cambia `tokenDe`.

- `tienda:entrar`, `tienda:miPerfil`: crea o lee al invitado (100 Lempiritas, avatar inicial) y devuelve
  `{ monedas, xp, nivel, avatar, comprados }`.
- `tienda:comprar { itemId, equipar? }`: precio de `shop.json`, nunca del cliente; rechaza `no` (no existe o solo
  viene en un atuendo), `ya` y `caro`.
- `tienda:equipar { itemId }` y `tienda:vestir { avatar }`: solo lo que tenés, cada pieza en su ranura.
- `partidas:abrirPartida { motor, etapa, juegoId?, modo? }`: motor, etapas y tema salen del último catálogo
  publicado (o del empaquetado); guarda `inicio` con la hora del servidor y `dueno`. Cada jugador tiene como mucho
  una partida abierta: abrir otra deja las anteriores `abandonada` sin pagar, y abrir dos en menos de
  `APERTURA_MIN_MS` (1 s) se rechaza.
- `partidas:cerrarPartida { partidaId, puntos, estrellas, gano }`: duración = ahora − inicio, `validarResultado`
  con la holgura de `HOLGURA_S`, y paga `premioPartida` + `ganarXp` una sola vez. Imposible → `rechazada`;
  motor sin fila en `TOPES` → `rechazada`; más de 30 min → `vencida`; ajena, ya cerrada o abandonada → no se toca.
  Todo motor de `minigames.json` y del catálogo tiene que tener fila en `TOPES` (lo revisa `topes.test.mjs`).

Pendiente para MC-15 y MC-16: con Convex, el juego no suma Lempiritas ni XP por monedas sueltas, primera visita,
recuerdos, misiones, logros ni bono de viaje, y no cobra pasajes ni comida del viaje (`gainCoins`/`gainXp` no hacen
nada con `VITE_CONVEX_URL`). Solo pagan las partidas validadas y solo cobra la tienda.

La lógica pura vive en `packages/reglas` (`tienda.ts`, `partidas.ts`) y se prueba con `node --test`.

```bash
npx convex run tienda:entrar '{"invitado":"<64 hex>"}'
node apps/web/tools/test-tienda-servidor.mjs   # de punta a punta contra el entorno de desarrollo
```

## Pase de sala en vivo (MC-18)

`salas:pase { invitado, sala, nombre? }` identifica al invitado (lo crea si hace falta, como `tienda:entrar`) y
devuelve `{ ok: true, pase, id }`: un pase firmado con HMAC-SHA256 que vale 60 s solo para esa sala (`mapa:N` o
`dept:<id>:N`). Lleva un id público derivado de la cuenta con el secreto (nunca el secreto de invitado), el nombre
limpio y el avatar guardado en el perfil. Firmar y verificar viven en `packages/reglas/src/pase.ts`; la sala
(`workers/salas`) verifica con la misma función.

Necesita `SALA_SECRETO` (mínimo 32 caracteres) en el entorno de Convex y el **mismo** valor en Cloudflare:

```bash
npx convex env set SALA_SECRETO <valor>          # Convex
cd workers/salas && npx wrangler secret put SALA_SECRETO   # Cloudflare; en local va en workers/salas/.dev.vars
```

Sin el secreto responde `{ ok: false, motivo: 'sin-salas' }` y el juego sigue sin sala.

## Catálogo público

```bash
npx convex dev --once
pnpm catalogo:subir
node apps/web/tools/test-catalogo-convex.mjs
```

`catalogo:reemplazar` es una mutación interna, ejecutada con los permisos administrativos del CLI.
El script arma los 18 departamentos desde `shared/data/departments.json`, `minigames.json`,
`catalogo/*.json`, los apodos públicos de `apodos.json` y `docs/generador/contenido.json`.
Guarda el contenido jugable y editorial por departamento. Reemplaza todo en una transacción;
subir contenido idéntico conserva la versión y no duplica filas. Un cambio incrementa la versión.
`catalogo:ultima` es una consulta pública de solo lectura que devuelve la última versión completa.

La regla de cero red tiene una excepción explícita. Compilá con `VITE_CONVEX_URL` para consultar
ese catálogo al iniciar mediante el cliente HTTP de Convex. Si falla, está vacío o tarda más de
3 segundos, se usa el catálogo empaquetado. Sin `VITE_CONVEX_URL` no se consulta la red.
`CONVEX_URL` en `.env.local` configura el CLI; no activa la carga remota del juego por sí sola.

La prueba de integración lee `CONVEX_URL` de `.env.local`, sube un nombre de juego temporal,
comprueba que aparece en la tarjeta de inicio y restaura el contenido anterior en `finally`.
También verifica que repetir la carga conserva la versión y prueba el respaldo local ante errores
y ante una consulta que nunca responde. El arnés permite únicamente el
origen configurado para esa prueba. Sin `.env.local`, imprime `SALTA` y termina con código 0.
No la ejecutes a la vez que otra edición del catálogo en el mismo entorno de desarrollo.

El JSON excede el límite de tamaño de un argumento del sistema. `scripts/convex-stdin.mjs`
pasa los argumentos al CLI por stdin mediante `npx --node-options=--import=… convex run`.
No necesita leer ni mostrar credenciales; las resuelve el CLI con la sesión existente.

## Panel de contenido (MC-33)

```bash
npx convex dev --once
pnpm --filter @mundo-catrucho/panel dev
pnpm --filter @mundo-catrucho/panel build
npx convex env get PANEL_LLAVE
node apps/panel/tools/test-panel.mjs
```

El panel usa `CONVEX_URL` de `.env.local` o `VITE_CONVEX_URL` al compilar. Distribuí `dist/`
como un sitio estático. La URL es pública; la llave nunca se incluye en el sitio.
Configurá `PANEL_LLAVE` como secreto del entorno Convex. La pantalla de entrada la guarda
solo en `sessionStorage` y Salir la borra. Las mutaciones vuelven a comprobarla siempre.
Con Clerk (MC-07) se reemplaza este acceso compartido por roles de administrador.

Se editan nombres y notas de lugares, comidas (nombre, lugar existente, nota), palabras,
textos de turismo y locuras, y nombre, descripción, guiño, etapas y valores del tema de juegos.
No se agregan ni borran elementos ni campos del tema. Los ids, lugares de juegos y motores
son fijos; una mecánica nueva requiere código. El panel y Convex validan la misma estructura:
texto obligatorio si el original lo era, máximo 1000 caracteres, etapas enteras entre 1 y 20,
números finitos hasta 10000 en valor absoluto y referencias de comidas a lugares existentes.

Cada publicación conserva una instantánea completa en `catalogo`. Una fila reservada
`deptId = __publicacion` registra quién (`panel` o `script`), qué, cuándo (milisegundos Unix)
y la versión anterior. Se usa la tabla existente para no cambiar el esquema compartido.
`catalogo:ultima` excluye esa fila y sigue entregando solo los 18 departamentos al juego.
Los registros previos a MC-33 no tienen metadatos; la primera publicación nueva los conserva.
`catalogoPanel:estado` devuelve los metadatos de la publicación actual. Deshacer copia la
instantánea anterior a una versión nueva y registra la restauración; nunca borra historia.
El guardado y deshacer exigen la versión vista por el editor. Si alguien publicó mientras tanto,
se rechaza la escritura y hay que recargar (esto descarta el borrador local).

El script ya no elimina versiones. Si la última publicación es del panel, rechaza reemplazarla,
incluso con contenido idéntico, hasta que se ejecute conscientemente:

```bash
pnpm catalogo:subir --forzar
```

Revisá primero el contenido remoto con `npx convex run catalogo:ultima`. La protección también
vive en la mutación interna, de modo que otro llamador del script no puede omitir el aviso.
Las pruebas anteriores que reemplacen el catálogo deben usar `subirCatalogo(datos, { forzar: true })`
solo cuando restauren una copia conocida. Las versiones se conservan sin límite de retención
por ahora; definir limpieza del historial queda para una operación administrativa posterior.
