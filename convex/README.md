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

Si la partida paga, `cerrarPartida` también guarda el avance (MC-15): `progresoJuegos` (etapa desbloqueada,
estrellas por etapa, mejor puntaje y veces; también para los minijuegos sueltos, con el motor como id), la visita
del departamento del juego (la primera paga) y la mejor marca del jugador en `marcas`. Avanza las misiones de hoy y
da los logros que se cumplan. `abrirPartida` rechaza una etapa que todavía no está desbloqueada (`etapa bloqueada`).
La respuesta trae `saldo`, `logros` (lo que pagó cada uno), `misiones` y `progreso`.

## Avance, misiones, logros y clasificación (MC-15, MC-16, MC-17)

Todo responde `{ ok, saldo, subidas, logros, misiones }` además de lo propio. Las cantidades salen de
`packages/reglas` (`progreso.ts`), `rewards.json`, `progress.json` y `shop.json`; nunca del navegador.

- `progreso:estado` (consulta): visitas, recuerdos, logros, misiones de hoy, avance por juego y si ya subió el
  avance local.
- `progreso:visitar { deptId }`: la primera visita paga. `progreso:recoger { deptId }`: el recuerdo, una sola vez y
  solo si visitó el departamento (`sin-visita`, `ya`).
- `progreso:recogerMonedas { cantidad }`: monedas sueltas en tandas, con cubeta (20 de golpe, una cada 1,5 s) y tope
  de 300 por día de Honduras. Lo demás se ignora.
- `progreso:registrarEmote`: cuenta un emote cada 2 s como mucho (logro «Bailarín» y misión de emotes).
- `progreso:cobrarMision { misionId }`: valida que sea de hoy, esté completa y sin cobrar (`incompleta`, `cobrada`,
  `no`); paga lo de `progress.json`.
- `progreso:salirDeViaje { veh, de, a }`: cobra `PASAJES[veh]` (copia de los precios del juego; `progreso.test.mjs`
  revisa que no se desfasen); el destino tiene que ser otro departamento. `progreso:llegarViaje { viajeId, bono }`:
  cierra el viaje y **no paga bono** (`motivo: 'sin verificar'`): el bono sale de los choques, que solo ve el
  navegador. Vuelve cuando la sala del viaje firme lo que pasó (MC-31). `progreso:gastar { monto, concepto }`: comida y
  peaje del camino (1–50, con saldo).
- `progreso:subirAvanceLocal { visitados, recuerdos, juegos }` (MC-08): una sola vez por jugador sube lo guardado en
  el navegador sin dar premios: departamentos que existen, recuerdos de departamentos visitados y cuántas veces jugó
  cada juego del catálogo. Etapas y estrellas no suben: solo una partida validada desbloquea. Las marcas no suben y los logros que ya cumpla quedan marcados sin pagar.
- `misiones:repartir` (interna): la corre `crons.ts` a las 06:00 UTC (medianoche de Honduras) y guarda en
  `misionesGlobales` las misiones del día, sorteadas con la fecha (las mismas para todos). Cada jugador recibe su
  copia en `misionesDia` la primera vez que hace algo ese día.
- Logros: los da el servidor una sola vez (`logros`), por partida (`primera_victoria`, `goleador`, `punteria`,
  `explorador`, `pulpero`) o por estado (visitas, recuerdos, compras, prendas típicas puestas, nivel, emotes).
  «Primeros pasos» llega con `tienda:entrar { creado: true }`; «A la moda» y «Traje típico» con la tienda.
- `clasificacion:porJuego { juegoId, invitado? }` y `clasificacion:porDepto { deptId, invitado? }`: los 10 mejores
  (índices `por_juego` y `por_dept` de `marcas`), la mejor marca por jugador y su nombre limpio; `tuya` si no entraste.
- `progreso:olvidarInvitado { invitado }` (interna): borra a un invitado y todo lo suyo. Las pruebas la usan para
  no dejar marcas en la clasificación de desarrollo.

Tablas nuevas: `contadores` (emotes, ritmo de monedas, «entró», avance local subido), `misionesGlobales` y `viajes`.

```bash
npx convex run misiones:repartir '{}'
node apps/web/tools/test-progreso-servidor.mjs   # de punta a punta; capturas en capturas/mc-17/
```

