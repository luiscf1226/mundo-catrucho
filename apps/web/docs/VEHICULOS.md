# Vehículos de MC-30

`game/viaje/opciones.ts` agrega opciones de terminal sin cambiar `TRANSPORTES` ni los identificadores anteriores.
`rutaParaVehiculo` es la misma validación que usan la terminal, `startViaje` y la escena. Los precios son lempiras ficticios.
El precio anunciado cubre las conexiones terrestres en taxi. Cada opción muestra los segundos del reloj de MC-27.
La velocidad de manejo no modifica ese reloj. Los ajustes nuevos de manejo se aplican a viajes; el minijuego conserva sus velocidades y metas anteriores.

| Vehículo | Recorrido disponible | Manejo |
|---|---|---|
| Pickup | Red de carreteras | Aceleración con carga, frenado anticipado y pérdida de velocidad al girar. Dos pasajeros en bancos atrás. |
| Mototaxi | Vuelta dentro de Copán, Ocotepeque, Santa Bárbara, Yoro o Colón | Tres ruedas y pérdida marcada de velocidad en curvas. |
| Bicitaxi | Vuelta local en Valle | Empuje de pedaleo periódico, poca velocidad y freno corto. |
| Lancha | Atlántida a Islas, por Sambo Creek a Cayos Cochinos, y regreso | Motor fuera de borda, frenado por arrastre y deriva lateral. |
| Barco (`ferry`) | La Ceiba a Utila y regreso, conexión más rápida del catálogo de ferry | Mayor inercia, poco giro y menor deriva por oleaje. |
| Avioneta | La Ceiba a Puerto Lempira y regreso | Rumbo asistido, deriva por viento y velocidad mínima de vuelo. |
| Cayuco | Vuelta local en Gracias a Dios, Colón, Valle o Atlántida | Paladas periódicas, deriva de corriente y poco empuje. |

Las vueltas locales usan la ruta departamental vacía de MC-27, con sus 40 segundos mínimos.
No atribuyen kilómetros ni una carretera inventada. Mototaxi y bicitaxi no hacen viajes interdepartamentales.
Los lugares de las vueltas locales vienen de `VIAJES.vehiculos`.

Para llegar desde otro departamento al muelle o aeropuerto, la línea de tiempo muestra primero el tramo terrestre en taxi.
Al cambiar `tramo.medio`, cambia el vehículo y la escena, conservando tiempo, progreso y choques.
En el sentido inverso, se desembarca y se continúa en taxi.
El cambio es automático y se explica en la terminal. No agrega esperas ni paradas de MC-28/29.
No se representa una caminata interactiva por el terminal.

La red fuente no contiene una ruta de lancha a La Mosquitia. Se ofrece la avioneta existente.
La lancha a Islas conserva los terminales de Sambo Creek y Cayos Cochinos. No se anuncia como un servicio directo a Roatán.
Los kilómetros desconocidos se muestran como «Distancia sin confirmar».

Los modelos y escenas usan piezas del kit y no descargan recursos.
La tecla F y el botón Señal usan sonidos sintetizados. El bicitaxi tiene timbre, el cayuco un golpe grave y los motores tonos graves.
Las teclas A y D y la palanca táctil gobiernan el rumbo. W aumenta empuje y S lo reduce.

`tools/test-vehiculos.mjs` prueba las siete opciones, los giros con teclado y palanca táctil, la señal, el salto y el límite de dibujo.
También simula 30 segundos sin tráfico para comparar velocidad, frenado de un segundo, pérdida por curva y deriva de un segundo.
Esas cifras describen la física ficticia y no velocidades de transporte real.
La prueba con GPU recorre una conexión de carretera a avioneta. Sin GPU omite esa conexión larga y mantiene los siete vehículos.

Comandos desde la raíz:

```bash
pnpm check
pnpm test
node apps/web/tools/test-vehiculos.mjs
MC_GPU=0 MC_LENTO=6 node apps/web/tools/test-vehiculos.mjs
node apps/web/tools/test-rutas.mjs apps/web/dist/mundo-catrucho-hd.html
pnpm --filter @mundo-catrucho/web build:web
node apps/web/tools/test-carga.mjs
pnpm capturas
```

Las capturas específicas quedan en `capturas/mc-30`, y las de software en `capturas/mc-30/sin-gpu`.
