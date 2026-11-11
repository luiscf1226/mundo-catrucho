# Mundo Catrucho — contrato interno del proyecto web

Un solo código (React + TypeScript + React Three Fiber + Tailwind + Zustand) produce **dos versiones**:

| Versión | `VITE_VARIANT` | Arte | Archivo |
|---|---|---|---|
| Mundo Catrucho Roblox | `roblox` | bloques, studs, avatar clásico de piezas | `mundo-catrucho-roblox.html` |
| Mundo Catrucho 3D | `hd` | 3D estilizado: formas suaves, texturas, sombras, día y noche, clima | `mundo-catrucho-hd.html` |

Las reglas, los datos y los niveles son los mismos. Cambia el **paquete de arte** (`src/game/kit/art/roblox` o `hd`).
`import { IS_HD, VARIANT } from 'src/variant'` si de verdad necesitas distinguir.

## Reglas duras

1. **Todo el texto que ve el jugador va en español** (hondureño, corto).
2. **Cero red en tiempo de ejecución.** Nada de `fetch`, imágenes, modelos, fuentes ni HDRI externos. No uses de drei:
   `Text`, `Text3D`, `Environment` con preset, `useGLTF`, `useTexture` con URL, `Cloud` (verifica) ni nada que descargue.
   Texto 3D = `Label` / `Plate` / `textTexture` del kit. Texturas = lienzo (`CanvasTexture`). La prueba falla si hay
   peticiones de red fuera de Google Fonts.
3. **Solo editas tus archivos** (ver "Dueños"). Si necesitas algo de otro módulo, resuélvelo en tu carpeta y avísalo
   en tu informe. Nunca reescribas `core/`, `kit/index.tsx`, `kit/core.ts`, `GameCanvas`, `PlayerController`,
   `minigames/api.ts`, `minigames/index.ts`, `tools/`, `shared/data/`.
4. **Las escenas no crean materiales ni personajes a mano.** Usan `Block`/`Cyl`/`Ball`/`Ground` con `mat` + `color`,
   la utilería `P.*` y `art.Avatar`. Así se ven bien en las dos versiones. (Excepción: efectos puntuales como
   partículas o un `meshBasicMaterial` para un brillo.)
5. **Jugable de verdad**: cada botón hace algo, cada minijuego tiene victoria y derrota, nada decorativo que parezca
   interactivo sin serlo.
6. **Rendimiento**: menos de ~350 llamadas de dibujo por escena (`t.calls()` en el arnés) y 60 fps en la prueba.
   Repite piezas con `InstancedMesh` o fusiona geometría estática si te pasas. Una sola luz con sombras (la del SkyRig).
7. Trabaja en tu rama de ticket y solo en lo que pide tu ticket (ver `AGENTS.md` en la raíz).

## Mapa del código

```
shared/data/*.json        datos compartidos con el proyecto de Roblox (departamentos, minijuegos, tienda, premios, logros)
src/variant.ts            VARIANT, IS_HD, TITLE
src/core/                 lógica sin 3D (portátil a Luau / C#)
  store.ts                useGame (Zustand): pantallas, paneles, perfil, monedas, XP, compras, misiones, logros, minijuego
  data.ts types.ts        datos tipados
  input.ts                `input`: teclado + mouse + táctil unificados
  phys.ts                 `phys` (mundo de colisiones), stepBody, bounceSphere
  player.ts               `player`: posición, cámara, animación, vehículo, cámara fija
  interact.ts env.ts audio.ts net.ts leaderboard.ts
src/game/
  GameCanvas.tsx          <Canvas>, escena activa, jugador
  PlayerController.tsx    control en tercera persona, cámara, vehículos; playEmote(), enterVehicle()
  kit/index.tsx core.ts   piezas para construir escenas (abajo)
  kit/art/types.ts        contrato del paquete de arte;  kit/art/base.tsx  versión sencilla de todo
  kit/art/roblox/  hd/    los dos paquetes de arte
  lobby/  dept/  minigames/  dev/Gallery.tsx
src/ui/                   interfaz (Tailwind)
tools/build.mjs harness.mjs smoke.mjs gallery.mjs
```

## Convenciones del mundo

- Unidades en metros. **Y hacia arriba.** El jugador mide 1.75 m, radio 0.42. Camina a 5.2 m/s, corre a 8.2 m/s
  (Shift o palanca a fondo), salta ~1.7 m de alto y ~5 m de largo corriendo.
