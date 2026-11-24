# Revisión cultural asistida · Francisco Morazán

> Revisión hecha por un agente (Claude) el 24 de noviembre de 2026, antes de la revisión de una persona del departamento
> (MC-34, #34). Acompaña el cierre de MC-36 (#36).

## Qué se revisó

- Lo general (`departments.json`): cabecera, Cristo del Picacho, dato del mapa y coleccionable.
- 8 lugares, 5 comidas y 8 palabras (`catalogo/centro.json`).
- 14 juegos: los 12 de MC-36 más «Taxi a toda mecha» y «¡Corré, que viene la chepa!» (`catalogo/centro.json`,
  `contenido.json`).
- 6 visitas de turismo y 3 locuras (`franciscomorazan-puntos.json`).
- 3 memes (`memes.json`) y los 4 sitios de Tegucigalpa con su pulpería (`ciudad-datos.ts`).
- Rótulos de la zona y de los motores de `minigames/franciscomorazan/` y `Rosquilla.tsx`.

Se buscó en la web:

- Cuánto mide la Virgen de Suyapa. La Prensa y El Heraldo dan 6,5 cm; algunos medios redondean a 6.
- Si «burra» es «almuerzo para llevar» en Honduras. No se encontró ninguna fuente.
- Dónde se dice «pilón» al helado de palito. Tu Nota lo ubica en San Pedro Sula, no en Comayagua.
- Si en Valle de Ángeles hay pupusas. Sí: La Prensa nombra baleadas, pupusas y platos típicos.

No hay clubes, marcas ni la Selección con nombre real en los juegos: el clásico es «Leones contra Águilas», con apodos.
No se encontró tuteo; los clientes del taxi le hablan de usted al chofer, como se acostumbra.

## Qué se cambió

| Dónde | Decía | Ahora dice | Por qué |
|---|---|---|---|
| `catalogo/centro.json` · lugar Basílica de Suyapa | La Virgen de Suyapa mide apenas 6 centímetros. | …mide apenas 6,5 centímetros. | Es la medida que dan La Prensa y El Heraldo. |
| `catalogo/centro.json` · palabra | burra: almuerzo para llevar | chepo: policía | No se encontró fuente de «burra» con ese sentido. «Chepo» es habla capitalina conocida y ya sale en «¡Corré, que viene la chepa!». |
| `catalogo/centro.json` · comida Paleta | En Tegus se dice paleta. En Comayagua le dicen pilón. | En Tegus se dice paleta; en San Pedro Sula le dicen pilón. | La fuente (Tu Nota) y el meme «¿Pilón o paleta?» dicen San Pedro Sula. |
| Fútbol · «Potra de dos colores» | El marcador decía siempre «Catrachos contra Barrio Abajo». | Usa los equipos del tema: Leones contra Águilas. | El juego ya tenía sus apodos en el catálogo, pero la escena no los leía. |

## Qué queda para la persona de Francisco Morazán

1. **«¡Corré, que viene la chepa!»:** jugás de asaltante de caricatura en el Centro y Comayagüela, con persecución de
   chepos. Lo agregó el dueño del proyecto. ¿Se siente como juego de policías y ladrones o como burla a la capital y a
   Comayagüela? Si molesta, se puede llevar a un lugar ficticio o cambiar el papel (por ejemplo, repartidor apurado).
2. **Polilandia y Almacenes Carrizón** (`ciudad-datos.ts`) son negocios reales con su nombre. La regla del proyecto pide
   apodo para las marcas; se dejaron porque el dueño los puso a propósito como lugares conocidos (#83) y `test-ciudad`
   depende de ellos. Decidir si se quedan o llevan apodo.
3. **«La Peatonal»:** el sitio dice «agarrá bien la cartera, que hay bulla». ¿Es un consejo de capitalino o suena a
   estigma del centro?
4. **Pupusas de quesillo en Valle de Ángeles:** hay pupusas, pero ¿es lo más típico de un domingo allá, o es mejor otra
   comida (atol, elotes, montucas de la carretera)?
5. **Palabras:** «cheque» (todo bien), «alero» (amigo), «trancazo» (tráfico parado) y «chepo» (policía), ¿se usan así en
   Tegus hoy?
6. **Comayagua:** el catálogo de Comayagua todavía dice que allá al helado de palito le dicen pilón. No se tocó porque es
   de otro departamento; conviene revisarlo en su hoja.
