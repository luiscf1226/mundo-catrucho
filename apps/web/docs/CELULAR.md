# Celular: MC-56 y MC-04

## Estado al cierre (24 nov)

- **MC-04 · motores con los dedos:** los 148 motores del registro se juegan hasta el resultado solo con los
  controles táctiles, en un celular emulado. Además se jugaron tres motores en Chrome de un emulador
  Android (ver «Android de verdad»). Los fallos que encontró la prueba quedaron arreglados (ver «Lo que se arregló»).
- **MC-56 · 30 FPS:** en emulación de gama media (412×915, DPR 2,6, CPU ×4, GPU real) pasan 10 de 13 escenas
  en la corrida completa, pero casi todas justo en el límite: la ola de realismo se comió el margen (ver «Tercera
  ronda»). Ciudad y lluvia están en el borde (fallan o pasan según la corrida). El viaje en rapidito fallaba por la
  barra de progreso y quedó arreglado salvo un pico. **Falta medirlo en un celular físico de gama media**: no hay uno en
  la máquina de trabajo y el emulador Android dibuja por software (SwiftShader), así que sus FPS no sirven
  como medición. Los pasos para medirlo en tu celular están abajo.

## Medilo en tu celular (Luis)

1. Abrí el juego publicado con `#fps` al final de la dirección:
   `https://mundo-catrucho-web.luiscf1226.workers.dev/#fps` (cuando este cambio esté en `main` y publicado). Funciona igual con el HTML autónomo
   (`apps/web/dist/mundo-catrucho-hd.html#fps`) o con `pnpm dev` y la IP de tu compu en la misma red
   (`http://<ip>:5173/#fps`).
2. Aparece un recuadro a la izquierda, a media altura: FPS, p95 en ms, porcentaje de cuadros lentos
   (más de 34 ms), llamadas de dibujo y DPR. Verde si va bien; rojo si el p95 pasa de 34 ms o más del 5 %
   de los cuadros son lentos.
3. En cada escena esperá unos 5 s a que cargue y tocá **Medir 30 s** sin tocar nada más. Al terminar sale una
   línea para copiar: escena, FPS promedio, p95, % lentos, cuadros y el modelo del teléfono.
4. Escenas que conviene medir: el lobby (la más pesada en triángulos), Olancho, Tegucigalpa (calle con lluvia si
   toca), Cortés, el estadio (Fútbol), Ritmo, Corte, Grúas, Pesca en Yojoa, Calcita (cueva de Talgua) y el viaje en
   rapidito. Para el viaje: mapa → otro departamento → Viajar.
5. Pegá las líneas en el issue #56. **Pasa** si en cada escena el p95 es ≤34 ms y los lentos son ≤5 %.
   Cerrá el celular de otras apps y medí con la batería arriba de 50 % (el ahorro de energía baja los FPS).

El contador no usa red ni guarda nada; solo existe con `#fps` en la dirección.

## Medición reproducible (emulación)

Desde la raíz, con Chromium y GPU (sin otras pruebas de GPU al mismo tiempo):

```sh
pnpm --filter @mundo-catrucho/web build
flock -x /tmp/claude-1000/mc-gpu.lock node apps/web/tools/test-celular.mjs apps/web/dist/mundo-catrucho-hd.html cierre
MC_ESCENAS=yojoa,talgua node apps/web/tools/test-celular.mjs apps/web/dist/mundo-catrucho-hd.html prueba   # solo esas
MC_CPU=8 node apps/web/tools/test-celular.mjs apps/web/dist/mundo-catrucho-hd.html margen-x8   # margen, no exige umbral
```

Es **emulación**, no un teléfono físico: viewport 412×915, DPR del panel 2,6, entrada táctil y CPU
ralentizada cuatro veces por CDP. No emula memoria, temperatura ni la GPU de un celular. El script imprime el
renderizador y rechaza SwiftShader/llvmpipe. Se usa el HTML de producción, sin `#test`; el modo automático
pone DPR 0,75, sin antialiasing ni sombras para puntero grueso. Cada escena tiene 4 s de preparación y cinco
muestras de 4 s; el criterio es p95 ≤34 ms y ≤5 % de cuadros de más de 34 ms en **cada** muestra, menos de
350 llamadas de dibujo y ningún material recompilándose cada cuadro. Los datos crudos quedan en
`capturas/mc-56/<etiqueta>.json` y una captura por escena.

Escenas (13): lobby, Olancho, Francisco Morazán y Cortés (llegada), Fútbol (el estadio), Ritmo, Corte, Grúas,
**Yojoa** (Pesca en Yojoa, con el lago), **Talgua** (Calcita, en la cueva), **ciudad** (Tegucigalpa, calle
del centro), **lluvia** (la misma calle con lluvia y piso mojado, `#clima=lluvia`) y **rapidito** (viaje a Copán).

### Tercera ronda (cierre, 24 nov): la ola de realismo pesa

CPU ×4, GPU AMD Radeon 860M Graphics. Mediana de cinco muestras de 4 s; «peor» es la peor muestra. El tiempo de tarea es el del hilo principal por cuadro, ya ralentizado.

Corrida completa (13 escenas, carga 3,8 → 8,6 sobre 16 hilos, antes del arreglo de la barra):

