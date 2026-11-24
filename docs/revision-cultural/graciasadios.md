# Revisión cultural asistida · Gracias a Dios

> Revisión hecha por un agente (Claude) el 24 de noviembre de 2026, antes de la revisión de una persona del departamento.
> Hoja que se recorrió: [hojas/graciasadios.md](hojas/graciasadios.md).

## Qué se revisó

- Lo general: cabecera, lugar emblema, dato del mapa, coleccionable y esencia.
- 6 lugares, 3 comidas y 6 palabras del catálogo (`catalogo/norte.json`).
- 12 juegos y 7 motores propios (Ciudad Blanca usa el motor común `exploradores`).
- 6 visitas de turismo y 3 locuras (`graciasadios-puntos.json`).
- 3 memes (`memes.json`).
- La cabecera: la pulpería y 3 sitios (`ciudad-datos.ts`).
- Rótulos de 11 archivos: la zona, sus descubrimientos y los 9 archivos de `minigames/graciasadios/`.

No hay marcas, clubes ni la Selección con nombre real. El voseo está bien, incluido «fiate». El patrimonio arqueológico sale con cuidado: réplicas, «la ficha se lleva; la pieza se queda», y nada de animar restos.
Las palabras en miskito (naksa, aisabe, yamni) coinciden con lo que se encontró, y «tingki pali» parece correcta. Ningún texto se burla del pueblo miskito.
Los pueblos tawahka y pech no aparecen en ningún texto: no hay nada que corregir, pero ver la pregunta 4.

## Qué se cambió

| Dónde | Decía | Ahora dice | Por qué |
|---|---|---|---|
| `catalogo/norte.json` · lugar Ciudad Blanca | La ciudad perdida del Dios Mono. | Leyenda de una ciudad perdida en la selva. | Lo del «Dios Mono» viene de un relato sensacionalista de un explorador estadounidense de 1940, no de la tradición de los pueblos de La Mosquitia. El sitio estudiado con LiDAR (Ciudad del Jaguar) queda en Olancho. El nombre «Ciudad Blanca» se queda igual. |
| `ciudad-datos.ts` · Muelle de Puerto Lempira | …las comunidades misquitas… | …las comunidades miskitas… | Así se escribe igual en todo el departamento: el catálogo ya dice «miskito». Además, esta grafía es la más cercana a la del propio pueblo (miskitu). |
| `ciudad-datos.ts` · Pista de aterrizaje | A la Moskitia no llega carretera… | A la Moskitia casi no llega carretera… | Hay caminos de tierra. Lo que falta es una carretera pavimentada que una La Moskitia con el resto del país. Ahora dice lo mismo que el meme («casi sin carreteras»). |
| `ciudad-datos.ts` · Iglesia Morava | La iglesia morava es la más vieja de la Moskitia. Los cantos en misquito… | Muchas familias miskitas son moravas. Los cantos en miskito… | No se pudo confirmar que sea «la más vieja». La misión morava llegó a la Moskitia hondureña en el siglo XX y Puerto Lempira es un pueblo joven. Lo seguro es que la morava es la iglesia principal entre los miskitos. |
| `memes.json` · meme «La selva más grande» (frase) | Río Plátano: la selva más grande de Centroamérica. | Río Plátano: parte de la selva más grande de Centroamérica. | Exageraba. La selva más grande es La Mosquitia entera, con Bosawás en Nicaragua. El Río Plátano es parte de ella, como ya dice la explicación del mismo meme. |

## Qué queda para la persona de Gracias a Dios

1. Ciudad Blanca está puesta en Gracias a Dios, pero el sitio que se estudió con LiDAR (Ciudad del Jaguar) queda en Olancho. ¿Les parece bien que la réplica esté aquí, como leyenda de toda La Mosquitia? ¿O conviene moverla o aclarar más? Hay que cambiar el lugar en el catálogo, no solo el texto.
2. Sobre la leyenda de la Ciudad Blanca: ¿cómo la cuentan los pueblos de ahí (por ejemplo, los pech la llaman Kaha Kamasa)? ¿Conviene decirlo en el juego?
3. El personaje de la zona, «Yampu», lleva camisa y pantalón de manta y un collar de jade. ¿El nombre es miskito o de otro pueblo? ¿La ropa se parece a cómo viste la gente de La Mosquitia, o se ve como disfraz de «indígena genérico»? Para cambiar la ropa hay que tocar código, no texto.
4. ¿Conviene que el juego nombre a los pueblos tawahka (Krausirpi, en el Patuca) y pech (Las Marías, en el Río Plátano), y a las comunidades garífunas del departamento? ¿Qué les gustaría que se muestre?
5. El casabe está puesto en Brus Laguna, que es un pueblo miskito. ¿Ahí se come casabe, o es más de las comunidades garífunas (Batalla, Plaplaya)? ¿Pasa lo mismo con el «tapado de pescado»? Si no cuadra, ¿qué comida de Brus Laguna lo cambiaría?
6. El wabul se describe «de guineo cocido con leche de coco», y en el juego se tritura «plátano». ¿Cuál es lo más común: guineo verde, plátano o los dos? ¿Lleva siempre coco?
7. ¿Qué grafía prefieren: «Mosquitia» o «Moskitia»? ¿Y «miskito», «misquito» o «miskitu»? Hoy el juego usa «La Mosquitia» en el catálogo y en los memes, y «la Moskitia» en la cabecera.
8. El coleccionable es una «Pluma de guara roja», en un departamento donde el juego insiste en no sacar nada del bosque. ¿Cae mal? ¿Les parecería mejor otra cosa, por ejemplo un remo de pipante?
9. ¿«Aisabe» (adiós) y «tingki pali» (muchas gracias) se dicen y se escriben así en el miskito de Honduras?
