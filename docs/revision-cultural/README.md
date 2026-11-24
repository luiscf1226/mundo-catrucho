# Revisión cultural

Antes de publicar lo de un departamento, una persona de ese departamento lo revisa: sus juegos, su turismo y sus
locuras. Lo dudoso se corrige o se quita (MC-34, issue #34).

## Si te toca revisar tu departamento

Gracias por echarnos la mano. Te va a llevar entre una y dos horas.

1. **Abrí la hoja de tu departamento** (tabla de abajo). Trae todo lo que el jugador ve de ahí: lugares, comidas,
   palabras, juegos, turismo, locuras, memes, la cabecera y los rótulos.
2. **Mirá el informe asistido**, si ya hay. Lo hizo un agente antes que vos: dice qué ya se corrigió y termina con
   preguntas que solo alguien de ahí puede contestar.
3. **Jugá un rato tu departamento** en <https://mundo-catrucho-web.luiscf1226.workers.dev>: entrá desde el mapa, caminá
   la cabecera, buscá las locuras y probá dos o tres juegos. Algo que en la hoja suena bien puede verse mal en el juego.
4. **Recorré la hoja** y marcá cada casilla cuando lo hayás revisado. Para cada cosa preguntate:
   - **¿Es cierto?** ¿El lugar queda en tu departamento? ¿La comida es de ahí? ¿La fecha, la feria, el santo, el río y
     el cerro están bien? ¿La historia está bien contada?
   - **¿Así se dice?** ¿Las palabras significan eso? ¿Así hablan allá? ¿Hay faltas de ortografía o algo en «tú» en vez
     de «vos»?
   - **¿Cae mal?** ¿Se burla de alguien de verdad, de un pueblo lenca, maya chortí, tolupán, pech, tawahka, miskito o
     garífuna, de una religión o de una tragedia? ¿Hay un estereotipo que molestaría a la gente de ahí?
   - **¿Hay marcas con nombre real?** Equipos, la Selección y marcas van con apodo, nunca con su nombre ni su logo.
   - **¿Falta algo que sí es de ahí?** No hace falta, pero si se te ocurre, anotalo.

   Las **locuras** son inventos a propósito (una nube que da el pronóstico, un tren con hipo). Están bien mientras
   quede claro qué es real y qué es broma y no se burlen de nadie.
5. **Reportá** con el issue [«Revisión cultural de …»](https://github.com/luiscf1226/mundo-catrucho/issues/new?template=revision-cultural.yml).
   Pegá la lista de la hoja con tus casillas, escribí cada corrección con qué dice, qué debería decir y por qué, y
   contestá las preguntas del informe asistido. Si no tenés cuenta de GitHub, mandale la hoja marcada y tus notas a quien
   te invitó y esa persona abre el issue por vos.

El repositorio es público: no pongás tu nombre completo, teléfono, correo ni datos de otras personas en el issue.

## Departamentos

| Departamento | Hoja | Informe asistido | Revisión de una persona |
|---|---|---|---|
| Atlántida | [hoja](hojas/atlantida.md) | [informe](atlantida.md) | pendiente |
| Choluteca | [hoja](hojas/choluteca.md) | [informe](choluteca.md) | pendiente |
| Colón | [hoja](hojas/colon.md) | [informe](colon.md) | pendiente |
| Comayagua | [hoja](hojas/comayagua.md) | [informe](comayagua.md) | pendiente |
| Copán | [hoja](hojas/copan.md) | [informe](copan.md) | pendiente |
| Cortés | [hoja](hojas/cortes.md) | [informe](cortes.md) | pendiente |
| El Paraíso | [hoja](hojas/elparaiso.md) | [informe](elparaiso.md) | pendiente |
| Francisco Morazán | [hoja](hojas/franciscomorazan.md) | [informe](franciscomorazan.md) | pendiente |
| Gracias a Dios | [hoja](hojas/graciasadios.md) | [informe](graciasadios.md) | pendiente |
| Intibucá | [hoja](hojas/intibuca.md) | [informe](intibuca.md) | pendiente |
| Islas de la Bahía | [hoja](hojas/islas.md) | [informe](islas.md) | pendiente |
| La Paz | [hoja](hojas/lapaz.md) | [informe](lapaz.md) | pendiente |
| Lempira | [hoja](hojas/lempira.md) | [informe](lempira.md) | pendiente |
| Ocotepeque | [hoja](hojas/ocotepeque.md) | [informe](ocotepeque.md) | pendiente |
| Olancho | [hoja](hojas/olancho.md) | [informe](olancho.md) | pendiente |
| Santa Bárbara | [hoja](hojas/santabarbara.md) | [informe](santabarbara.md) | pendiente |
| Valle | [hoja](hojas/valle.md) | [informe](valle.md) | pendiente |
| Yoro | [hoja](hojas/yoro.md) | [informe](yoro.md) | pendiente |

Cuando el issue de un departamento se cierra con sus correcciones, cambiá «pendiente» por el número del issue. Con los
18 hechos se cierra #34.

## Para quien corrige

- **Dónde vive cada texto.** Lugares, comidas, palabras y juegos: `apps/web/shared/data/catalogo/*.json`. Dato del mapa y
  coleccionable: `apps/web/shared/data/departments.json` (y su fuente, `apps/web/tools/gen-departments.mjs`). Turismo y
  locuras del plan: `docs/generador/contenido.json`. Texto de las locuras en el juego:
  `apps/web/src/game/dept/zones/<depto>-puntos.json`. Sitios de la cabecera: `apps/web/src/game/dept/ciudad-datos.ts`.
  Memes: `apps/web/shared/data/memes.json`. Motores propios: `apps/web/shared/data/minigames.json` y
  `apps/web/src/game/minigames/<depto>/`. Los rótulos traen archivo y línea en la hoja.
- **Un mismo texto puede estar en varios lados** (catálogo y `contenido.json`, o `contenido.json` y `unicos.json`):
  cambialo en todos.
- **Corregí o quitá; no inventés.** Si un dato no se puede confirmar, suavizalo («cuentan que…») o quitalo.
- **Solo texto.** Si la corrección cambia metas, reloj o etapas de un motor, cambiá también `TOPES` en
  `packages/reglas` (`test-reglas.mjs` lo revisa). Si quitás un juego o un lugar, corré `validar-contenido` y la
  prueba del departamento (`apps/web/tools/test-<depto>.mjs`).
- **Volvé a generar las hojas** después de corregir: `node docs/generador/hojas-revision.mjs` (o solo una:
  `node docs/generador/hojas-revision.mjs yoro`). `node docs/generador/hojas-revision.mjs --revisar` falla si alguna
  quedó vieja. Si tocaste `contenido.json`, corré también `node docs/generador/catrucho.mjs`.
- **El catálogo en Convex** no se actualiza solo: después de unir los cambios, `pnpm catalogo:subir` (ver
  `docs/ENTORNOS.md`).
