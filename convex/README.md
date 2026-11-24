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

Identidad de invitado: el juego genera un secreto de 32 bytes, lo guarda en `localStorage` y lo manda como
`invitado` en cada llamada. Convex guarda solo `invitado:<sha256>` en `usuarios.tokenIdentifier`. Todo pasa por
`usuarioActual` / `asegurarUsuario` de `identidad.ts`; otros dispositivos y Clerk entran por `vinculos` (más abajo).

- `tienda:entrar`, `tienda:miPerfil`: crea o lee al invitado (100 Lempiritas, avatar inicial) y devuelve
  `{ monedas, xp, nivel, avatar, comprados }`.
- `tienda:comprar { itemId, equipar? }`: precio de `shop.json`, nunca del cliente; rechaza `no` (no existe o solo
  viene en un atuendo), `ya` y `caro`.
- `tienda:equipar { itemId }` y `tienda:vestir { avatar }`: solo lo que tenés, cada pieza en su ranura.
- `partidas:abrirPartida { motor, etapa, juegoId?, modo? }`: motor, etapas y tema salen del último catálogo
  publicado (o del empaquetado); guarda `inicio` con la hora del servidor y `dueno`. Cada jugador tiene como mucho
  una partida activa, referida en `aperturas.partidaId`: abrir otra retira a ese jugador del cobro anterior.
  Si no queda nadie, la anterior queda `vencida`; en un dúo el compañero conserva su cobro. Abrir dos en menos de
  `APERTURA_MIN_MS` (1 s) se rechaza con el plazo restante; el cliente reintenta una vez. Cada apertura programa
  su vencimiento a los 30 min, aunque nadie vuelva a abrir.
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

## Cuentas, otro dispositivo y Clerk (MC-07, MC-08, MC-09)

Una cuenta tiene su llave propia (`usuarios.tokenIdentifier`, el hash del invitado que la creó) y puede tener más en
`vinculos`: el invitado de otro dispositivo que usó un código, o el `tokenIdentifier` de Clerk. `usuarioDe` (en
`identidad.ts`) busca primero la cuenta de Clerk si viene un token y está vinculada; si no, el invitado. Todo lo
demás sigue llamando a `usuarioActual` / `asegurarUsuario`.

- `cuentas:crearCodigoDispositivo`: 8 letras de `ALFABETO_CODIGO` (`ABCD-EFGH`), un solo uso, 10 min. Guarda solo
  su SHA-256 en `codigosDispositivo`; pedir otro borra el anterior.
- `cuentas:verCodigoDispositivo { codigo }` (consulta): de quién es la cuenta del código (nombre y nivel). El juego
  lo muestra y pide confirmar antes de entrar: entrar le da a esa cuenta todo lo del dispositivo.
- `cuentas:usarCodigoDispositivo { codigo, local? }`: el invitado que llama entra a la cuenta del código (su secreto
  queda en `vinculos`; nunca viaja el secreto de la otra). Lo que tenía en Convex se junta con `fusionar` y lo del
  navegador (`local`) sube sin premios, como `subirAvanceLocal`. El código se revisa antes de crear nada (probar
  códigos no llena tablas; un dispositivo sin cuenta solo queda vinculado). Motivos: `codigo`, `vencido`, `propio`,
  `espera` (10 fallos cada 10 min si ya tenés cuenta), `tope` (esa cuenta ya absorbió `FUSIONES_POR_DIA` = 2 hoy) y
  `con-cuenta` (con token de Clerk, o si el invitado de este dispositivo ya es una cuenta de Clerk).