| Escena | FPS | p95 ms (mediana / peor) | peor % >34 ms | ms de tarea | llamadas | pasa |
|---|---|---|---|---|---|---|
| lobby | 58,0 | 16,8 / 33,3 | 0,0 | 16,5 | 97 | sí |
| olancho | 52,1 | 33,4 / 33,4 | 0,0 | 19,0 | 58 | sí |
| franciscomorazan | 45,1 | 33,4 / 33,4 | 0,6 | 22,1 | 67 | sí |
| cortes | 44,6 | 33,4 / 33,4 | 0,5 | 22,1 | 58 | sí |
| futbol | 49,1 | 33,4 / 33,4 | 2,6 | 20,0 | 31 | sí |
| ritmo | 53,0 | 33,3 / 33,4 | 3,0 | 18,7 | 39 | sí |
| corte | 55,3 | 33,3 / 33,4 | 0,5 | 17,8 | 23 | sí |
| cortes.gruas | 42,8 | 33,4 / 33,4 | 2,4 | 23,0 | 30 | sí |
| yojoa | 59,8 | 16,8 / 16,8 | 1,5 | 12,7 | 16 | sí |
| talgua | 48,8 | 33,4 / 33,4 | 1,6 | 20,2 | 21 | sí |
| ciudad | 35,1 | 33,4 / 50,0 | 6,8 | 28,5 | 110 | **no** |
| lluvia | 36,1 | 33,4 / 50,0 | 5,2 | 27,6 | 110 | **no** |
| rapidito | 30,4 | 50,0 / 50,1 | 16,1 | 31,0 | 31 | **no** |

Después del arreglo de la barra del viaje (carga 7,0 → 9,5):

| Escena | FPS | p95 ms (mediana / peor) | peor % >34 ms | ms de tarea | llamadas | pasa |
|---|---|---|---|---|---|---|
| ciudad | 42,3 | 33,4 / 33,4 | 0,6 | 23,5 | 101 | sí |
| lluvia | 38,4 | 33,4 / 33,4 | 2,8 | 26,1 | 110 | sí |
| rapidito | 49,1 | 33,4 / 50,0 | 9,1 | 18,7 | 28 | **no** |

**Qué cambió desde la ola 11.** Las mismas escenas que antes gastaban 4 a 10 ms de tarea por cuadro ahora gastan 13 a
31 ms (CPU ×4). Es la ola de realismo: más objetos, materiales con más uniformes y más triángulos (la calle de
Tegucigalpa dibuja ~1 millón de triángulos en ~100 llamadas). Todas las escenas siguen bajo 350 llamadas y ningún
material se recompila cada cuadro, pero el margen se fue: casi todas pasan con el p95 justo en 33,4 ms (un cuadro de
30 Hz), no en 16,8 como antes.

**Lo que se arregló.** En el viaje en rapidito, la barra de progreso animaba su ancho con una transición CSS y se
actualiza 8 veces por segundo: siempre estaba en transición y pedía layout en cada cuadro. Sin esa transición el
rapidito pasó de 31 a 19 ms de tarea por cuadro y de 30 a 49 FPS de mediana. Le queda una muestra de cinco con un
pico (34 ms de tarea frente a 19 en las otras), que coincide con algo del camino (evento o cambio de tramo); no se
llegó a aislar.

**Lo que queda.** Ciudad y lluvia fallaron en la corrida completa por una muestra peor (p95 50 ms) y pasaron en la
segunda: el arreglo de la barra no las toca, así que la diferencia es ruido de la máquina compartida. Están en el
borde. El perfil de la calle de Tegucigalpa reparte el costo en el render de three.js (`updateMatrixWorld`, la
proyección de objetos, `renderBufferDirect` y la validación de WebGL); no hay un culpable único y barato. Lo siguiente
sería congelar las matrices de lo que no se mueve (`matrixAutoUpdate = false` en la ciudad, las casas y la vegetación)
y fusionar geometría de la calle en celular. Eso se decide con la medición en un teléfono de verdad.

**Condiciones.** Otra prueba de otro agente quedó colgada con el candado compartido de la GPU (más de dos horas), así
que estas corridas se hicieron sin el candado exclusivo, con la carga anotada (3,8 a 9,5 sobre 16 hilos). Por eso el
ruido entre corridas es grande. Datos en `capturas/mc-56/cierre.json` y `cierre-2.json`.


## Recorrido táctil (MC-04)

```sh
flock -s /tmp/claude-1000/mc-gpu.lock node apps/web/tools/test-tactil-motores.mjs apps/web/dist/mundo-catrucho-hd.html
MC_SHARDS=3 MC_SHARD=0 node apps/web/tools/test-tactil-motores.mjs …   # repartir en 3 procesos (0, 1 y 2)
MC_MOTOR=copan.adoquin,feria node apps/web/tools/test-tactil-motores.mjs …   # solo esos
node apps/web/tools/test-tactil-motores.mjs … --muestra   # 3 motores; es lo que corre `pnpm web:test` y GitHub
```

La lista sale del registro (`minigames/index.ts`); no hay una segunda lista. El celular es 412×915 con pantalla
táctil y sin teclado. Por cada motor:

1. **Tarjeta de inicio:** muestra controles táctiles y ninguno es de teclado (WASD, Shift, clic, «apretá F»…).
   Cada fila tiene que nombrar un control que existe: palanca, 🎯, E, Q, salto o el dedo en la pantalla.
2. **Controles a la vista:** palanca, 🎯, E, Q y salto están dentro de la pantalla y nada los tapa (hit test en su
   centro: HUD, guía de primeros pasos, chat).
3. **Toques de verdad** (`Input.dispatchTouchEvent` de CDP): la palanca se mueve con el dedo, se arrastra y se toca
   la pantalla, y se toca cada botón. Cada botón tiene que llegar al juego (`input.press`).
4. **Hasta el resultado:** toques sobre los mismos controles ya comprobados. En los motores del kit solo se adelanta
   el reloj (`avanzar(.25)` entre toques); las mecánicas reciben los mismos pasos. Feria (sin reloj) se juega de
   verdad: camina con la palanca al puesto, tira tocando los blancos y cobra el premio.
5. **Lo que la guía promete se usa:** al final se revisa que el motor haya leído cada control que su guía táctil
   promete (se cuentan las lecturas de la entrada; la prueba solo observa).
