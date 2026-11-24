# Revisión cultural asistida · Intibucá

> Revisión hecha por un agente (Claude) el 24 de noviembre de 2026, antes de la revisión de una persona del departamento.
> Hoja que se recorrió: [hojas/intibuca.md](hojas/intibuca.md).

## Qué se revisó

- Lo general: cabecera, lugar emblema, dato del mapa, coleccionable (Canasta lenca) y esencia.
- 7 lugares, 4 comidas, 6 palabras, 12 juegos y 8 motores propios.
- 6 lugares de turismo, 10 puntos del mapa (`intibuca-puntos.json`: visitas, plazas y 3 locuras) y 3 memes (con sus
  leyendas de arriba y abajo).
- La cabecera: pulpería y 3 sitios (iglesia, Parque Central y Casa de la Cultura).
- Rótulos de 11 archivos: la zona, sus descubrimientos y los 9 archivos de motores de `minigames/intibuca/`.
- Cómo sale el pueblo lenca: la vendedora Doña Tina (pañuelo, blusa y falda), el Comedor lenca, el mercado, las
  tejedoras, la compostura y el guancasco. Se trata con respeto y sin burla; las locuras lo dicen de forma explícita.

## Qué se cambió

| Dónde | Decía | Ahora dice | Por qué |
|---|---|---|---|
| `catalogo/occidente.json`, lugar La Esperanza | La ciudad más alta y más fría de Honduras. | La ciudad más alta de Honduras, y de las más frías. | Que sea la más fría no está confirmado (Yamaranguila suele salir como el municipio más frío) y contradecía el dato del mapa («una de las…»). |
| `catalogo/occidente.json`, lugar La Gruta | Capilla tallada en la roca, mirando la ciudad. | Capilla dentro de una cueva del cerro, mirando la ciudad. | No está tallada: es una ermita de 1934 levantada en una cueva natural del cerro. |
| `catalogo/occidente.json`, guiño y frases de «Carrera entre dos plazas» y «El frío va ganando» (4 veces) | El frío ya salió y vos ni te amarrás. | El frío ya salió y vos todavía sin chumpa. | «Ni te amarrás» no se entiende. |
| `contenido.json`, mismo guiño (2 veces) | El frío ya salió y vos ni te amarrás. | El frío ya salió y vos todavía sin chumpa. | Para que el plan diga lo mismo que el juego. |
| `ciudad-datos.ts`, sitio de la cabecera | Catedral de La Esperanza | Iglesia de La Esperanza | La Esperanza no es sede de diócesis: pertenece a la Diócesis de Gracias, cuya catedral es San Marcos, en Gracias. El id `catedral-esperanza` no cambia. |

Ninguna prueba de `apps/web/tools/` usa estos textos.

## Qué queda para la persona de Intibucá

1. La iglesia principal de La Esperanza, ¿cómo le dice la gente? Se cambió «Catedral» por «Iglesia de La Esperanza»
   porque no es catedral. Si tiene un nombre de uso común (la parroquia o su santo), ¿cuál es?
2. ¿La Esperanza es de verdad «la ciudad más alta de Honduras»? El juego lo repite en el catálogo y en la iglesia.
3. La «Canasta lenca» como recuerdo: ¿la canasta es una artesanía lenca de Intibucá o sería mejor otra cosa (una pieza
   de telar, un cántaro)?
4. Doña Tina, la vendedora del mercado, va con pañuelo, trenzas, blusa y falda típica. ¿Se ve respetuosa, o cae mal
   que la única persona lenca del juego sea una vendedora con traje típico?
5. «Telares de El Cacao»: ¿esos telares están en Chiligatoro y se visitan, como dice el juego? En el mapa el punto queda
   junto al mercado lenca de La Esperanza. ¿Está bien así?
6. La leyenda del toro negro de la laguna de Chiligatoro: ¿así se cuenta allá? ¿A la gente de Chiligatoro le parece bien
   que salga como una animación de juego?
7. Las definiciones de «compostura» (ofrenda lenca a la tierra) y «guancasco» (encuentro de paz entre dos pueblos), ¿están
   bien dichas? ¿Hace falta aclarar que son ceremonias vivas y no cosa del pasado?
8. La definición de «choro» dice «hongo del festival; su identificación requiere revisión profesional». Es así a
   propósito, para no enseñar a comer hongos, pero ¿se entiende? ¿Cómo lo explicaría alguien de La Esperanza?
9. «Yamaranguila: corazón lenca, con su cascada»: ¿cuál es esa cascada y está de verdad en Yamaranguila?
10. ¿Se dice «hace helado» para decir que hace frío? ¿Y «tanate» para un bulto?
