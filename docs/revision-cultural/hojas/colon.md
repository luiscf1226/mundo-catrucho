# Hoja de revisión cultural · Colón

> Generada por `node docs/generador/hojas-revision.mjs`. No la edités a mano: corregí el dato en su archivo y volvé a generarla.
> Cómo se usa: [README de la revisión cultural](../README.md). Marcá cada casilla cuando lo hayás revisado; lo que esté mal
> anotalo en el issue «Revisión cultural de Colón» con qué dice, qué debería decir y por qué.

## Lo general

- [ ] **Cabecera:** Trujillo
- [ ] **Lugar emblema:** Fortaleza de Santa Bárbara
- [ ] **Dato del mapa:** Cristóbal Colón llegó a tierra firme cerca de Trujillo en 1502, en su cuarto viaje.
- [ ] **Coleccionable:** Catalejo antiguo
- [ ] **Esencia:** La bahía se lee desde la fortaleza y el casabe reúne saberes vivos entre laguna, costa y valle del Aguán.

## Lugares

- [ ] **Trujillo** (ciudad): Cerca de aquí Colón pisó tierra firme en 1502.
- [ ] **Fortaleza de Santa Bárbara** (fuerte): Cañones mirando la bahía.
- [ ] **Santa Fe** (pueblo): Pueblo garífuna de pescadores.
- [ ] **Laguna de Guaimoreto** (lago): Manglares, aves y cocodrilos.
- [ ] **Tocoa** (ciudad): Palma africana y ganado en el valle del Aguán.
- [ ] **Cerro Calentura** (montana): La montaña detrás de Trujillo.
- [ ] **Sonaguera** (finca): La capital de la naranja.

## Comidas

- [ ] **Pescado frito con tajadas** (Santa Fe): Recién sacado, frente al mar.
- [ ] **Casabe** (Santa Fe): Tortilla tostada de yuca, herencia garífuna.
- [ ] **Arroz con frijoles y coco** (Trujillo): El «rice and beans» de la costa.
- [ ] **Naranjas de Sonaguera** (Sonaguera): Dulces y por saco.

## Palabras

- [ ] **ereba**: casabe, en garífuna
- [ ] **mínimo**: banano
- [ ] **tunco**: cerdo
- [ ] **cumiche**: el hijo menor
- [ ] **goma**: resaca
- [ ] **chabacán**: bromista

## Juegos

Nombre, dónde pasa, de qué va y el guiño que sale al jugar.

- [ ] 🫓 **Casabe de Santa Fe** · Santa Fe · motor `cocina` · 5 etapas
  - De qué va: Completá una preparación guiada con grosor uniforme.
  - Guiño: El disco sale parejo, no como mapa de Honduras.
  - Textos del juego: «Casabe» · «Prensar la yuca» · «Tamizar» · «Extender en el comal» · «Tostar parejo» · «Voltear a tiempo»
- [ ] 🫓 **El disco quiso ser sombrero** · Santa Fe · motor `cocina` · 4 etapas
  - De qué va: Repartí masa entre discos de diámetros pedidos conservando el mismo espesor.
  - Guiño: El disco sale parejo, no como mapa de Honduras.
  - Textos del juego: «Casabe de varios tamaños» · «Prensar la yuca» · «Tamizar» · «Medir el disco» · «Extender parejo» · «Tostar» · «Disco grande» · «Disco chiquito»
- [ ] 🎣 **Boca de Guaimoreto** · Laguna de Guaimoreto · motor `colon.salinidad` · 5 etapas
  - De qué va: Mantené el gradiente durante un ciclo de marea.
  - Guiño: La laguna no es agua dulce de punta a punta.
- [ ] 🎣 **La laguna pidió agua dulce** · Laguna de Guaimoreto · motor `colon.salinidad` · 4 etapas
  - De qué va: Recuperá un gradiente de salinidad con compuertas trabadas mientras la laguna de maqueta se pone un sombrero de lluvia y su bigote de espuma señala la mezcla.
  - Guiño: La laguna no es agua dulce de punta a punta.
- [ ] 🌀 **Trazas de la bahía** · Trujillo · motor `colon.visualbahia` · 5 etapas
  - De qué va: Triangulá la posición con costa visible.
  - Guiño: La bahía se mira distinta según dónde estés.
