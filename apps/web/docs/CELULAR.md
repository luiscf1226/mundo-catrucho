# Celular: MC-56 y MC-04

## Medición reproducible

Desde la raíz, con Node 26.8.2 y Chromium con GPU:

```sh
pnpm --filter @mundo-catrucho/web build
CHROME_BIN=/usr/lib/chromium/chromium node apps/web/tools/test-celular.mjs apps/web/dist/mundo-catrucho-hd.html despues
MC_CPU=8 node apps/web/tools/test-celular.mjs apps/web/dist/mundo-catrucho-hd.html despues-x8   # margen, no exige umbral
CHROME_BIN=/usr/lib/chromium/chromium node apps/web/tools/test-tactil-motores.mjs apps/web/dist/mundo-catrucho-hd.html
```

Es **emulación**, no una medición en un teléfono físico. El viewport es 412×915, DPR del
panel 2,6, entrada táctil y CPU ralentizada cuatro veces por CDP. ×4 representa una
reducción reproducible del presupuesto de CPU del anfitrión; no está calibrado contra
un teléfono específico. No emula memoria, temperatura ni GPU de un celular. El script
imprime el renderizador y rechaza SwiftShader/llvmpipe. No correr otras pruebas de GPU
al mismo tiempo que la medición.

Se usa el HTML de producción, sin `#test` (ese modo baja el DPR a 0,6 y quita sombras).
El modo automático usa DPR 0,75, sin antialiasing ni sombras para puntero grueso o CPU
de hasta cuatro hilos. No modifica las preferencias guardadas ni el nivel de escritorio.
La resolución efectiva y las llamadas de dibujo se guardan en cada muestra. También
se reduce de dos a cuatro bots decorativos a uno, las partículas a un tercio y la
lluvia de 1500 a 400 gotas. Los reflejos usan un cubemap de 32 px y se actualizan
cada 10 s como máximo, frente a 64 px y 1,5 s en escritorio.

Cada escena recibe 2,5 s de preparación y cinco muestras de 4 s mediante
`requestAnimationFrame`. Se informa p50, p95 en milisegundos, FPS promedio y porcentaje
de intervalos superiores a 33 y 34 ms. El criterio de estabilidad es p95 ≤34 ms y
≤5% de cuadros superiores a 34 ms en **cada** muestra: el margen de 0,67 ms evita
confundir el redondeo del timestamp a 33,4 ms con un incumplimiento de 30 Hz.
Cada muestra guarda también `msTareaPorCuadro` (tiempo de tareas del hilo principal ya
ralentizado, por `Performance.getMetrics`): con vsync los FPS se topan en 60 y esconden el
margen. `MC_CPU=N` cambia la ralentización para medir margen; el umbral solo se exige con ×4.
Las etiquetas que empiezan con `antes` solo registran la línea base. Las demás exigen además
que ningún material suba su `version` cada cuadro (ver «Segunda ronda»).
Si otro agente usa la GPU, envolvé la medición con `flock -x /tmp/claude-1000/mc-gpu.lock`.
Las capturas se toman fuera del intervalo medido. Los resultados crudos quedan en
`capturas/mc-56/{antes,despues}.json`. No se puede inferir un porcentaje de mejora
universal de estos datos ni garantizar 30 FPS en hardware móvil sin probarlo allí.

## Recorrido táctil

La prueba deriva la lista del registro de motores; no mantiene una segunda lista.
Usa toques CDP para iniciar y eventos PointerEvent con `pointerType: 'touch'` para
palanca, puntero, acción, uso, salto y acción alterna. No usa teclado, bots, asignación
de puntajes ni `finish`. Comprueba que el centro de los controles está dentro de la
pantalla y responde al hit test, antes de emitir eventos sintéticos.

En los motores del kit se acelera únicamente el reloj por `avanzar(.25)` entre
acciones; las mecánicas reciben los mismos pasos de 50 ms. Los otros motores usan
su reloj real. Esto verifica un recorrido hasta resultado (victoria **o derrota**),
no una estrategia ganadora, todas las etapas ni la ergonomía de dedos físicos.
La tabla distingue el resultado y los motores que no terminan. Un timeout o control
inaccesible deja la prueba en rojo. La acción alterna Q ya tiene botón táctil.

La tabla completa y las capturas por motor quedan en `capturas/mc-04/motores.md`,
`motores.json` y `<motor>-{jugando,resultado}.png`. Para repartir una ejecución local
se admiten `MC_SHARDS=N MC_SHARD=0..N-1`; cada proceso escribe su propia tabla.
Ambas pruebas imprimen `SALTA` con `MC_GPU=0` y no presentan ese salto como medición.

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
| `src/game/kit/art/roblox/props.tsx`, `props2.tsx` | Ola 11: remolino y red del arco con `forceSinglePass`. |
| `tools/test-celular.mjs` | Ola 11: `MC_CPU`, tiempo de tarea por cuadro y guarda de materiales recompilando. |

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

## Tabla de los 80 motores

OK significa etapa hasta resultado con toques y controles accesibles. No significa
victoria. Se ganaron 5 etapas. Feria usa un recorrido dirigido por palanca y
tiros. Exploradores usa su reloj real completo y cierra los diálogos por toque.