- `yaw = 0` mira hacia **−Z**. La cámara por defecto queda detrás, en +Z.
- El suelo es `y = 0` salvo que la escena ponga `phys.ground = (x, z) => altura`.
- `pos` de `Block`/`Cyl`/`Ball` es el **centro**. `pos` de la utilería `P.*` es el **punto de apoyo en el suelo**.
- La física no tiene rampas: usa escalones de hasta 0.35 m (se suben solos), plataformas y `phys.ground`.
- `phys.limit = { r }` o `{ minX, maxX, minZ, maxZ }` encierra al jugador. `phys.killY` = altura de caída y reaparición.

## Kit (`import { ... } from '../kit'`)

```tsx
<art.SkyRig time="dia|tarde|noche|auto" weather="despejado|lluvia|neblina|auto" shadowRadius={45} indoor fogFar />
<Spawn pos={[0,0,8]} yaw={0} />                       // dónde aparece (y reaparece) el jugador
<Ground size={200} color="#58a845" mat="grass" />      // plano visual en y=0
<Block pos size={[w,h,d]} color mat rot solid cast />  // caja con colisión (solid por defecto)
<Cyl pos r h color mat solid rTop sides />  <Ball pos r color mat />
<Wall pos size />                                      // colisión invisible
<Interactable pos radius label icon onUse enabled marker />   // "E · etiqueta"
<Trigger pos size onEnter onExit />
<CoinPickup pos value onPick />                        // suma al monedero salvo que pases onPick
<Label pos text h fg bg />  <Plate pos text h rot fg bg />    // texto en 3D sin descargar fuentes
<P.Tree pos rot scale color seed solid />              // utilería del arte activo; lista completa en kit/art/types.ts:
//   Tree Palm Pine Bush Flowers Rock House Lamp Bench Fence Flag Stall Kiosk Fountain Statue Sign PortalArch
//   Bus Mototaxi Car Boat Cone Barrel Crate Tire SoccerBall Goal Coin Gem Macaw
<art.Avatar config={AvatarConfig} state={{ anim, speed }} name="Nombre" />   // NPC y bots; `state` es mutable
useTick((dt, t) => {})        // bucle de juego; se pausa con paneles y diálogos; dt ≤ 0.05
useMgTick((dt, t) => {})      // igual, pero solo corre con el minijuego en fase 'playing'
useCollider(() => boxCol(pos, size) | cylCol(pos, r, h), deps)   // colisionador propio; moveBox(c, pos, size, dt) para plataformas móviles
textTexture(texto, { fg, bg, size })
```

Materiales (`mat`): `plastic grass dirt sand stone cobble brick wood metal tile stucco roof water neon glass cloth
asphalt concrete leaf gold`. El color lo eliges tú; la textura la pone el arte.

Animaciones (`Anim`): `idle walk run jump fall dance dance2 celebrate wave clap kick throw carry drive sit`.

## Jugador (`import { player } from 'core/player'`)

```ts
player.pos                      // [x, y, z] de los pies (mutable)
player.body.vel                 // velocidad
player.teleport(x, y, z, yaw?)  player.setSpawn(pos, yaw)  player.respawn()
player.control = false          // el jugador deja de responder (puestos de feria, cinemáticas)
player.speedMul / jumpMul       // multiplicadores temporales
player.fixedCam = { pos, target, fov }   // cámara fija; null = vuelve a seguir al jugador
player.play('kick', 0.4)        // animación forzada por unos segundos
player.visible = false
```
Todo esto se restablece solo al cambiar de escena.

Entrada (`import { input } from 'core/input'`): `input.mx`, `input.mz` (−1..1), `input.take('fire' | 'use' | 'alt' | 'jump')`
(true una vez por pulsación; `fire` = clic, tecla F o botón táctil 🎯), `input.px`, `input.py` (puntero −1..1 para
apuntar), `input.pointerDown`. Ojo: `use` (E) lo consume el `Interactable` más cercano si hay uno.

## Estado (`import { useGame } from 'core/store'`)

`useGame.getState()`: `openPanel(id)`, `closePanel()`, `showDialog({ title, text, icon })` (pausa el juego),
`toast(texto, icono)`, `travel(deptId)`, `goLobby()`, `startMinigame(id)`, `pickupCoin()`, `collect(deptId)`,
`addCoins(n)`, `bump(tipo, n)` (misiones), `profile` (monedas, nivel, avatar, visitados, sala…).
Paneles: `mapa minijuegos personaje tienda pausa ajustes misiones logros clasificacion salas controles emotes proyecto`.