- [ ] 🌀 **El mapa se fue de paseo** · Trujillo · motor `colon.visualbahia` · 4 etapas
  - De qué va: Detectá una observación corrida por su triángulo de error mientras la carta ficticia se dobla como turista y se esconde dentro de su propio catalejo.
  - Guiño: La bahía se mira distinta según dónde estés.
- [ ] 🍊 **Naranja por gajos** · Sonaguera · motor `colon.gajos` · 4 etapas
  - De qué va: Separá gajos con las guías visibles.
  - Guiño: El gajo manda por dónde abrís.
- [ ] 🍊 **La naranja trae laberinto** · Sonaguera · motor `colon.gajos` · 4 etapas
  - De qué va: Reconstruí las membranas ocultas tras salpicaduras usando sus puntos de unión.
  - Guiño: El gajo manda por dónde abrís.
- [ ] 🛠️ **El remolque corta camino** · Tocoa · motor `colon.remolque` · 4 etapas
  - De qué va: Marcá trayectorias de tractor y remolque articulado en un patio estrecho.
  - Guiño: Ya dobló el tractor; falta lo largo.
- [ ] 🎣 **La red deja crecer** · Laguna de Guaimoreto · motor `colon.redjuvenil` · 4 etapas
  - De qué va: Plegá una red de simulación conservando aberturas de talla mínima.
  - Guiño: La salida pequeña también cuenta.
- [ ] 🏴‍☠️ **El plano del castillo** · Fortaleza de Santa Bárbara · motor `colon.plano` · 4 etapas
  - De qué va: Ordená fragmentos de un plano por marcas de muralla que continúan entre bordes.
  - Guiño: La garita no puede quedar mirando para adentro.
- [ ] 🛠️ **Por mano, no por dedo** · Tocoa · motor `colon.racimos` · 4 etapas
  - De qué va: Separá racimos por un árbol de uniones para cumplir pedidos por mano completa.
  - Guiño: Por mano te lo pidieron, no por dedo.

## Motores propios

Cómo se juega cada motor que solo existe en este departamento.

- [ ] 🎣 **Boca de Guaimoreto**: Ajustá aperturas de una laguna simulada y leé el frente de salinidad que avanza por canales. Ganás manteniendo zonas de mezcla aptas para tres especies; abrir todo homogeniza el refugio.
- [ ] 🌀 **Bahía por tres visuales**: Trazá líneas de posición sobre una carta desde tres perfiles costeros conocidos. Ganás ubicando una embarcación en su única intersección; referencias contradictorias dejan un triángulo de error.
- [ ] 🍊 **Nervaduras de Sonaguera**: Seguí con el cursor las membranas curvas de una naranja sin cortar la pulpa. Ganás gajos completos; cada tajo recto suelta jugo y borra una guía.
- [ ] 🚜 **Giro del Aguán**: Marcá trayectorias de tractor y remolque articulado en un patio estrecho. Ganás dejando la salida libre; la caja recorta la curva y puede encerrarte entre dos cargas.
- [ ] 🐟 **Malla con escape**: Plegá una red de simulación conservando aberturas de talla mínima. Ganás demostrando que las siluetas juveniles salen; cerrar todas las puntas invalida el diseño.
- [ ] 🏰 **Archivo de Santa Bárbara**: Ordená fragmentos de un plano por marcas de muralla que continúan entre bordes. Ganás cuando el recorrido cierra sobre sí mismo; orientar mal una garita desplaza todos los tramos posteriores.
- [ ] 🍌 **Manos del mercado**: Separá racimos por un árbol de uniones para cumplir pedidos por mano completa. Ganás si conservás los dedos de cada mano; cortar una bifurcación equivocada impide completar dos pedidos.

## Turismo

Lugares que el jugador visita dentro del departamento.

- [ ] **Casabe en Santa Fe** (Santa Fe, comida)
  - Qué hacés: Ayudá a extender un disco virtual bajo la explicación de una instructora.
  - Dato: La venta y elaboración de casabe está documentada en Santa Fe, cerca de Trujillo.
  - Fuente: <https://infobae-infobae-prod.web.arc-cdn.net/america/agencias/2025/01/19/garifunas-de-honduras-orgullosos-porque-la-unesco-declaro-el-casabe-patrimonio-inmaterial/>
