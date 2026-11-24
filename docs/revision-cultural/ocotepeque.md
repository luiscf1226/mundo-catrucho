# Revisión cultural asistida · Ocotepeque

> Revisión hecha por un agente (Claude) el 24 de noviembre de 2026, antes de la revisión de una persona del departamento.
> Hoja que se recorrió: [hojas/ocotepeque.md](hojas/ocotepeque.md).

## Qué se revisó

- Lo general: cabecera, lugar emblema, dato del mapa, coleccionable (Piña de ocote) y esencia.
- 6 lugares, 3 comidas, 6 palabras, 12 juegos y 8 motores propios.
- 6 lugares de turismo, 3 locuras y 3 memes (incluidas sus leyendas de arriba y abajo en `memes.json`).
- La cabecera: pulpería y 3 sitios (Aduana El Poy, Iglesia de Nueva Ocotepeque, Mercado).
- Rótulos de 11 archivos: la zona, sus descubrimientos y los 9 archivos de motores de `minigames/ocotepeque/`.
- Textos del plan en `contenido.json` y `unicos.json` (por qué aquí, datos, locuras).

## Qué se cambió

No hubo cambios. Los datos que se pudieron confirmar están bien: la llena de 1934 que se llevó la vieja Ocotepeque, el
Trifinio entre tres países, Agua Caliente como paso de romeros a Esquipulas, el mercado de domingo de Belén Gualcho,
Güisayote junto a la carretera y la molienda de Sensenti. No hay tuteo, marcas ni burlas. La tragedia de 1934 se trata con
respeto (el juego de Antigua usa rótulos ficticios y lo dice).

Propuesta para quien programe (no se aplicó porque toca la lógica del juego): en
`apps/web/src/game/minigames/ocotepeque/Archivo.tsx` los rótulos `BARBERIA`, `SASTRERIA`, `PANADERIA` y `ZAPATERIA` van
sin tilde. Las mayúsculas también llevan tilde (BARBERÍA, SASTRERÍA, PANADERÍA, ZAPATERÍA). Para cambiarlo hay que
agregar `Í` a `VOCALES` (`'AEIOU'`), porque el modo «se tragó las vocales» decide con esa lista qué letras esconde.

## Qué queda para la persona de Ocotepeque

1. La iglesia de Belén Gualcho, ¿tiene cúpulas y bóvedas de verdad? El juego se llama «Cúpulas de Belén Gualcho» y el
   plan dice que sus bóvedas «reparten empujes entre naves». No se encontró una fuente que lo confirme. Si no tiene
   cúpulas, ¿qué nombre le queda mejor (por ejemplo «Arcos de Belén Gualcho»)?
2. ¿El mercado de Belén Gualcho de verdad empieza de madrugada, todavía oscuro? El juego lo llama «Mercado antes del sol».
3. ¿Se dice «Ocote» para hablar de Ocotepeque, como en el meme «En Ocote, en un ratito estás en otro país»?
4. En Ocotepeque, ¿se dicen de verdad «patojo» y «chero» (la hoja dice que se oyen por la frontera)? ¿Hay otra palabra
   más propia del departamento que valga la pena poner?
5. La horchata de morro y la yuca con chicharrón «como al otro lado de la frontera»: ¿se sienten de Ocotepeque o como
   comida salvadoreña? ¿Hay un plato más de ahí (por ejemplo de Sensenti o de Belén Gualcho) que deba estar?
6. La Aduana El Poy «con cambistas con fajos de billetes»: ¿cae bien así o suena a burla de los cambistas?
7. ¿La Iglesia de Nueva Ocotepeque y el Mercado tienen un nombre propio que la gente use? Hoy van con nombre genérico.
8. La Piña de ocote como recuerdo, ¿la reconocen como algo del departamento?