6. **HUD sin teclas:** mientras se juega, el HUD no puede pedir teclas.

No usa teclado, bots, `finish`, puntajes inyectados ni `window.__mc` para mover al jugador (solo lo lee para
saber hacia dónde caminar en Feria). Verifica un recorrido hasta el resultado con los dedos, no una estrategia
ganadora. Con `MC_GPU=0` (GitHub) corre una muestra de 3 motores e imprime `SALTA` con el resto.

### Lo que se arregló

| Hallazgo | Arreglo |
|---|---|
| El HUD de 100+ motores pedía teclas en el celular («A/D elegí · F confirmá», «Espacio dividir», «clic / F») | `ui/dedos.ts`: con pantalla táctil el HUD de los minijuegos cambia las teclas por los controles que hay: F → 🎯, A/D → Palanca ↔, W/S → Palanca ↕, Espacio → Salto, clic → tocá; quita las alternativas de mando y mouse. E y Q se quedan (son las letras de sus botones). |
| Carrera: con el celular se corría a media marcha (solo Shift activaba la carrera) | La palanca a fondo corre, como en el resto del juego (`carrera/Scene.tsx`). |
| Adoquín (Copán) y Arreo (Olancho): la guía prometía 🎯 «confirmar», pero el motor no lo usa | Guía honesta: se juega solo con la palanca o arrastrando. |
| Merendón (Cortés): la guía prometía mover indicadores con la palanca, pero solo se sube con 🎯 | Guía honesta: 🎯 sube un tramo, quieto descansás. |
| Tablas (Olancho): los rótulos 3D decían «INICIO · F» y «FIN · F» | Con pantalla táctil dicen 🎯. |

Algunos rótulos 3D sobre las mesas todavía nombran teclas (p. ej. «… F …» en Niebla); la prueba no lee texto 3D y
solo se cambiaron los de Tablas. El HUD, que es donde va la instrucción, ya habla con los controles táctiles.

Queda anotado, sin cambiar (está en `core/`, fuera de este ticket): un toque a E que nada usa queda guardado
hasta que algo lo usa. Si tocás E lejos de todo y después caminás hasta un puesto, el puesto se abre solo al
llegar. Pasa igual con la tecla E. Lo vio la prueba en Feria.

### Android de verdad (emulador)

Chrome de Android 15 en el emulador `bai35`, con el HTML servido desde la compu (`http://10.0.2.2:8765/#fps`)
y manejado solo con toques (`agent-device`): **Fútbol** («Potra de dos colores», partido completo hasta el
resultado, empate 0-0), **Telar** («Tela del mercado lenca», Intibucá) y **Papas** («Papa con toda su familia»,
Intibucá). Para llegar al Telar y a las Papas se caminó con la palanca hasta el puesto y se tocó E. En los tres el
HUD ya habla de 🎯, E y Q, y la tarjeta muestra los controles táctiles. Capturas en `capturas/mc-04/android/`.

El emulador dibuja con SwiftShader (por software): 4 a 14 FPS y el lienzo 3D no se compone en pantalla (los
píxeles del lienzo sí tienen la escena: el problema es del emulador al componer, no del juego). Por eso esos FPS **no** son una
medición de MC-56; solo comprueban que el contador `#fps`, los toques y el HUD funcionan en Chrome de Android.

## Tabla de los 148 motores

148 de 148 terminan con los dedos (7 con victoria). «Resultado» es la etapa jugada con toques al azar, no una estrategia: la derrota no es un fallo.