- [ ] **Saberes del casabe** (Santa Fe, oficio)
  - Qué hacés: Compará herramientas de réplica y armá una secuencia de preparación.
  - Dato: Los saberes y prácticas del casabe fueron inscritos por UNESCO en 2024 con participación de Honduras.
  - Fuente: <https://ich.unesco.org/en/RL/traditional-knowledge-and-practices-for-the-making-and-consumption-of-cassava-bread-02118>
- [ ] **Laguna conectada a la bahía** (Laguna de Guaimoreto, naturaleza)
  - Qué hacés: Recorré una pasarela virtual y seguí el intercambio de agua en una maqueta.
  - Dato: La Laguna de Guaimoreto tiene conexión con la Bahía de Trujillo.
  - Fuente: <https://sgp.undp.org/spacial-itemid-projects-landing-page/spacial-itemid-project-search-results/spacial-itemid-project-detailpage.html?id=7599&view=projectdetail>
- [ ] **Corredor Capiro y Calentura** (Cerro Calentura, naturaleza)
  - Qué hacés: Fotografiá el contraste entre montaña y humedal desde el visor.
  - Dato: El proyecto del PNUD relaciona Capiro y Calentura con el corredor de Guaimoreto.
  - Fuente: <https://sgp.undp.org/spacial-itemid-projects-landing-page/spacial-itemid-project-search-results/spacial-itemid-project-detailpage.html?id=7599&view=projectdetail>
- [ ] **Muros de Santa Bárbara** (Fortaleza de Santa Bárbara, sitio)
  - Qué hacés: Recorré el exterior y reconstruí una esquina con piezas digitales.
  - Dato: La fortaleza de Santa Bárbara en Trujillo es de origen colonial.
  - Fuente: <https://policianacional.gob.hn/trujillo-joya-y-patrimonio-cultural-preservado-por-miembros-de-la-policia-nacional-de-zona-atlantica-del-pais/>
- [ ] **Bahía desde tierra** (Trujillo, mirador)
  - Qué hacés: Buscá tres perfiles de costa para armar una postal panorámica.
  - Dato: La Bahía de Trujillo es uno de los atractivos turísticos del municipio.
  - Fuente: <https://policianacional.gob.hn/trujillo-joya-y-patrimonio-cultural-preservado-por-miembros-de-la-policia-nacional-de-zona-atlantica-del-pais/>

## Locuras

Sorpresas escondidas en el mapa. El texto es el que lee el jugador.

- [ ] **Casabe con abanico**: En Santa Fe se sigue haciendo casabe. En esta mesa de práctica el disco de utilería se abanica solito por el calor del comal.
  - Por qué: Santa Fe mantiene la elaboración de casabe. Fuente: <https://infobae-infobae-prod.web.arc-cdn.net/america/agencias/2025/01/19/garifunas-de-honduras-orgullosos-porque-la-unesco-declaro-el-casabe-patrimonio-inmaterial/>
- [ ] **El castillo parpadea**: La fortaleza de Santa Bárbara es colonial y aquí no se toca. Su réplica de museo, en cambio, cierra dos ventanas como ojos cuando le sacás la foto.
  - Por qué: La fortaleza Santa Bárbara es un edificio colonial de Trujillo. Fuente: <https://policianacional.gob.hn/trujillo-joya-y-patrimonio-cultural-preservado-por-miembros-de-la-policia-nacional-de-zona-atlantica-del-pais/>
- [ ] **La laguna cambia de sombrero**: Guaimoreto se conecta con la Bahía de Trujillo. En este modelo el agua cambia de gorro según la mezcla: paja si es dulce, de marinero si es salada. Pura ficción para aprender.
  - Por qué: Guaimoreto se conecta con la Bahía de Trujillo. Fuente: <https://sgp.undp.org/spacial-itemid-projects-landing-page/spacial-itemid-project-search-results/spacial-itemid-project-detailpage.html?id=7599&view=projectdetail>

## Memes y frases