## Minijuegos (`src/game/minigames/<Nombre>.tsx` exporta el componente de escena)

Ciclo: `intro` (la UI muestra la tarjeta y el botón Empezar) → `playing` → `ended` (la UI muestra resultados).
La escena se monta desde `intro`; "Otra vez" la vuelve a montar desde cero.

```ts
import { finish, setHud, starsFor, fmtTime, rulesOf, useMgPhase } from './api';
useMgTick((dt) => { ... setHud({ timer: segundos, score: '2 - 1', objective: 'texto corto', lines: [] }); });
finish({ won, stars: 0|1|2|3, score /* mayor es mejor */, label: '1:02' | '3 - 1' | '320 pts', stats: { goals } });
```
Las recompensas (monedas, XP, logros, misiones, tabla) las calcula `store.finishMinigame`; el minijuego no las toca.
Reglas y umbrales: `rulesOf('carrera')` lee `shared/data/minigames.json`.

## Interfaz y pruebas

Los `data-testid` de `src/ui/UIRoot.tsx` son contrato: `menu`, `btn-jugar|explorar|minijuegos|personaje|tienda`,
`hud`, `hud-coins`, `hud-level`, `hud-xp`, `hud-btn-<panel>`, `panel-<id>`, `panel-close`, `map-dept-<id>`, `map-go`,
`map-lobby`, `mg-card-<id>`, `mg-intro`, `mg-start`, `mg-back`, `mg-hud`, `mg-timer`, `mg-score`, `mg-result`
(con `data-won`), `mg-result-label`, `mg-replay`, `mg-exit`, `shop-tab-<cat>`, `shop-item-<id>`, `ed-name`,
`ed-skin-<i>`, `ed-done`, `prompt`, `dialog`, `dialog-close`, `toast`, `pause-*`, `set-*`, `mission-*`, `room-*`,
`emote-<id>`, `touch-joy|jump|use|fire`.

```bash
cd apps/web
pnpm typecheck                                           # tipos
node tools/build.mjs hd --out <carpeta-propia>          # o roblox | all. Con varios agentes, cada uno con su --out
node tools/smoke.mjs <carpeta-propia>/mundo-catrucho-hd.html [carpeta-capturas]
node tools/gallery.mjs <html> <carpeta> [noche|tarde|lluvia|auto]     # hojas de la galería de arte
```
`tools/harness.mjs` (léelo, es corto): `launch(file, { hash, width, height, touch })` o `run(nombre, file, opts, fn)`.
Usa Chromium sin ventana **con GPU real (60 fps)**. Hashes útiles: `#test` (resolución baja, sin sombras, para pruebas
de lógica), `#go` (salta menú y creación), `#go,galeria`, `#nohud`. En la página: `window.__mc = { store, player, phys,
input, audio, interactions, env, gl }`.
Para ver tu trabajo: `t.shot(ruta)` y abre el PNG. Mira tus capturas con ojo crítico en cada vuelta.
Escribe tu prueba en `tools/test-<algo>.mjs`; debe terminar con código 0 e imprimir PASA.

---

# Segunda vuelta: Mundo Catrucho 3D (solo la versión `hd`)

El usuario eligió la versión 3D. **Solo se construye y se prueba `hd`** (`node tools/build.mjs hd --out …`). La versión
`roblox` ya no importa: no la rompas a propósito, pero no gastes tiempo en ella.

## Qué cambia

- **No hay menú de minijuegos.** A un minijuego solo se entra caminando hasta su puesto dentro de un departamento.
- **Lobby = mapa gigante de Honduras** que se camina. Cada departamento se ve según lo que tiene. Alrededor, lo más
  conocido del país y la terminal de buses.
- **Tres formas de viajar**: caminando sobre el mapa gigante, con el mapa 2D (panel `mapa`, viaje directo) y desde la
  terminal (panel `transporte` → viaje simulado en rapidito, taxi o bus amarillo → `store.startViaje(veh, deptId)`).
- **Catálogo**: cada departamento tiene de 10 a 20 juegos. Cada juego = un **motor** + un **tema** del departamento.
- **Etapas**: los juegos son largos. Cada juego tiene `etapas` (3 a 6); cada partida es una etapa y el avance se guarda.
- **Modos**: `solo` (contra bots), `duo` (vos + un compa bot contra parejas), `abierto` (sala que se llena con bots).
  No hay servidor: los demás siempre son bots y se muestran como bots (🤖).