| Motor | Estado | Guía táctil | Controles que leyó | Resultado |
|---|---|---|---|---|
| intibuca.carrera | OK | Palanca: corré · Salto: saltá | palanca, jump | Derrota, 0 |
| intibuca.telar | OK | Palanca / arrastrá: ajustar ambos ejes · 🎯: confirmar | palanca, fire, use, pantalla | Derrota, 0 |
| intibuca.hongos | OK | Palanca / arrastrá: ajustar ambos ejes · 🎯: confirmar | palanca, fire, use, pantalla | Derrota, 0 |
| intibuca.callejero | OK | Palanca / arrastrá: ajustar ambos ejes · 🎯: confirmar | palanca, fire, use, alt, jump, pantalla | Derrota, 0 |
| intibuca.papas | OK | Palanca / arrastrá: ajustar ambos ejes · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| intibuca.semilla | OK | Palanca / arrastrá: ajustar ambos ejes · 🎯: confirmar | palanca, fire, use, alt, jump, pantalla | Derrota, 0 |
| intibuca.vaho | OK | Palanca / arrastrá: ajustar ambos ejes · 🎯: confirmar | palanca, fire, use, pantalla | Derrota, 0 |
| intibuca.ondas | OK | Palanca / arrastrá: ajustar ambos ejes · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| lempira.barro | OK | Palanca / arrastrá: ajustar ambos ejes · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| lempira.opalo | OK | Palanca / arrastrá: ajustar ambos ejes · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| lempira.cuencas | OK | Palanca / arrastrá: ajustar ambos ejes · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| lempira.rebote | OK | Palanca / arrastrá: ajustar ambos ejes · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| lempira.pigmentos | OK | Palanca / arrastrá: ajustar ambos ejes · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| lempira.trapiche | OK | Palanca / arrastrá: ajustar ambos ejes · 🎯: confirmar | palanca, fire, pantalla | Derrota, 5 |
| lempira.termal | OK | Palanca / arrastrá: ajustar ambos ejes · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| elparaiso.trivia | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| elparaiso.montuca | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| elparaiso.carrozamaiz | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| elparaiso.mina | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| elparaiso.tapisca | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| elparaiso.aleros | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| elparaiso.fronterafila | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| elparaiso.costura | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| valle.curil | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar · E: cambiar lo que registrás | palanca, fire, use, pantalla | Derrota, 0 |
| valle.bicitaxi | OK | E: pedal izquierdo · 🎯: pedal derecho · Palanca: inclinarte | palanca, fire, use, pantalla | Derrota, 0 |
| valle.embarque | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar · E: chaleco · pasar de lado | palanca, fire, use, pantalla | Derrota, 0 |
| valle.volcan | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| valle.raices | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar · E: cambiar de borda | palanca, fire, use, pantalla | Derrota, 0 |
| valle.saljocote | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| valle.redviva | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar · E: explicar | palanca, fire, use, pantalla | Derrota, 0 |
| valle.punche | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 25 |
| choluteca.puentes | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| choluteca.tortuga | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| choluteca.estanque | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| choluteca.sombra | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| choluteca.mielrosca | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| choluteca.cincha | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Victoria, 420 |
| choluteca.ventanasbus | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| choluteca.mareapaseo | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 70 |
| lapaz.catacion | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar · E: oler la taza | palanca, fire, use, pantalla | Derrota, 0 |
| lapaz.cafe | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar · E: levantar la hoja | palanca, fire, use, pantalla | Derrota, 0 |
| lapaz.tostador | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| lapaz.reciprocidad | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| lapaz.vapor | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar · E: abrir/cerrar la válvula | palanca, fire, use, pantalla | Derrota, 0 |
| lapaz.pesas | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar · E: tarar / registrar | palanca, fire, use, pantalla | Derrota, 0 |
| lapaz.abrasigo | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar · E: cambiar de estación | palanca, fire, use, pantalla | Derrota, 0 |
| lapaz.estiba | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Victoria, 741 |
| colon.salinidad | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| colon.visualbahia | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| colon.gajos | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| colon.remolque | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| colon.redjuvenil | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| colon.plano | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| colon.racimos | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| copan.cadera | OK | Palanca / arrastrá: ajustar ambos ejes · 🎯: confirmar | palanca, fire, use, jump, pantalla | Derrota, 0 |
| copan.glifos | OK | Palanca / arrastrá: ajustar ambos ejes · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| copan.guaras | OK | Palanca / arrastrá: ajustar ambos ejes · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| copan.estratigrafia | OK | Palanca / arrastrá: ajustar ambos ejes · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| copan.hojas | OK | Palanca / arrastrá: ajustar ambos ejes · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| copan.adoquin | OK | Palanca / arrastrá: elegir las diagonales; cada 2 s pasa un adoquín | palanca, pantalla | Derrota, 0 |
| copan.estelas | OK | Palanca / arrastrá: ajustar ambos ejes · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| copan.atol | OK | Palanca / arrastrá: ajustar ambos ejes · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| olancho.batea | OK | Palanca: ajustar posición o ángulo · 🎯: acción | palanca, fire, pantalla | Derrota, 0 |
| olancho.arreo | OK | Palanca / arrastrá: caminar alrededor del hato | palanca, pantalla | Derrota, 0 |
| olancho.calcita | OK | Palanca: ajustar posición o ángulo · 🎯: acción | palanca, fire, use, pantalla | Derrota, 0 |
| olancho.cuajada | OK | 🎯: agregar un peso | fire, pantalla | Derrota, 0 |
| olancho.postura | OK | Palanca arriba: avanzar · 🎯: alternar postura | palanca, fire, pantalla | Derrota, 0 |
| olancho.tablas | OK | Palanca: ajustar posición o ángulo · 🎯: acción | palanca, fire, pantalla | Derrota, 0 |
| franciscomorazan.niebla | OK | Palanca: elegir y mover copa · Arrastrá: ubicar copa · 🎯: abrir infiltración | palanca, fire, alt, pantalla | Derrota, 5 |
| franciscomorazan.baleada | OK | Palanca: doblar bordes · Arrastrá: elegir borde y doblarlo · 🎯: servir | palanca, fire, pantalla | Derrota, 0 |
| franciscomorazan.repartidor | OK | Palanca / tocá: elegir cruce · 🎯: alternar semáforo | palanca, fire, pantalla | Derrota, 0 |
| franciscomorazan.artesania | OK | Palanca / arrastrá: orientar pieza · 🎯: apoyar y probar tapa | palanca, fire, pantalla | Derrota, 0 |
| cortes.chuco | OK | Palanca / arrastrá: mover los indicadores · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| cortes.gruas | OK | Palanca / arrastrá: mover los indicadores · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| cortes.cortina | OK | Palanca / arrastrá: mover los indicadores · 🎯: confirmar | palanca, fire, pantalla | Derrota, 35 |
| cortes.garitas | OK | Palanca / arrastrá: mover los indicadores · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| cortes.merendon | OK | 🎯: subir un tramo · Quieto: descansás y juntás reserva | fire, pantalla | Victoria, 960 |
| cortes.cusuco | OK | Palanca / arrastrá: mover los indicadores · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| cortes.topo | OK | Palanca / arrastrá: mover los indicadores · 🎯: confirmar | palanca, fire, pantalla | Victoria, 240 |
| islas.ballena | OK | Palanca / arrastrá: mover la boya del grupo · 🎯: registrar el encuentro | palanca, fire, pantalla | Derrota, 0 |
| islas.coral | OK | Palanca / arrastrá: elegir módulo · 🎯: sembrar | palanca, fire, pantalla | Derrota, 0 |
| islas.bonacca | OK | Palanca / arrastrá: lancha y gancho · 🎯: entregar | palanca, fire, pantalla | Derrota, 0 |
| islas.estela | OK | Palanca / arrastrá: acelerar o frenar · 🎯: amarrar | palanca, fire, pantalla | Derrota, 0 |
| islas.flotacion | OK | Palanca / arrastrá: chaleco y respiración · 🎯: tomar la foto | palanca, fire, pantalla | Derrota, 0 |
| islas.colorprofundo | OK | Palanca / arrastrá: elegir color · 🎯: confirmar | palanca, fire, pantalla | Derrota, 120 |
| islas.cangrejo | OK | Palanca / arrastrá: mover el cursor · 🎯: poner o quitar cerca | palanca, fire, pantalla | Derrota, 120 |
| islas.absorcion | OK | Palanca / arrastrá: elegir lado · 🎯: echar líquido · E: revolver (¡mejor no!) | palanca, fire, use, pantalla | Derrota, 0 |
| comayagua.aserrin | OK | Palanca / arrastrá: mover la plantilla · E: sujetar · 🎯: soplar | palanca, fire, use, pantalla | Derrota, 0 |
| comayagua.reloj | OK | Palanca / arrastrá: rueda y péndulo · E: cambiar de eje · 🎯: encajar | palanca, fire, use, pantalla | Derrota, 0 |
| comayagua.eco | OK | Palanca / arrastrá: apuntar · 🎯: chasquido · E: dibujar galería | palanca, fire, use, pantalla | Derrota, 0 |
| comayagua.pilon | OK | Palanca / arrastrá: elegir compartimento · E: divisor o hielo · 🎯: servir | palanca, fire, use, pantalla | Derrota, 0 |
| comayagua.tenampua | OK | Palanca / arrastrá: terraza y bloque · E: otro bloque · 🎯: asentar | palanca, fire, use, pantalla | Derrota, 25 |
| comayagua.anden | OK | Palanca / arrastrá: elegir la hora · 🎯: asignar · E: devolver el último | palanca, fire, use, pantalla | Derrota, 0 |
| comayagua.mantas | OK | Palanca / arrastrá: izquierda inclina una, derecha la otra · 🎯: nada: ¡las dos manos en la manta! | palanca, pantalla | Derrota, 0 |
| comayagua.fachadas | OK | Palanca / arrastrá: elegir hueco · 🎯: pegar · E: descartar repetido | palanca, fire, use, pantalla | Derrota, 0 |
| atlantida.balsa | OK | Palanca / arrastrá: elegir remero · 🎯: palada adelante · E: palada atrás | palanca, fire, use, pantalla | Derrota, 0 |
| atlantida.pancoco | OK | Palanca / arrastrá: mover en la bandeja · 🎯: poner bollo · E: hornear · Saltar: dividir la masa | palanca, fire, use, jump, pantalla | Derrota, 0 |
| atlantida.vagon | OK | Palanca ← →: elegir apartadero · Palanca ↑ ↓: reordenar vagones · E: dejar el último vagón · 🎯: partir | palanca, fire, use, pantalla | Derrota, 0 |
| atlantida.manati | OK | 🎯: remada silenciosa · Palanca ↑ ↓: elegir canal | palanca, fire, pantalla | Derrota, 0 |
| atlantida.lancetilla | OK | Palanca / tocá: elegir pieza · 🎯: tomar pieza · E: revisar unión mala | palanca, fire, use, pantalla | Derrota, 0 |
| atlantida.canopy | OK | 🎯: soltarte · freno · Saltar (mantener): frenar | fire, jump, pantalla | Derrota, 0 |
| atlantida.carnaval | OK | Palanca / arrastrá: calle y largo · 🎯: deslizar barra · E: quitar barra | palanca, fire, use, pantalla | Derrota, 0 |
| franciscomorazan.rosquilla | OK | Palanca: girar la bandeja · 🎯: sacar la tanda | palanca, fire, pantalla | Derrota, 0 |
| franciscomorazan.taxi | OK | Palanca: acelerar, frenar y girar · 🎯: turbo y pito | palanca, fire, use, jump, pantalla | Derrota, 0 |
| franciscomorazan.asalto | OK | Palanca: correr (a fondo, más rápido) · ⤴: saltar · Quieto en un 🫣: esconderte | palanca, jump | Derrota, 0 |
| carrera | OK | Palanca: moverte y correr · ⬆: saltar | palanca, jump | Derrota, 0 |
| futbol | OK | Palanca: moverte · 🎯: patear | palanca, fire, alt, jump, pantalla | Victoria, 3 |
| feria | OK | E: entrar al puesto · Arrastrá: apuntar · 🎯: tirar | palanca, fire, use, jump, pantalla | Victoria, 200 |
| exploradores | OK | Palanca: explorar · E: recoger | palanca, use, jump, camara | Derrota, 0 |
| pulperia | OK | Palanca: moverte · E: agarrar y entregar | palanca, use, jump | Derrota, 0 |
| corte | OK | Deslizá el dedo: apuntar y cortar · Botón 🎯: cortar donde apuntás | fire, pantalla | Derrota, 280 |
| monta | OK | Palanca ← →: inclinarte · Botón de salto: brincar a tiempo | palanca, jump | Derrota, 137 |
| ritmo | OK | Tocá la pantalla: el carril más cerca de tu dedo · Botón 🎯: toca donde apuntaste | fire, pantalla | Derrota, 6720 |
| ruta | OK | Palanca: moverte · Botón de salto: saltar · Arrastrar: girar la cámara | palanca, jump, camara | Derrota, 0 |
| pesca | OK | Mantené la pantalla o 🎯: cargar, lanzar y jalar · Toque al picar: enganchar · Palanca: apuntar | palanca, fire, pantalla | Derrota, 0 |
| atrapa | OK | Palanca: moverte debajo de lo que cae | palanca, jump | Derrota, 20 |
| cocina | OK | Palanca: moverte · Botón E: agregar ingrediente / entregar | palanca, use, jump | Derrota, 0 |
| trivia | OK | Palanca: moverte · Quedate quieto: contestar ya | palanca, jump | Derrota, 0 |
| manejo | OK | Palanca: girar, acelerar y frenar · 🎯: claxon | palanca, fire, pantalla | Derrota, 0 |
| ocotepeque.trifinio | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| ocotepeque.archivoagua | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar · E: cambiar filtro | palanca, fire, use, pantalla | Derrota, 0 |
| ocotepeque.boveda | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar · E: contrafuerte | palanca, fire, use, pantalla | Derrota, 15 |
| ocotepeque.mercadomadruga | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 68 |
| ocotepeque.gotasviento | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| ocotepeque.reservas | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar · E: liberar reserva | palanca, fire, use, pantalla | Derrota, 0 |
| ocotepeque.moras | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar · E: sacar la de arriba | palanca, fire, use, pantalla | Derrota, 0 |
| ocotepeque.rotulos | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| graciasadios.lidar | OK | Palanca / arrastrá: subir o bajar el umbral · 🎯: cortar la copa · E: quitar el punto del umbral | palanca, fire, use, pantalla | Derrota, 0 |
| graciasadios.pipante | OK | Palanca / arrastrá: poner el remo · 🎯: remar en la proa · E: remar en la popa | palanca, fire, use, pantalla | Derrota, 0 |
| graciasadios.pistalempira | OK | Palanca / arrastrá: elegir en la fila · 🎯: sumar al grupo · E: cruzar la pista | palanca, fire, use, pantalla | Derrota, 0 |
| graciasadios.caratasca | OK | Palanca / arrastrá: corregir la deriva · 🎯: girar la carta ↻ · E: girar la carta ↺ | palanca, fire, use, pantalla | Victoria, 275 |
| graciasadios.rastros | OK | Palanca / arrastrá: elegir casilla · 🎯: marcar exclusión · E: observar desde ahí | palanca, fire, use, pantalla | Derrota, 0 |
| graciasadios.wabul | OK | Palanca / arrastrá: elegir fila o columna · 🎯: pasar el mazo · E: voltear el mazo ↔ ↕ | palanca, fire, use, pantalla | Derrota, 0 |
| graciasadios.truequeflotante | OK | Palanca / arrastrá: elegir bulto · 🎯: pasar el bulto | palanca, fire, pantalla | Derrota, 0 |
| santabarbara.chimenea | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| santabarbara.junco | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| santabarbara.caliza | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar · E: sondear | palanca, fire, use, pantalla | Derrota, 0 |
| santabarbara.perspectiva | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar · E: corregir la fuga | palanca, fire, use, pantalla | Derrota, 0 |
| santabarbara.goteo | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| santabarbara.juncocorte | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 15 |
| santabarbara.papel | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| yoro.cable | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar · E: soltar gancho | palanca, fire, use, pantalla | Derrota, 0 |
| yoro.acuerdos | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar · E: dejar pendiente | palanca, fire, use, pantalla | Derrota, 0 |
| yoro.jamo | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| yoro.ulua | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar · E: retirar equipos | palanca, fire, use, pantalla | Derrota, 0 |
| yoro.pijol | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar · E: cruzar | palanca, fire, use, pantalla | Derrota, 0 |
| yoro.almohadilla | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar | palanca, fire, pantalla | Derrota, 0 |
| yoro.coyol | OK | Palanca / arrastrá: mover el cursor · 🎯: confirmar · E: sacar del fuego | palanca, fire, use, pantalla | Derrota, 0 |