| Motor | Estado | Resultado |
|---|---|---|
| intibuca.carrera | OK | Derrota, 0 puntos |
| intibuca.telar | OK | Derrota, 0 puntos |
| intibuca.hongos | OK | Derrota, 0 puntos |
| intibuca.callejero | OK | Derrota, 0 puntos |
| intibuca.papas | OK | Derrota, 0 puntos |
| intibuca.semilla | OK | Derrota, 0 puntos |
| intibuca.vaho | OK | Derrota, 0 puntos |
| intibuca.ondas | OK | Derrota, 0 puntos |
| lempira.barro | OK | Derrota, 0 puntos |
| lempira.opalo | OK | Derrota, 0 puntos |
| lempira.cuencas | OK | Derrota, 0 puntos |
| lempira.rebote | OK | Derrota, 0 puntos |
| lempira.pigmentos | OK | Derrota, 0 puntos |
| lempira.trapiche | OK | Derrota, 65 puntos |
| lempira.termal | OK | Derrota, 0 puntos |
| copan.cadera | OK | Derrota, 0 puntos |
| copan.glifos | OK | Derrota, 0 puntos |
| copan.guaras | OK | Derrota, 0 puntos |
| copan.estratigrafia | OK | Derrota, 0 puntos |
| copan.hojas | OK | Derrota, 0 puntos |
| copan.adoquin | OK | Derrota, 0 puntos |
| copan.estelas | OK | Derrota, 0 puntos |
| copan.atol | OK | Derrota, 0 puntos |
| olancho.batea | OK | Derrota, 0 puntos |
| olancho.arreo | OK | Derrota, 0 puntos |
| olancho.calcita | OK | Derrota, 0 puntos |
| olancho.cuajada | OK | Derrota, 0 puntos |
| olancho.postura | OK | Derrota, 0 puntos |
| olancho.tablas | OK | Derrota, 0 puntos |
| franciscomorazan.niebla | corregido (Q) | Derrota, 0 puntos |
| franciscomorazan.baleada | OK | Derrota, 0 puntos |
| franciscomorazan.repartidor | OK | Derrota, 0 puntos |
| franciscomorazan.artesania | OK | Derrota, 0 puntos |
| cortes.chuco | OK | Derrota, 0 puntos |
| cortes.gruas | OK | Derrota, 0 puntos |
| cortes.cortina | OK | Derrota, 35 puntos |
| cortes.garitas | OK | Derrota, 0 puntos |
| cortes.merendon | OK | Victoria, 880 puntos |
| cortes.cusuco | OK | Derrota, 0 puntos |
| cortes.topo | OK | Victoria, 185 puntos |
| islas.ballena | OK | Derrota, 0 puntos |
| islas.coral | OK | Derrota, 0 puntos |
| islas.bonacca | OK | Derrota, 0 puntos |
| islas.estela | OK | Derrota, 0 puntos |
| islas.flotacion | OK | Derrota, 0 puntos |
| islas.colorprofundo | OK | Victoria, 170 puntos |
| islas.cangrejo | OK | Victoria, 200 puntos |
| islas.absorcion | OK | Derrota, 0 puntos |
| comayagua.aserrin | OK | Derrota, 0 puntos |
| comayagua.reloj | OK | Derrota, 0 puntos |
| comayagua.eco | OK | Derrota, 30 puntos |
| comayagua.pilon | OK | Derrota, 0 puntos |
| comayagua.tenampua | OK | Derrota, 25 puntos |
| comayagua.anden | OK | Derrota, 0 puntos |
| comayagua.mantas | OK | Derrota, 30 puntos |
| comayagua.fachadas | OK | Derrota, 0 puntos |
| atlantida.balsa | OK | Derrota, 0 puntos |
| atlantida.pancoco | OK | Derrota, 0 puntos |
| atlantida.vagon | OK | Derrota, 0 puntos |
| atlantida.manati | OK | Derrota, 0 puntos |
| atlantida.lancetilla | OK | Derrota, 0 puntos |
| atlantida.canopy | OK | Derrota, 0 puntos |
| atlantida.carnaval | OK | Derrota, 0 puntos |
| franciscomorazan.rosquilla | OK | Derrota, 0 puntos |
| franciscomorazan.taxi | OK | Derrota, 0 puntos |
| franciscomorazan.asalto | OK | Derrota, 0 puntos |
| carrera | OK | Derrota, 0 puntos |
| futbol | OK | Derrota, 0 puntos |
| feria | OK | Victoria, 160 puntos |
| exploradores | OK | Derrota, 0 puntos |
| pulperia | OK | Derrota, 0 puntos |
| corte | OK | Derrota, 310 puntos |
| monta | OK | Derrota, 61 puntos |
| ritmo | OK | Derrota, 8660 puntos |
| ruta | OK | Derrota, 0 puntos |
| pesca | OK | Derrota, 0 puntos |
| atrapa | OK | Derrota, 60 puntos |
| cocina | OK | Derrota, 0 puntos |
| trivia | OK | Derrota, 0 puntos |
| manejo | OK | Derrota, 0 puntos |