## Catálogo (`shared/data/catalogo/*.json`, lo escribe el coordinador)

```ts
import { CATALOGO, catDe, JUEGOS, juegoById, PALABRAS, TRANSPORTES } from 'core/data';
catDe('olancho') // DeptCat { tipos: '🐂🔪…', lugares: Lugar[], comidas: Comida[], palabras: Palabra[], juegos: Juego[] }
// Lugar   { id, name, kind: 'ciudad'|'pueblo'|'playa'|'montana'|'lago'|'rio'|'ruinas'|'parque'|'isla'|'mercado'|'iglesia'|'estadio'|'cueva'|'finca'|'selva'|'puerto'|'fuerte', nota }
// Comida  { name, lugar, nota }      Palabra { dice, es }   (hondureñismos de la zona)
// Juego   { id: 'depto.juego', dept, lugar, name, motor: MinigameId, icon, desc, guino, tema, etapas }
useGame.getState().startJuego('lapaz.cortecafe')   // así se entra a un juego (desde un puesto). Al salir vuelve al mismo punto.
```
Hoy están completos `franciscomorazan`, `comayagua` y `lapaz` (archivo `centro.json`); los demás llegan durante la
tarea con la misma forma. **Todo código debe aguantar un departamento sin catálogo** (`catDe` devuelve listas vacías).

## Motores (`src/game/minigames/<Motor>.tsx`)

Motores: los cinco de antes (`carrera futbol feria exploradores pulperia`) y nueve nuevos:
`corte monta ritmo ruta pesca atrapa cocina trivia manejo`. Cada archivo nuevo exporta **el componente** y **`guia`**:

```ts
import { finish, setHud, starsFor, fmtTime, partida, rng, useMgPhase, type Guia } from './api';
export const guia: Guia = { goal: 'una frase', keys: [['WASD','moverte']], touch: [['Palanca','moverte']], metas: p => ['150 pts','250 pts','350 pts'] };
export function Corte() { const P = useMemo(partida, []); … }
// P = { juego, tema, etapa, etapas, dif /*0..1 según etapa*/, modo, dept, seed }   rng(P.seed) → () => 0..1
```
Reglas de un motor:
- **El tema manda la apariencia y los nombres; el motor pone el juego.** Todos los campos del tema son opcionales:
  poné valores por defecto para todo. Un juego abierto con `startMinigame('corte')` (sin catálogo) debe funcionar.
- **Etapas**: `P.dif` sube la dificultad (más rápido, más cosas, menos margen). Una etapa dura de 60 a 120 s.
  Que la etapa 1 sea fácil de ganar y la última cueste.
- **Puntaje en puntos**: `finish({ won, stars, score, label: '320 pts' })`. `won` = llegó a la meta de 1 estrella.
- **Modos**: `P.modo === 'duo'` → mostrá un compa bot que ayuda (un avatar con nombre «🤖 …»); `abierto` → dos o tres
  bots alrededor haciendo lo mismo. Con que se vean y sumen ambiente basta; el ranking lo calcula la tienda.
- **Formas**: cuando el tema nombra cosas (`[nombre, forma, color?]`), dibujá las formas que conocés con piezas del
  kit y para una forma desconocida usá una bola del color dado con su `Label`. Nunca falles por un tema raro.
- **Guiños**: mostrá `tema.frases` (si hay) como `toast` de vez en cuando. Texto corto, español de Honduras, voseo.
- Sonido: `audio.sfx(nombre)`; para ritmo y campanas `audio.tone(freq, dur, { type, gain, at })`, `audio.drum(f, dur, gain, at)`, `audio.now`.