## Segunda ronda (ola 11): materiales que se recompilaban cada cuadro

**Causa.** three.js dibuja un material `transparent` con `side: DoubleSide` en dos pasadas
(caras de atrás y de adelante). Entre una y otra cambia `side` y marca `needsUpdate`, así que
la versión del material sube dos veces por cuadro y `setProgram` vuelve a calcular los
parámetros y la llave del programa (`WebGLPrograms.getParameters`) en cada dibujo. Lo hacían
todos los rótulos planos del kit (`Plate`, `Sign`, el letrero de `PortalArch`): 21 en Cortés,
unos 20 en Olancho y 28 en Francisco Morazán (cada uno ahorra una llamada de dibujo). En Fútbol, la
red del arco y dos rótulos.
Con CPU ×10, `getParameters` y la llave del programa sumaban ~11 % del perfil de Cortés.

**Cambio.** `forceSinglePass` en esos materiales: un plano no se tapa a sí mismo, así que una
sola pasada se ve igual (revisado en las capturas) y además ahorra la segunda llamada de dibujo.
También en el portal y el remolino (planos) y en la red del arco (transparente, sin escribir
profundidad). No cambia la calidad de escritorio; también la beneficia.
`test-celular.mjs` ahora falla si algún material sube su `version` más de una vez cada dos
cuadros durante una muestra. Con la base de `main` esa guarda falla en Cortés (20 materiales).

