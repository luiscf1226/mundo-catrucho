# Celular: MC-56 y MC-04

## Medición reproducible

Desde la raíz, con Node 26.8.2 y Chromium con GPU:

```sh
pnpm --filter @mundo-catrucho/web build
CHROME_BIN=/usr/lib/chromium/chromium node apps/web/tools/test-celular.mjs apps/web/dist/mundo-catrucho-hd.html despues
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

## Resultado de esta ejecución

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