- `fusionar` usa `fusionarCuentas` de `packages/reglas`: nada se pierde (monedas, ropa, etapas, estrellas, marcas,
  visitas, recuerdos, turismo, logros, misiones de hoy, amistades y bloqueos) y no se paga dos veces la bienvenida,
  la misma visita o recuerdo, el mismo logro, la misma misión del mismo día ni monedas sueltas sobre el tope del día;
  los premios por nivel se ajustan al nivel de la XP sumada y una prenda comprada en las dos se devuelve. Si lo
  repetido ya se gastó, se devuelven prendas que solo tenía la otra (las más caras primero) hasta cubrirlo. Los logros
  que solo cumple la suma quedan marcados sin pagar. Lo que subió del navegador sin premio (`visitas.visitaLocal`,
  `visitas.recuerdoLocal`, `logros.sinPago`) no cuenta como cobrado. La cuenta que se junta se borra; sus llaves pasan
  a la que queda. Es una transacción: pasa entera o no pasa. Una cuenta absorbe como mucho `FUSIONES_POR_DIA` por día
  (`contadores.fusiones`): los topes del día son por cuenta y así no se multiplican juntando invitados.
- `cuentas:miCuenta` (consulta): nombre, si tiene cuenta de Clerk, cuántos dispositivos y si hay un código vigente.
- `cuentas:vincularCuenta` (Clerk): sin token responde `sin-cuenta`. La primera vez la cuenta de Clerk se une al
  invitado de ese dispositivo; desde otro dispositivo, su invitado se junta con la cuenta. Una cuenta que ya es de
  Clerk nunca se adopta ni se junta con otra (otra llave en el mismo dispositivo arranca su propia cuenta), y al salir
  de Clerk el juego cambia el secreto del dispositivo y queda como invitado nuevo. Repetirla no hace nada.
- `auth.config.ts` lee `CLERK_JWT_ISSUER_DOMAIN`; sin ella no hay proveedores y Convex publica igual. Pasos en
  `docs/ENTORNOS.md` («Cuentas con Clerk»).

```bash
node apps/web/tools/test-cuentas.mjs   # dos navegadores contra el Convex de .env.local; capturas en capturas/cuentas/
npx convex run --identity '{"tokenIdentifier":"https://x.clerk.accounts.dev|user_1"}' cuentas:vincularCuenta '{"invitado":"<64 hex>"}'
```

Tablas nuevas: `vinculos` y `codigosDispositivo`. Campos nuevos opcionales: `visitas.visitaLocal`,
`visitas.recuerdoLocal`, `logros.sinPago` y `contadores.fusiones`; índice nuevo `reportes.por_a`.
`progreso:olvidarInvitado` acepta `{ token }` para borrar una cuenta de Clerk de prueba.