**Corte** no tenía ese problema (0 materiales recompilando). Su costo extra es
`updateMatrixWorld` sobre el grupo de piezas reutilizables (22 grupos, 545 objetos casi siempre
ocultos). Va a 60 FPS incluso con CPU ×8 y ×10, así que no se tocó. Se probó
`matrixWorldAutoUpdate`, pero en three r187 no poda los hijos y se descartó.

**Medición.** Base: `main` en `e4ca45f`. Después: rama `ola-11-mc-56-celular`. Mismo
Chromium 155.0.8059.84 y GPU AMD Radeon 860M (ANGLE, OpenGL ES 3.2). Las dos compilaciones se
alternaron con el candado exclusivo de GPU. La carga (`uptime`, 1 min sobre 16 hilos) se anota
al inicio y al final de cada corrida. Sigue siendo **emulación**, no un teléfono físico.
Mediana de cinco muestras; la columna «peor» es la peor de las cinco. El tiempo de tarea es el
del hilo principal por cuadro, ya ralentizado.

CPU ×4 (criterio). `antes` con carga 1,1→2,9; `despues` con carga 1,3→1,1:

| Escena | p95 antes/después | peor p95 | peor % >34 ms | ms de tarea por cuadro | llamadas | pasa |
|---|---|---|---|---|---|---|
| lobby | 16,8 / 16,8 | 16,8 / 16,8 | 0,0 / 0,0 | 6,6 / 6,3 | 104 / 104 | sí / sí |
| olancho | 16,8 / 16,8 | 50,0 / 16,8 | 20,2 / 0,9 | 9,8 / 5,0 | 104 / 84 | no / sí |
| franciscomorazan | 16,8 / 16,8 | 50,0 / 16,8 | 15,4 / 0,9 | 10,6 / 5,2 | 143 / 115 | no / sí |
| **cortes** | 16,7 / 16,7 | 16,8 / 16,8 | 0,0 / 0,0 | 9,5 / 5,0 | 114 / 93 | sí / sí |
| **futbol** | 16,7 / 16,8 | 16,8 / 16,8 | 0,9 / 0,0 | 6,2 / 4,1 | 43 / 39 | sí / sí |
| ritmo | 16,8 / 16,8 | 16,8 / 16,8 | 0,0 / 0,0 | 4,4 / 4,1 | 39 / 38 | sí / sí |
| **corte** | 16,7 / 16,8 | 16,8 / 16,8 | 0,0 / 0,0 | 4,1 / 4,1 | 23 / 23 | sí / sí |
| cortes.gruas | 16,7 / 16,8 | 16,8 / 16,8 | 0,0 / 0,0 | 4,8 / 4,7 | 32 / 32 | sí / sí |

