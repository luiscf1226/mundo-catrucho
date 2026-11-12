# reglas (`@mundo-catrucho/reglas`)

Lo que el juego, Convex y la sala tienen que decidir igual: premios por partida, experiencia y niveles, premios del
mundo, topes para validar un resultado y límites de la sala en vivo. TypeScript puro, sin navegador, sin React y sin
dependencias. Se importa como fuente (`exports` apunta a `src/index.ts`): Vite, Convex y Wrangler lo compilan solos y
Node lo corre quitando tipos. Por eso los imports internos llevan `.ts` y quien lo use necesita
`allowImportingTsExtensions` y `resolveJsonModule` en su `tsconfig`.

Los números no se repiten: premios y niveles salen de `apps/web/shared/data/rewards.json` (que también lee Roblox) y
las metas de los motores viejos de `minigames.json`.

```bash
pnpm --filter @mundo-catrucho/reglas test       # node --test (también corre en pnpm test)
pnpm --filter @mundo-catrucho/reglas typecheck  # también corre en pnpm check
```

## API

| Qué | Para qué |
|---|---|
| `PREMIOS`, `MONEDA` | la tabla de `rewards.json` tal cual |
| `premioPartida({ gano, estrellas })` | `{ monedas, xp, estrellas }`; estrellas acotadas a 0–3 |
| `xpParaNivel(n)`, `NIVEL_MAX` | XP para pasar del nivel n al n+1 |
| `ganarXp({ nivel, xp }, n)` | `{ nivel, xp, subidas, monedas }`; `monedas` = premio por los niveles subidos |
| `PREMIO_PRIMERA_VISITA`, `PREMIO_RECUERDO`, `MONEDA_SUELTA` | premios del mundo |
| `bonoViaje(b)`, `BONO_VIAJE_MAX` | bono al llegar de un viaje (redondeado, máximo 30) |
| `avanzarJuego`, `etapaAbierta`, `deptoDeJuego` | avance de un juego al cerrar una partida (MC-15) |
| `fechaHonduras`, `misionesDelDia`, `avanzarMisiones`, `eventosDePartida`, `decidirCobroMision` | misiones del día (MC-16) |
| `LOGROS`, `logrosNuevos`, `prendasTipicas` | logros por estado y por partida |
| `decidirMonedas`, `MONEDAS_SUELTAS`, `emoteCuenta` | ritmo y tope de monedas sueltas; pausa entre emotes |
| `PASAJES`, `decidirSalida`, `decidirLlegada`, `VIAJE_MIN_S`, `gastoValido` | viajes: pasaje, bono y gastos |
| `limpiarAvanceLocal` | lo que se acepta del avance guardado en el navegador (MC-08) |
| `validarResultado({ motor, puntos, estrellas, duracion, etapa, etapas?, gano? })` | `{ ok, motivos, estrellasPosibles, conocido }` |
| `TOPES`, `difDe`, `estrellasPara` | metas, reloj y puntos máximos por motor; dificultad de una etapa |
| `SALA`, `ANIMACIONES` | cupo, largo de mensajes, límites de posición, animaciones, ritmo |
| `acotarEje`, `animacionPermitida`, `limpiarNombre`, `emoteValido`, `cubetaNueva`, `permitirMensaje` | lo que la sala aplica a cada mensaje |

## Validar un resultado

`validarResultado` dice si un puntaje es **posible**; no paga nada (eso es `premioPartida`). Rechaza:

- datos rotos: puntos negativos o no finitos, estrellas fuera de 0–3, etapa fuera del juego;
- partidas más cortas que el reloj del motor (con 2 s de holgura) o más largas que 30 min (abandonadas);
- más puntos de los que caben: `puntosPorSegundo` × reloj (o × duración si el motor no tiene reloj fijo), o el máximo
  absoluto del motor (feria, trivia, carrera, exploradores, fútbol);
- más estrellas de las que dan las metas con esos puntos, y estrellas sin ganar.

La dificultad sale de la etapa igual que `partida()` del juego (`etapa / (etapas − 1)`). Hay que pasar `etapas` del
catálogo cuando no son 3.

**Motores con tabla:** los 18 del kit (`defineMotor`: Cortés, Francisco Morazán, Olancho) con metas y reloj exactos,
y atrapa, cocina, trivia, manejo, feria, pulpería, exploradores, carrera y fútbol con metas y topes de puntos.
Los demás (pesca, monta, ritmo, ruta, corte y los motores nuevos) usan `TOPE_GENERICO` (suelto) y responden
`conocido: false`.

**Si cambiás las metas o el reloj de un motor del kit, cambiá `TOPES`.** `apps/web/tools/test-reglas.mjs` abre cada
motor del kit y compara lo que ve el jugador con `TOPES`; falla si se desfasan. Un motor nuevo del kit debería
agregar su línea en `TOPES` para que el servidor lo valide con sus metas.

## Quién lo usa

- **Juego** (`apps/web/src/core/store.ts`, `data.ts`): premios de partida, subir de nivel, primera visita, recuerdo,
  moneda suelta y bono de viaje. `REWARDS` y `xpForLevel` de `data.ts` son ahora alias del paquete.
- **Convex** (`convex/partidas.ts`): `partidas.validar`, una consulta pura que responde `validarResultado`. La usará
  `cerrarPartida` (MC-14) antes de pagar.
- **Sala** (`workers/salas`): cupo, largo de mensajes y emotes, límites de posición, animaciones, nombre y ritmo de
  mensajes (cubeta por conexión: 40 de golpe, 20 por segundo sostenidos; lo demás se ignora).