Confianza aceptada: un dispositivo sin cuenta puede probar códigos sin límite propio (8 letras de 32: 2⁴⁰ códigos que
viven 10 min). El bono de viaje no se tiene en cuenta al juntar porque hoy no se paga.

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
  corta en los dos sentidos: chat de sala (el pase lleva todos los bloqueados (máximo 200 por cuenta) y la sala no reparte entre
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

## Jugar con gente de la sala (MC-23, MC-25, MC-31)

- `partidas:abrirJuntos { juegoId }`: partida entre dos (modo `duo`, primera etapa, solo motores del kit) con su
  semilla y `sala = juego:<id>`. Comparte el turno de apertura con la partida sola: abrir o unirse retira solo a ese jugador del cobro anterior. Hay una pausa de 1 s entre aperturas, aunque la anterior ya esté cerrada. Una tarea programada vence las invitaciones sin segundo jugador a los 3 min. `partidas:unirseJuntos
  { partidaId }` agrega al segundo (cupo `PARTIDA.cupo`, mientras esté abierta y no hayan pasado 3 min).
- `salas:paseJuego { partidaId }`: pase para `juego:<id>` y un **acta** firmada (motor, etapa, semilla, cupo) que
  la sala necesita para llevar el reloj. Solo para jugadores de esa partida.
- La sala firma un **recibo** al terminar (`packages/reglas/src/recibo.ts`). `partidas:cerrarJuntos { partidaId,
  recibo }` lo verifica con `SALA_SECRETO`, lo valida con `decidirRecibo` (misma partida y motor, no vencido, la
  partida lleva abierta al menos lo que dice el recibo, cada fila con `validarResultado`) y le paga a **cada**
  jugador una sola vez con `premioPartida`, misiones y logros. El que llega después recibe `{ ya: true }` con lo que
  le tocó. `cerrarPartida` no cierra estas partidas.
- `salas:paseViaje { sala }`: pase para un viaje compartido `viaje:<id>`. El pasaje y el bono siguen en
  `progreso:salirDeViaje` / `llegarViaje` para cada uno.
- `POST /salas/ocupacion` (`http.ts`): aviso firmado de cada sala de zona cada 30 s → `salas:reportar` (interna)
  guarda la fila en `salas`. `salas:conectados` (consulta pública) suma los avisos de los últimos 75 s por
  departamento y el mapa. La sala necesita `CONVEX_SITE_URL` (`https://<deployment>.convex.site`) en Cloudflare.

Tablas: `partidas.pagos` y `salas.momento` (con el índice `por_visto`) son nuevos y opcionales.

Confianza aceptada (ola 7): los puntajes, tanto solos como entre dos, los declara el navegador.
La firma de la sala prueba el recibo y su reloj, no que cada acción del juego ocurrió. Ambos cierres usan
`validarResultado`, con los mismos `TOPES`, mínimo de duración y `HOLGURA_S`; el dúo además acota cada
puntaje según el tiempo transcurrido. No se convierte la simulación en autoritativa en esta ola.

Los bloqueos tienen un límite duro de 200 en `amigos:bloquear` (`tope-bloqueos`, con aviso en el juego).
La sala guarda las listas completas fuera del adjunto del WebSocket y corta chat e invitaciones en ambos sentidos.
Los pases anteriores duran como máximo 60 s; una conexión ya abierta recibe los cambios del propio jugador.
Los viajes compartidos registran todas las cuentas admitidas: se rechaza entrar si alguna bloqueó a la nueva
cuenta o viceversa. Esa lista admite como máximo 8 jugadores y vence a los 30 min, con borrado programado.
Pendiente: quien bloqueó a un participante ya admitido tampoco puede reconectar hasta desbloquearlo, aunque
el otro se haya bajado. Convex no recibe la presencia de la sala del viaje para distinguir ese caso.
Los avisos de ocupación deben ser estrictamente posteriores al anterior, de hace menos de 75 s y como mucho
5 s adelantados. La vigencia corre desde la hora firmada, aunque el aviso llegue tarde.

Regresión de la segunda revisión (contra desarrollo, crea y borra invitados de prueba):
`node scripts/test-revision-2.mjs`. Incluye 200 bloqueos y espera los 3 minutos reales del vencimiento
programado. No la corras junto a publicaciones del panel. La prueba de navegador
`test-partida-juntos.mjs` usa su servidor local simulado; esta regresión cubre las mutaciones de Convex real.

Regresión de verificación: `node scripts/test-revision-3.mjs`. Crea invitados, comprueba el abandono individual,
el cobro único del compañero con recibo firmado, los estados admitidos por `paseJuego`, el cupo del viaje y
los vencimientos del scheduler. `pruebasVerificacion` contiene solo mutaciones internas administrativas que
adelantan fechas de esas filas de prueba o marcan una como rechazada; no están disponibles para jugadores.
La prueba borra sus invitados al terminar.

Tras desplegar sobre datos anteriores, `partidas:migrarAbiertas { "cursor": null }` programa los vencimientos y
completa las referencias de `aperturas` en tandas de 50. Repetí con el cursor devuelto hasta `listo: true`.
La migración es interna y se puede repetir.

Las cubetas de sala viven en memoria y se conservan al reemplazar un socket. Al cerrar el último socket de una
cuenta se borran su cubeta y sus bloqueos almacenados. Un pase anterior a un cambio de bloqueo no pisa ese cambio;
un pase nuevo sí actualiza la lista. Despertar de hibernación vuelve a llenar las cubetas.