El tope por día del bono de viaje (`BONOS_VIAJE_DIA`, 90) queda listo para cuando el bono vuelva a pagarse.

Confianza aceptada mientras todos sean invitados (cualquiera puede crear identidades nuevas): la primera visita y
el recuerdo de cada departamento se pagan sin probar que estuvo ahí (como el mapa, que deja viajar gratis), y
«Primeros pasos» y los emotes los declara el navegador. Todo eso paga una sola vez o con pausa.

Pendiente:
- Las monedas, lo comprado y lo puesto del navegador no suben al servidor (eso pagaría sin validar). El nombre de
  invitado se puede repetir hasta que lleguen las cuentas (MC-07).
- La tabla por departamento compara puntos de juegos distintos (escalas distintas); `tuya` solo se busca entre las
  400 mejores marcas del departamento.
- La ruta del viaje (`rutaParaVehiculo`) solo la revisa el navegador.

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

## Chat moderado, amigos y código de invitación (MC-22, MC-24)

Todo con la identidad de invitado. En el juego cada quien se conoce por su id público de sala (`idPublico`, el
mismo del pase): no revela la cuenta. `publicos` lo traduce a la cuenta y se llena con `salas:pase` y los códigos.
Las reglas (filtro, ritmo, topes, firma de mensajes, alfabeto del código) viven en `packages/reglas/src/chat.ts`.

- `amigos:lista` (consulta): tu id público, amigos y pedidos (`amigos` | `enviada` | `recibida`), bloqueados y tu
  código vigente.
- `amigos:pedir { id }` (id público visto en una sala; si el otro ya te había pedido, quedan amigos),
  `amigos:responder { amistadId, aceptar }`, `amigos:quitar { amistadId }` (borra también sus directos).
- `amigos:bloquear { id }` / `amigos:desbloquear { id }`: tabla `bloqueos`. Bloquear quita la amistad. Un bloqueo
  corta en los dos sentidos: chat de sala (el pase lleva los últimos 32 bloqueados y la sala no reparte entre
  ellos), directos, amistad y códigos.
- `amigos:crearCodigo { sala }`: 5 letras de `ALFABETO_CODIGO`, vale 10 minutos. Si ya tenés uno vigente se reusa y
  se actualiza la sala (el juego lo vuelve a llamar al cambiar de sala).
- `amigos:usarCodigo { codigo }`: devuelve la sala exacta, el nombre y el id público de quien lo creó. El juego
  viaja a esa zona y entra a esa sala aunque no sea el primer tramo libre; si tiene sus 24, avisa (`llena`) y sigue
  en el tramo que toque. Con bloqueo responde como si el código no existiera.
- `chat:enviarDirecto { amistadId, texto }` y `chat:directos { amistadId }`: tabla `directos`. Solo entre amistades
  aceptadas sin bloqueo, filtrados con `filtrarChat`, 8 por minuto y los últimos 60 por conversación. El juego hace
  un sondeo cada 3 s mientras la conversación está abierta.
- `moderacion:reportar { motivo, mensaje | directoId }`: tabla `reportes` (campos nuevos opcionales `sala`,
  `mensajeId`, `directo`, `texto`, `estado`). Un mensaje de sala se cita como lo mandó la sala con su firma HMAC
  (`SALA_SECRETO`): si no coincide se rechaza (`firma`). De un directo basta el id. Máximo 10 por día de Honduras
  (`tope`), uno por mensaje (`ya`), nunca a uno mismo (`propio`).

Cola de moderación (solo con permisos de administrador; no hay pantalla todavía):

```bash
npx convex run moderacion:cola '{}'                       # sin revisar, del más nuevo al más viejo
npx convex run moderacion:cola '{"todos":true,"limite":100}'
npx convex run moderacion:resolver '{"reporteId":"<id>"}'  # marcarlo como revisado
```

Cada fila trae cuándo, motivo, texto citado, dónde (`mapa:0`, `dept:olancho:1` o `directo`), quién reporta, a quién
y cuántos reportes acumula ese jugador en la cola. `moderacion:olvidarSocial { invitado }` (interna) borra lo social
de un invitado de prueba; `node apps/web/tools/test-chat-amigos.mjs` la usa junto a `progreso:olvidarInvitado`.

Tablas nuevas: `bloqueos`, `publicos` y `directos`. Campos nuevos opcionales: `reportes.*` e `invitaciones.sala`.