- [ ] 🫓 **Casabe del mundo**: «Casabe garífuna: patrimonio de la humanidad.»
  - Qué es: El casabe, pan de yuca garífuna que se hace en comunidades de Colón, fue reconocido por la UNESCO como patrimonio inmaterial.
  - Fuente: <https://www.tunota.com/honduras-hoy/la-unesco-declara-patrimonio-inmaterial-el-casabe-hondureno-2025-01-19>
- [ ] ⛵🏖️ **Si Colón volviera…**: «Si Colón volviera, se quedaba en Trujillo.»
  - Qué es: Trujillo, fundada en 1525 y antigua capital, presume bahía, fortaleza y playas; la prensa tituló que si Colón volviera, ahí se quedaría.
  - Fuente: <https://www.laprensa.hn/viajes/si-colon-volviera-a-honduras-se-quedaria-en-trujillo-FGLP474313>
- [ ] 🌊⚓ **Bahía bien honda**: «Bahía de Trujillo: honda como el nombre del país.»
  - Qué es: La bahía de Trujillo se describe como una de las más profundas de Latinoamérica, entre las montañas Capiro y Calentura.
  - Fuente: <https://www.laprensa.hn/viajes/si-colon-volviera-a-honduras-se-quedaria-en-trujillo-FGLP474313>

## La cabecera (Trujillo)

- [ ] **Pulpería:** Pulpería La Garífuna
- [ ] **Catedral San Juan Bautista**: La iglesia de Trujillo, una de las ciudades más antiguas de tierra firme en América.
- [ ] **Parque Central de Trujillo**: Desde aquí se ve la bahía. A la par queda la fortaleza con sus cañones viejos.
- [ ] **Muelle de Trujillo**: Las lanchas salen a pescar y a Puerto Castilla. El agua de la bahía es tranquila y clarita.

## Rótulos y textos en pantalla

Sacados del código de la zona y de los motores. Puede colarse algo técnico: ignoralo. Revisá nombres, datos y
ortografía; si algo está mal, anotá el archivo y la línea.

<details><summary><code>apps/web/src/game/dept/zones/ColonDescubrimientos.tsx</code> · 8 textos</summary>

| Línea | Texto |
|---:|---|
| 26 | 🪭 ¡Qué calor en el comal! |
| 62 | 📸 ¡Salí con los ojos cerrados! |
| 67 | paja: agua dulce |
| 68 | marinero: salada |
| 69 | mitad y mitad: mezcla |
| 106 | Sacá la foto |
| 106 | Cambiá la mezcla |
| 106 | Mirá |

</details>

<details><summary><code>apps/web/src/game/dept/zones/colon.tsx</code> · 5 textos</summary>

| Línea | Texto |
|---:|---|
| 115 | Fortaleza de Santa Bárbara |
| 116 | Patio de armas |
| 117 | Bahía de Trujillo |
| 169 | El mar está muy hondo por ahí |
| 172 | Wani |

</details>

<details><summary><code>apps/web/src/game/minigames/colon/Gajos.tsx</code> · 8 textos</summary>

| Línea | Texto |
|---:|---|
| 61 | ¡Gajo entero, sin romper la pulpa! |
| 67 | Seguí la membrana |
| 76 | Tajo recto: salió jugo y se borró una guía |
| 83 | Llevá el cursor punto por punto sobre la membrana curva y F. Un tajo fuera de la curva bota jugo y borra una guía. |
| 121 | Las salpicaduras tapan puntos: todas las membranas curvan igual que la anterior |
| 122 | Todas las membranas curvan igual: fijate en la que ya abriste |
| 138 | Naranja por gajos |
| 173 | 💦 ¡Jugo! |

</details>

<details><summary><code>apps/web/src/game/minigames/colon/Plano.tsx</code> · 10 textos</summary>

| Línea | Texto |
|---:|---|
| 55 | Ahí ya no hay fragmento |
| 61 | Las marcas de la muralla no siguen en ese borde |
| 74 | La garita quedó mirando para adentro: se corrieron los tramos |
| 80 | La muralla sigue |
| 84 | ¡El recorrido cerró sobre sí mismo! |
| 119 | A/D elegí el fragmento cuya marca sigue la muralla abierta. W lo pone así, S lo gira. F coloca. La garita mira para afuera. |
| 165 | El plano del castillo |
| 166 | Fragmentos sueltos |
| 179 | Plano armado |
| 192 | Sigue aquí ▼ |

