# Revisión cultural asistida · Yoro

> Revisión hecha por un agente (Claude) el 24 de noviembre de 2026, antes de la revisión de una persona del departamento.
> Hoja que se recorrió: [hojas/yoro.md](hojas/yoro.md).

## Qué se revisó

- Lo general: cabecera, lugar emblema, dato del mapa, coleccionable y esencia.
- 7 lugares, 3 comidas y 6 palabras (`catalogo/norte.json`).
- 12 juegos y 7 motores propios (`catalogo/norte.json`, `contenido.json`, `unicos.json`, `minigames.json`).
- 6 visitas de turismo y 3 locuras (`contenido.json`, `yoro-puntos.json`).
- 3 memes (`memes.json`) y la vitrina de la Lluvia de Peces del paseo (`lobby/Paseo.tsx`).
- La pulpería y 3 sitios de la cabecera (`ciudad-datos.ts`).
- Rótulos de 10 archivos: la zona, sus descubrimientos y los 8 archivos de motores de `minigames/yoro/`.

Se tuvo especial cuidado con dos cosas. La primera es cómo aparece el pueblo tolupán: solo se nombra en el lugar
«Montañas tolupanes». No hay juego, personaje ni broma sobre ellos, y así está bien. La segunda es la Lluvia de Peces y
el padre Subirana, que deben quedar como tradición o leyenda y no como hecho comprobado.

Se buscó en la web lo siguiente:

- Si el Museo Ferroviario está en El Progreso. Sí está, en la antigua estación de la Tela Railroad.
- En qué mes es el Carnaval del Jamo. Es a finales de abril, en honor a San Jorge.
- Dónde empezó la Lluvia de Peces. Según El Heraldo, en los barrios El Pantano, Las Colinas y Las Brisas; hoy se reporta
  más en aldeas como La Unión.
- Qué dice la leyenda de Subirana.

No se encontraron marcas, clubes ni la Selección con nombre real, ni tuteo. El voseo está bien escrito, incluso «oí»
de oír.

## Qué se cambió

| Dónde | Decía | Ahora dice | Por qué |
|---|---|---|---|
| `catalogo/norte.json` · lugar Yoro | Donde llueven peces. | Donde cuentan que llueven peces. | La lluvia es relato. Se dice como algo que se cuenta, igual que en el dato del mapa. |
| `catalogo/norte.json` · lugar Montañas tolupanes | Aquí vive el pueblo tolupán. | Aquí viven tribus del pueblo tolupán. | Los tolupanes se organizan en varias tribus de Yoro y también viven en la Montaña de la Flor (Francisco Morazán). Decir que el pueblo entero vive en ese punto es inexacto. |
| `catalogo/norte.json` · comida Sardinitas de la lluvia | Pescaditos fritos, recién caídos del cielo. | Pescaditos fritos; dicen que caen del cielo. | Se queda la gracia, pero se marca que es lo que se cuenta. |
| `ciudad-datos.ts` · Iglesia de Yoro | Aquí se reza para que siga la lluvia de peces de cada junio. El padre Subirana pidió ese milagro, dicen. | La iglesia de la cabecera. Cuenta la leyenda que el padre Subirana rezó por la gente pobre y que de ahí vino la lluvia de peces. | No hay fuente de que en la iglesia se rece para que siga la lluvia. «Cada junio» contradice el resto del juego, que dice de mayo a julio. Lo de Subirana queda dicho como leyenda y contado con respeto. |
| `ciudad-datos.ts` · Parque Central de Yoro | …con su kiosko y vendedoras… | …con su kiosco y vendedoras… | Ortografía: la RAE registra «quiosco» y «kiosco». En el mismo archivo, otros tres sitios de otros departamentos dicen «kiosko» y no se tocaron. |
| `memes.json` · Lluvia de peces, «qué es» | Tras los primeros aguaceros fuertes de mayo o junio aparecen peces en el suelo en Yoro; hay festival desde 1998. | Tras los primeros aguaceros fuertes de mayo o junio, en Yoro cuentan que aparecen peces en el suelo; hay festival desde 1998. | Se dice como algo que cuentan los vecinos, no como hecho comprobado. |
| `zones/yoro.tsx` · rótulo de El Pantano | El Pantano: aquí llueven peces | El Pantano: ¿lluvia de peces? | Lo daba como hecho. Con la pregunta queda como relato y cabe en el letrero («dicen que llueven peces» se salía de los bordes). |

Ninguna prueba de `apps/web/tools/` usa los textos cambiados. No se cambió ningún nombre de juego, lugar ni locura.

## Qué queda para la persona de Yoro

1. **Pueblo tolupán:** ¿«Montañas tolupanes» es un buen nombre para ese lugar, o es mejor nombrar una zona real, como la
   Montaña de la Flor o las tribus de Yoro y Morazán? ¿Las comunidades preferirían otro trato? Si se quiere mostrar más
   de ellos, convendría consultarlo con sus propias organizaciones (por ejemplo, FETRIXY).
2. **Lluvia de Peces:** ¿se dice bien como relato («dicen», «cuentan») sin restarle valor a lo que vive la gente? ¿Les
   parece bien la nube presentadora de la locura?
3. **Padre Subirana:** ¿la leyenda se cuenta así, que rezó por la gente pobre? ¿Es correcto ponerlo en la iglesia de la
   cabecera, o lo relacionan con otro lugar?
4. **El Pantano:** ¿sigue siendo el barrio donde se cuenta que caen los peces, o ahora se asocia más con aldeas como La
   Unión? ¿Existe un monumento a la Lluvia de Peces en la cabecera, como dice el rótulo de la zona?
5. **Museo Ferroviario de El Progreso:** ¿conserva locomotoras o solo vagones? ¿Funciona el trencito para recorridos? La
   locura «Tren con hipo» y dos visitas de turismo dependen de eso.
6. **Mínimo:** el catálogo dice «Aquí al banano se le dice mínimo» en El Progreso. Se usa en todo el país. ¿Sirve igual o
   conviene decir otra cosa propia de El Progreso?
7. **Coyoles en miel:** ¿son típicos de Olanchito y de la cabecera? El juego «Coyoles al punto» pasa en Yoro ciudad y
   tiene un ícono de pez (🐟), aunque es un dulce.
8. **Huelga de 1954:** los juegos «Tres pruebas del 54» y «El archivo no se inventa» pasan en El Progreso. ¿El tono es
   respetuoso con la memoria de los trabajadores? La descripción de «El archivo no se inventa» termina con «sin parodiar
   trabajadores históricos», que parece una nota de diseño. ¿Se quita?
9. **Palabras:** ¿«campeño» se usa en Yoro para el trabajador de los campos bananeros? ¿«Cususa» es la palabra de ahí
   para el aguardiente casero?
10. **Olanchito:** ¿«Ciudad Cívica» y «tierra de escritores» son los apodos que usa la gente? ¿El Carnaval del Jamo sigue
    siendo en abril?