Una segunda corrida `despues` (carga 2,9→1,2) también pasó las ocho escenas, con 4,8 ms por cuadro en
Cortés y 4,0 en Fútbol. Los fallos de `antes` en Olancho y Francisco Morazán son una sola muestra cada uno.
Con esta carga la base de `main` ya pasaba Cortés, Fútbol y Corte: el fallo de la ola 8 se debió
sobre todo a la contención del anfitrión. El cambio no se justifica por esos FPS. Se justifica por el margen:
el hilo principal hace casi la mitad de trabajo por cuadro en las zonas con rótulos.

CPU ×8 (margen, sin umbral). Dos rondas alternadas, carga entre 2,1 y 13:

| Escena | ronda 1: FPS antes/después | ms de tarea | ronda 2: FPS antes/después | ms de tarea |
|---|---|---|---|---|
| lobby | 57,8 / 54,3 | 16,2 / 18,4 | 57,3 / 52,3 | 16,5 / 18,9 |
| olancho | 57,5 / 60,0 | 16,5 / 8,8 | 56,3 / 60,0 | 16,9 / 13,9 |
| franciscomorazan | 52,0 / 59,3 | 18,5 / 13,0 | 54,1 / 60,0 | 17,8 / 14,8 |
| **cortes** | 14,8 / 59,8 | 69,3 / 12,7 | 59,3 / 60,0 | 15,2 / 9,5 |
| **futbol** | 60,0 / 60,0 | 8,2 / 10,4 | 59,8 / 60,0 | 11,0 / 7,5 |
| ritmo | 60,0 / 59,8 | 8,7 / 11,2 | 60,0 / 60,0 | 8,9 / 7,5 |
| **corte** | 59,3 / 60,0 | 9,1 / 11,6 | 60,0 / 60,0 | 8,4 / 8,5 |
| cortes.gruas | 59,5 / 59,8 | 9,4 / 11,5 | 60,0 / 59,8 | 9,1 / 8,8 |

El 14,8 de Cortés `antes` en la ronda 1 coincidió con carga alta. Con ×8 el ruido del anfitrión pesa más que
el cambio en las escenas sin rótulos (Fútbol, Ritmo, Corte, Grúas y lobby). Las diferencias allí van en los dos
sentidos según la ronda. También hubo una corrida `despues` ×4 con carga 7,9→9,3 que falló por un episodio de
contención de unos 25 s: cubrió las muestras 3 y 4 de Cortés y las 0 y 1 de Fútbol, con 22 a 29 ms de tarea
contra 7 ms en las demás. Queda en `capturas/mc-56/despues-ruido.json` y no se usa en la tabla.

**Lobby** no cambia: no tiene rótulos de doble cara. Dibuja ~2,1 millones de triángulos en 104 llamadas:
tres árboles instanciados de ~2 600 triángulos (unas 150 copias cada uno) y un terreno de 373 000. En
emulación no se nota porque la GPU es la del anfitrión, pero es lo primero que mediría en un teléfono físico.

## Primera ronda (ola 8)

La comparación es inconclusa: la carga del anfitrión compartido pasó de aproximadamente
6 a 25,8 sobre 16 hilos mientras corrían trabajos ajenos. No se alternaron las dos
compilaciones, por lo que no se atribuye la diferencia de velocidad solo a estos cambios.
La prueba final falla el umbral de estabilidad en Cortés, Fútbol y Corte. MC-56 queda
pendiente de repetir en un anfitrión sin esa contención y de medir en teléfono físico.

Cada celda muestra la mediana de cinco muestras. Los tiempos están en ms y el porcentaje
cuenta intervalos estrictamente superiores a 33 ms, incluidos los cuadros normales de 30 Hz.