### Tema de cada motor
```
comunes   fondo?: 'costa'|'montana'|'valle'|'pueblo'|'ciudad'|'lago'|'selva'|'cueva'|'estadio'|'mar'|'rio'|'finca'|'mercado'|'ruinas'|'feria'
          frases?: string[]
corte     cosas: [nombre, forma, color?][]   evita?: [nombre, forma][]   arma?: 'machete'|'cuchillo'|'hacha'
          formas: pastel cana coco pina sandia lena queso platano ayote pan tabaco elote pescado melon papa mango jocote pepino · evita: avispa piedra
monta     montura: 'toro'|'caballo'|'burro'|'mula'|'tabla'|'balsa'|'cayuco'|'tirolesa'   nombre?: string
ritmo     estilo: 'punta'|'marimba'|'banda'|'tambor'|'campanas'|'sique'|'dembow'   toca?: 'baila'|'marimba'|'tambor'|'campana'
ruta      estilo: 'cerro'|'cueva'|'ciudad'|'selva'|'ruinas'|'playa'|'canopy'|'rio'|'pueblo'|'mina'   meta: string   junta?: [nombre, forma]
pesca     agua: 'lago'|'mar'|'rio'|'laguna'   desde: 'muelle'|'lancha'|'cayuco'|'orilla'   peces: [nombre, puntos, color?][]   basura?: string[]
atrapa    cae: [nombre, forma, color?][]   evita?: [nombre, forma][]   con: 'canasta'|'balde'|'sombrero'|'red'|'saco'|'huacal'
          formas: pez mango coco cafe fresa papa maiz naranja camaron pan hoja moneda jocote durazno platano curil cangrejo pina zanahoria repollo · evita: piedra rama zapato avispa
cocina    plato: string   pasos: [nombre, color][]   extras?: [nombre, color][]   sirve?: 'plato'|'tortilla'|'hoja'|'bolsa'|'olla'|'vaso'|'calle'
trivia    de: 'palabras'   preguntas?: [pregunta, correcta, mala1, mala2][]      (sin preguntas: se arman con catDe(dept).palabras y PALABRAS)
manejo    veh: 'rapidito'|'taxi'|'bus'|'mototaxi'|'lancha'|'pickup'|'bici'|'cayuco'|'moto'|'camion'   via: 'ciudad'|'carretera'|'montana'|'mar'|'rio'|'costa'
          recoge?: [nombre en plural]   destino?: string
futbol    equipo: [nombre, color]   rival: [nombre, color]            exploradores  sitios: [deptId]
```

## Pruebas de la segunda vuelta
`__mc.store.getState().startJuego('comayagua.mangos')` abre un juego del catálogo en su tarjeta de inicio;
`[data-testid=mg-start]` lo empieza. `mg-modo-solo|duo|abierto` cambian el modo. Tu prueba (`tools/test-<algo>.mjs`)
debe jugar de verdad al menos una etapa hasta `mg-result`, probar un tema del catálogo y el motor sin tema, y mirar
capturas con ojo crítico. Construí siempre con tu propio `--out`. **Tiempo: unos 40 minutos; no pulas de más.**
Al terminar, matá tus Chromium (el arnés lo hace solo si usás `run`).

## Carga por departamento (MC-55)

`pnpm --filter @mundo-catrucho/web build:web` produce `dist/web/index.html` y sus assets para alojamiento estático
(por ejemplo Cloudflare). `node tools/build.mjs web --out <carpeta>` permite aislar la salida. El comando imprime
bytes sin compresión: HTML + dependencias JS estáticas + CSS inicial, sin Google Fonts, y cada trozo diferido.
La primera carga debe quedar debajo de 3 000 000 bytes. El catálogo sigue en `core/data.ts`: partirlo queda pendiente
de la integración del catálogo en Convex; no se modificó ese módulo.

- Departamento nuevo: poné su constructor en `src/game/dept/zones/<id>.tsx` y agregá una línea con `import()` en
  `zones/index.ts`. No lo reexportés ni lo importés estáticamente desde el lobby. `zoneOf` es un recurso para usar
  durante el render bajo `Suspense`; descarga el constructor, prepara la zona y la conserva al volver. Los módulos
  comunes (`zone`, piezas, estaciones) se comparten sin duplicar el código específico de otros departamentos.
- Motor nuevo: exportá el componente y su `guia` como siempre. Agregá una sola línea
  `nuevo: motor(() => import('./Nuevo').then((m) => ({ ...m, default: m.Nuevo }))),` al registro de
  `minigames/index.ts` (además del tipo y los datos del motor). La escena y la guía usan la misma promesa; no importés
  la guía desde la UI. `motorGuide(id)` suspende mientras se carga. Exploradores carga las zonas de sus sitios al abrirlo.
- `LoadingScreen` muestra «Ya casi… Estamos preparando tu destino.» mientras falta código de escena o guía.
- El modo habitual `build` sigue produciendo `mundo-catrucho-hd.html` autónomo: las importaciones dinámicas se incrustan,
  sin peticiones de assets. La excepción a cero red del modo web son únicamente los assets del mismo sitio.

