# Revisión cultural asistida · Lempira

> Revisión hecha por un agente (Claude) el 24 de noviembre de 2026, antes de la revisión de una persona del departamento.
> Hoja que se recorrió: [hojas/lempira.md](hojas/lempira.md).

## Qué se revisó

- Lo general: cabecera, lugar emblema, dato del mapa (Lempira, 1537 y la moneda), coleccionable y esencia.
- 7 lugares, 3 comidas, 6 palabras, 12 juegos y 7 motores propios.
- 8 lugares de turismo, 11 locuras y puntos del mapa (`lempira-puntos.json`) y 3 memes (con sus leyendas de arriba y abajo).
- La cabecera: pulpería y 3 sitios (Iglesia San Marcos, Casa Galeano y Parque Central).
- Rótulos de 11 archivos: la zona (incluidas las placas «Cacique Lempira» y «Mausoleo de Juan Lindo»), sus
  descubrimientos y los 9 archivos de motores de `minigames/lempira/`.
- Cómo salen Lempira y el pueblo lenca: el dato del mapa, Erandique, la alfarería de La Campa, la estatua de Gracias y
  el recuerdo. Las locuras de La Campa aclaran que la broma es de la física, no de las artesanas.

## Qué se cambió

| Dónde | Decía | Ahora dice | Por qué |
|---|---|---|---|
| `departments.json`, recuerdo | Penacho lenca | Penacho de Lempira | Un tocado de plumas no es parte de la vestimenta lenca: es el estereotipo genérico de «indígena». Como el modelo 3D es un penacho, se ata a la imagen patria de Lempira (billete, estatuas) y no a todo el pueblo lenca. |
| `tools/gen-departments.mjs`, recuerdo | Penacho lenca | Penacho de Lempira | Es la fuente de `departments.json`; así no vuelve al regenerar. |
| `ciudad-datos.ts`, Iglesia San Marcos | La iglesia colonial de Gracias, que fue capital de toda Centroamérica en 1544. | La iglesia colonial de Gracias, la ciudad donde en 1544 se instaló la Audiencia de los Confines. | «Capital de toda Centroamérica» exagera. El hecho es que la Audiencia de los Confines estuvo en Gracias de 1544 a 1549, y es lo mismo que ya dice el catálogo. |

Ninguna prueba de `apps/web/tools/` usa estos textos.

Propuesta para quien programe: lo mejor sería cambiar el recuerdo por algo lenco de verdad, por ejemplo un cántaro de
La Campa o un ópalo de Erandique. Eso toca el modelo `penacho` de `kit/art/roblox/props2.tsx`, que es código, y no se
hizo aquí.

## Qué queda para la persona de Lempira

1. ¿Qué recuerdo representa mejor al departamento? Hoy es un penacho de plumas («Penacho de Lempira»). ¿Cae mal, aun
   atado a la figura de Lempira? ¿Sería mejor un cántaro de La Campa, un ópalo de Erandique u otra cosa?
2. En el juego, a Lempira le dicen «cacique» (en la palabra «lempira», en Erandique y en la placa de la estatua) y
   «líder lenca» en el dato del mapa. ¿Cómo prefieren nombrarlo allá: cacique, capitán, líder lenca?
3. El dato del mapa dice que Lempira «resistió la conquista en 1537». ¿Les parece bien así o prefieren otra forma
   (por ejemplo «hacia 1537», o mencionar el Peñol de Cerquín)?
4. La iglesia San Marcos de Gracias, ¿se dice «colonial»? ¿Hay que decir que hoy es catedral (Diócesis de Gracias)?
5. Celaque sale con «2,849 metros» en el catálogo y en el meme, y con «2.849 metros» en el turismo. ¿Cuál es la cifra y
   la forma de escribirla que se usa allá?
6. La fiesta de San Matías en La Campa, ¿es en febrero? ¿Hay algo de la feria que el juego deba mostrar y no muestra?
7. «Gracias Convoca», ¿se sigue haciendo con murales y talleres abiertos como dice el juego?
8. Los tamalitos pisques, el chilate con nuégados de Semana Santa y el dulce de rapadura envuelto en tusa: ¿están bien
   descritos y son de Gracias y La Campa, como dice el juego?
9. ¿Se dice «chuña» para descalzo y «cuma» para el machete curvo?
10. En la plaza de Gracias, el vecino Don Macario va con ropa de manta, sombrero y banda con la bandera. ¿Se ve bien
    o parece disfraz?
