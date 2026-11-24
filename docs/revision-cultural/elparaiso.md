# Revisión cultural asistida · El Paraíso

> Revisión hecha por un agente (Claude) el 24 de noviembre de 2026, antes de la revisión de una persona del departamento.
> Hoja que se recorrió: [hojas/elparaiso.md](hojas/elparaiso.md).

## Qué se revisó

- Lo general: cabecera, lugar emblema, dato del mapa, coleccionable y esencia.
- 6 lugares, 4 comidas y 6 palabras.
- 12 juegos, con sus textos: 8 preguntas de la trivia, 5 rondas del examen y frases.
- 8 motores propios.
- 7 paradas de turismo, 3 locuras y 3 memes.
- La cabecera (Yuscarán): la pulpería y 3 sitios.
- 12 archivos de rótulos: `ElParaisoDescubrimientos.tsx`, `elparaiso.tsx` y los 10 de `minigames/elparaiso/`.
- Marcas y clubes de la lista `vigilar` de `apodos.json`: no aparece ninguno. Tuteo: no hay; los imperativos de voseo
  («uní», «sellá», «no retirés») están bien escritos.

## Qué se cambió

| Dónde | Decía | Ahora dice | Por qué |
|---|---|---|---|
| `departments.json` · dato del mapa | Festival Nacional del Maíz | Festival Internacional del Maíz | El festival se llama Festival Internacional del Maíz. Así aparece también en el turismo, las locuras y los memes del departamento. |
| `tools/gen-departments.mjs` · el mismo dato | Festival Nacional del Maíz | Festival Internacional del Maíz | Este script genera `departments.json`. Si el dato no se cambia aquí, se pierde al volver a generar. Solo cambia el texto. |
| `catalogo/sur-oriente.json` · palabra «chagüite» | plática larga | siembra de plátano o guineo | En Honduras «chagüite» es un platanar: de ahí viene la «hoja de chagüite» con que se envuelven riguas y tamales. También se usa para un charco o lodazal. No quiere decir «plática larga». |
| `catalogo/sur-oriente.json` · trivia «Danlí pregunta por su maíz» | ¿Qué juego tradicional nombra el plan de Danlí? / Ficha: el plan de Danlí nombra… | ¿Qué juego tradicional aparece en el plan municipal de Danlí? / Ficha: el plan municipal de Danlí nombra… | «El plan de Danlí» no se entiende, y en Honduras «plan» suena a llanura. Se aclaró que es el plan municipal, que es la fuente del dato. |
| `ciudad-datos.ts` · Casa Fortín | El pueblo entero es monumento nacional por sus calles de piedra. | El pueblo entero fue declarado monumento nacional. | Yuscarán es monumento nacional por todo su conjunto colonial, no solo por las calles de piedra. Se quitó esa razón. |

## Qué queda para la persona de El Paraíso

1. **Chagüite.** ¿En El Paraíso «chagüite» quiere decir platanar, charco o las dos cosas? Si hay otra palabra de la zona
   que funcione mejor en la lista, ¿cuál sería?
2. **Rosquillas de Yuscarán.** El catálogo pone las rosquillas como comida de Yuscarán. ¿Son típicas de allí? ¿O
   Yuscarán es más conocido por otro dulce o por los dulces de frutas?
3. **Riguas.** ¿Se comen «con mantequilla» (la crema hondureña)? ¿Son más de Danlí o de todo el departamento?
4. **El Matazano.** El meme dice que El Matazano es una aldea del valle de Jamastrán, en Danlí. ¿Es cierto? ¿Molesta que
   salga por su nombre «curioso»?
5. **Casa Fortín.** ¿Es una casona colonial o es del siglo XIX? ¿Sigue funcionando como museo?
6. **Destilería de guaro.** La cabecera dice «Yuscarán es famoso por su aguardiente de caña. Aquí se huele el guaro
   desde la calle». ¿Está bien que se mencione así en un juego que juegan niños? ¿Es cierto lo del olor?
7. **Atol para el frío.** El meme dice «¡Atol de elote calientito pa'l frío!», pero el festival es en agosto. ¿Hace frío
   en Danlí en agosto, o la frase debería ir por otro lado?
8. **Las Manos.** El juego de la aduana pone filas de camiones y sellos. ¿El retrato de la frontera queda justo?
   ¿Algo cae mal a la gente que trabaja allí?
9. **Plan municipal.** ¿Tiene sentido para un jugador una pregunta de trivia que cita el plan municipal? ¿Se puede
   cambiar por algo que se vea en la feria (por ejemplo, si los caballitos de palo salen en el desfile)?
10. **Nombres locales.** ¿Suenan bien «Don Lencho» y «Pulpería Doña Chepa»? ¿Se dice «milpa» en el valle de Jamastrán?