`node tools/test-carga.mjs` sirve `dist/web` en un puerto local efímero, registra solicitudes y bytes y comprueba
menú/lobby sin zonas ni motores, Olancho sin otros departamentos y Corte sin otros motores. También funciona con
`MC_GPU=0 MC_LENTO=6`. Guarda las capturas en `capturas/mc-55/`; bloquea la respuesta de Olancho hasta capturar el
aviso para observarlo sin depender de la velocidad de la máquina. El arnés acepta `{ url: 'http://127.0.0.1:<puerto>/' }`
y permite exclusivamente ese origen (además de Google Fonts); sin esa opción mantiene intacta la política de `file://`.

## Kit de motores

Para un motor nuevo usá `defineMotor` de `minigames/kit`. Los motores anteriores siguen con su API actual.
El kit toma una foto de `partida()`, prepara tres segundos de cuenta regresiva, corre la simulación únicamente
mientras `mg.phase === 'playing'` y respeta la pausa. Valida una duración de 60–120 segundos, publica tiempo,
puntos, meta, objetivo y líneas en el HUD y llama una sola vez a `finish` con `starsFor`.
El guardado, recompensas y desbloqueo de etapas siguen siendo responsabilidad de `store.finishMinigame`.

1. Elegí un motor exclusivo del departamento en `docs/generador/contenido.json`. Agregá su ID a `MinigameId`,
   sus datos a `shared/data/minigames.json` y un juego de 3–6 etapas al catálogo del departamento.
2. Definí parámetros en `etapa(P)` usando `P.dif`. Interpretá aquí los campos opcionales de `P.tema` con valores
   por defecto. `crear(parametros)` produce el estado mutable de una partida, sin estado compartido entre intentos.
3. Implementá `actualizar(motor, dt)` y `Escena({ motor })`. Usá `motor.sumar(n)` para puntos (admite penalizaciones),
   `motor.objetivo`, `motor.lineas` y `motor.stats` para feedback. `motor.datos` contiene tu simulación y
   `motor.parametros` los parámetros. Leé la entrada en `actualizar`, que comienza después de la cuenta regresiva.
4. Implementá `bot(motor, dt, actor)` con las mismas acciones que usa el jugador. `actor === 'compa'` ayuda en dúo;
   `actor === 'jugador'` juega la prueba. No asignes puntos directamente desde el bot. El kit muestra un rival en
   solo, un compa en dúo y tres bots de ambiente en abierto, con avatares y nombres «🤖 …».
   Reservá el lado derecho de la escena (x=5..9, z=-1) para esos avatares. El kit muestra `tema.frases` como toast.
5. Exportá `motor.Escena` y `motor.guia`, registralos en las dos tablas de `minigames/index.ts` sin reorganizarlas.
   Construí HD y corré `node tools/test-motor.mjs dist/mundo-catrucho-hd.html <motorId> [juegoId]`.
   Repetí con `MC_GPU=0 MC_LENTO=6`. Las capturas quedan en `capturas/mc-32/<motorId>/` (o sufijo `-sin-gpu`).

Ejemplo de forma de la API (ver `Rosquilla.tsx` para una implementación jugable):

```tsx
const motor = defineMotor({
  id: 'franciscomorazan.rosquilla',
  guia: { goal: 'Sacá la tanda a tiempo.', keys: [['F', 'sacar']], touch: [['🎯', 'sacar']] },
  etapa: (p) => ({ velocidad: 1 + p.dif }),
  metas: (p) => [80 + 80 * p.dif, 180 + 80 * p.dif, 280 + 80 * p.dif],
  duracion: (p) => 70 + 20 * p.dif,
  crear: () => ({ calor: 0 }),
  actualizar: actualizarHorno,
  bot: jugarHorno,
  Escena: EscenaHorno,
});
export const Rosquilla = motor.Escena;
export const guia = motor.guia;
```

Con `#test` se instala `window.__mcTest.motor`. `estado()` devuelve ID, etapa (base cero), etapas, modo,
bots, cuenta, tiempo transcurrido, duración, puntos, metas, terminado y stats. `jugarBot(activo = true)` enciende
el jugador automático. `avanzar(segundos)` simula hasta 123 segundos en pasos de 50 ms pasando por las mismas
acciones, calor, puntajes y cierre que el reloj normal. No salta directo al resultado ni modifica el perfil.
El gancho se limpia al desmontar y no se instala fuera de `#test`.

La prueba genérica verifica derrota por inacción, motor sin tema, victoria de primera etapa, guardado tras recargar,
dúo y abierto, y llega a la última ganando las intermedias. En CPU recorta modos y etapas posteriores con `SALTA`.
Los controles específicos de cada mecánica se verifican además con el arnés (teclado, puntero o táctil).