</details>

<details><summary><code>apps/web/src/game/minigames/colon/Racimos.tsx</code> · 8 textos</summary>

| Línea | Texto |
|---:|---|
| 89 | Cortaste al aire y lastimaste un dedo |
| 101 | Cortaste el tallo: las manos de abajo se cayeron golpeadas |
| 124 | Contá los dedos de cada mano, apuntá a la unión de la que pide el cliente y F. No cortés el tallo: botás las de abajo. |
| 153 | apuntás a una unión |
| 153 | ⚠️ apuntás al tallo |
| 153 | apuntá a una unión |
| 174 | Por mano, no por dedo |
| 230 | 🧾 Pedidos |

</details>

<details><summary><code>apps/web/src/game/minigames/colon/RedJuvenil.tsx</code> · 7 textos</summary>

| Línea | Texto |
|---:|---|
| 7 | Punta izquierda |
| 7 | Copo |
| 7 | Punta derecha |
| 65 | ¡Los juveniles salen y los grandes se quedan! |
| 73 | A/D elegí la parte de la red, W/S cuánto abrís la malla y F. Que salga el juvenil y se quede el adulto en las tres. |
| 125 | La red deja crecer |
| 156 | 🐟 ¡Salen los juveniles! |

</details>

<details><summary><code>apps/web/src/game/minigames/colon/Remolque.tsx</code> · 11 textos</summary>

| Línea | Texto |
|---:|---|
| 111 | ¡Salida libre! La caja pasó por dentro sin tocar |
| 117 | La caja recortó la curva y quedó trabada en la carga |
| 119 | Te pegaste a la pared o te pasaste del portón |
| 120 | La cabina se metió en una carga |
| 128 | A/D mové el carril de entrada, W/S abrí o cerrá la curva y F para maniobrar. La caja recorta por dentro: dejá espacio. |
| 198 | El remolque corta camino |
| 203 | Salida |
| 213 | Naranjas |
| 213 | Palma |
| 232 | ✅ ¡Pasó! |
| 232 | 🚧 ¡Encerrado! |

</details>

<details><summary><code>apps/web/src/game/minigames/colon/Salinidad.tsx</code> · 9 textos</summary>

| Línea | Texto |
|---:|---|
| 8 | Camarón |
| 9 | Róbalo |
| 10 | Sábalo |
| 115 | · 🌧️ lluvia |
| 115 | · ¡Todo abierto: la laguna se volvió una sola! |
| 149 | Boca de Guaimoreto |
| 151 | Bahía de Trujillo |
| 202 | 🌧️ ¡Sombrero de lluvia! |
| 202 | 🎩 La laguna te mira |

</details>

<details><summary><code>apps/web/src/game/minigames/colon/VisualBahia.tsx</code> · 15 textos</summary>

| Línea | Texto |
|---:|---|
| 8 | Fortaleza |
| 8 | Cerro Calentura |
| 8 | Punta Caxinas |
| 59 | Esa visual sí cuadra. Buscá la que deja el triángulo de error |
| 66 | ¡Posición fijada en el único cruce! |
| 72 | Ahí solo se cruzan dos visuales: es el triángulo de error |
| 72 | No es el cruce de las tres |
| 80 | Mové el cursor al único punto donde se cruzan las tres visuales (con la de control del faro) y F. Si una visual quedó corrida, no le hagás caso. |
| 113 | Arriba: elegí el perfil cuya visual está corrida |
| 113 | Marcá el único cruce de tres visuales |
| 116 | Hay un triángulo de error: el faro te dice qué cruce es el bueno |
| 117 | Cada visual sale de un perfil de la costa |
| 150 | Trazas de la bahía |
| 168 | Faro de control |
| 176 | 🗺️ La carta se fue de paseo |

</details>

<details><summary><code>apps/web/src/game/minigames/colon/comun.tsx</code> · 5 textos</summary>

| Línea | Texto |
|---:|---|
| 33 | WASD / mouse |
| 34 | F / clic |
| 35 | Mando: stick derecho / RT |
| 35 | mover / confirmar |
| 38 | Palanca / arrastrá |

</details>