| Escena | p50 antes/después | p95 antes/después | % >33 ms antes/después | FPS antes/después | Rango FPS después |
|---|---|---|---|---|---|
| lobby | 33.3 / 16.7 | 50.1 / 16.8 | 63.6 / 1.3 | 32.7 / 59.3 | 57.5–60.0 |
| olancho | 16.7 / 16.7 | 49.9 / 16.8 | 36.7 / 0.4 | 42.1 / 59.8 | 48.8–60.0 |
| franciscomorazan | 16.7 / 16.7 | 33.4 / 16.8 | 25.0 / 1.3 | 47.3 / 59.3 | 48.5–60.0 |
| cortes | 16.7 / 33.3 | 16.8 / 66.6 | 3.9 / 68.3 | 57.3 / 29.8 | 23.7–59.3 |
| futbol | 16.7 / 33.4 | 16.8 / 116.7 | 1.7 / 71.4 | 59.0 / 20.9 | 17.6–59.5 |
| ritmo | 16.7 / 16.7 | 33.4 / 33.4 | 25.8 / 12.0 | 46.5 / 52.0 | 27.4–59.5 |
| corte | 16.7 / 33.3 | 50.0 / 66.8 | 27.4 / 67.0 | 40.8 / 27.4 | 22.1–56.3 |
| cortes.gruas | 16.7 / 16.7 | 33.3 / 16.7 | 8.8 / 0.0 | 54.3 / 60.0 | 59.0–60.0 |

El perfil CDP separado de las muestras muestra `renderBufferDirect`, `bindVertexArray`,
`upload` y `updateMatrixWorld` entre los puntos de trabajo. La reducción de bots,
partículas y reflejos limita ese trabajo en la ruta móvil. El perfil queda en
`/tmp/mc-celular.cpuprofile`. Se necesitan mediciones sin contención para determinar
cuánto mejora el tiempo total de cuadro.

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/game/quality.ts` | Detección compartida de puntero grueso o CPU de hasta cuatro hilos. |
| `src/game/GameCanvas.tsx` | Aplica el nivel bajo automático sin cambiar las preferencias guardadas. |
| `src/game/dept/stations.tsx` | Un bot decorativo en calidad móvil. |
| `src/game/kit/art/hd/sky.tsx` | Menos gotas y menor costo y frecuencia de reflejos en móvil. |
| `src/game/minigames/corte/common.tsx` | Un tercio de la capacidad de partículas en móvil. |
| `src/ui/screens/Touch.tsx` | Botón de acción alterna disponible durante minijuegos. |
| `src/ui/panels/Misc.tsx` | La lista de conectados no depende de haber recibido su primera posición 3D. |
| `tools/harness.mjs` | Expone CDP y rechaza errores del protocolo para configurar emulación. |
| `tools/test-celular.mjs` | Medición de ocho escenas, cinco muestras por escena y umbral de estabilidad. |
| `tools/test-tactil-motores.mjs` | Registro completo, controles accesibles y etapa hasta resultado con entrada táctil. |
| `docs/CELULAR.md` | Método, resultados, límites y tabla de motores. |
| `src/game/kit/index.tsx` | Ola 11: `Plate` con `forceSinglePass`. |
| `src/game/kit/art/base.tsx` | Ola 11: `Sign`, `PortalArch` y la red de la portería con `forceSinglePass`. |
| `src/game/kit/art/hd/props2.tsx` | Ola 11: portal y red del arco con `forceSinglePass`. |
| `src/game/kit/art/roblox/props.tsx` | Ola 11: remolino con `forceSinglePass` (la red del arco roblox es una caja que escribe profundidad: sigue en dos pasadas). |
| `tools/test-celular.mjs` | Ola 11: `MC_CPU`, tiempo de tarea por cuadro y guarda de materiales recompilando. |
| `tools/test-tactil-motores.mjs` | Cierre: 148 motores con toques CDP, guía táctil honesta, controles que el motor lee, HUD sin teclas, muestra con `MC_GPU=0`. |
| `tools/test-celular.mjs` | Cierre: 13 escenas (Yojoa, Talgua, ciudad, lluvia y rapidito), `MC_ESCENAS`. |
| `src/ui/dedos.ts`, `src/ui/screens/Hud.tsx` | Cierre: el HUD de los minijuegos cambia las teclas por controles táctiles en el celular. |
| `src/ui/Diagnostico.tsx`, `src/App.tsx` | Cierre: contador `#fps` con «Medir 30 s». |
| `src/index.css`, `src/ui/screens/Viaje.tsx` | Cierre: barra del viaje sin transición de ancho. |
| `src/game/minigames/carrera/Scene.tsx` | Cierre: la palanca a fondo corre. |
| `src/game/minigames/{copan/Adoquin,olancho/Arreo,Merendon}.tsx` | Cierre: guías táctiles que dicen lo que el motor usa. |
| `src/game/minigames/olancho/Tablas.tsx` | Cierre: rótulos con 🎯 en el celular. |
| `package.json` | Cierre: `web:test` corre la muestra táctil. |

Las rutas de esta tabla son relativas a `apps/web`. Fue necesario tocar `GameCanvas`
y el arnés para medir la resolución de producción y aplicar la calidad automática.
No se cambiaron las metas, los premios, los motores registrados ni los identificadores
públicos de las pruebas.

Chromium usado: 155.0.8059.84. Base de la comparación:
`1a64b83a2fa2bbb5695165eb8ef35a735fa1369f` de `origin/ola-8`.

Con `MC_RESUME=1`, el recorrido puede retomar las filas OK ya guardadas para su
mismo fragmento. Usalo solo con el mismo HTML: no revalida esas filas. Esta ejecución
retomó un fragmento después de una terminación con código 137. Se volvieron a ejecutar
las comprobaciones generales después de reducir los procesos concurrentes propios.

La medición de FPS conserva la cámara de aparición y deja correr la simulación de
cada minijuego sin acciones del jugador. No cubre todos los recorridos ni la carga
máxima de jugadores remotos. El recorrido táctil se ejecuta aparte de la medición.
