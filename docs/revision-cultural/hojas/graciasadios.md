# Hoja de revisión cultural · Gracias a Dios

> Generada por `node docs/generador/hojas-revision.mjs`. No la edités a mano: corregí el dato en su archivo y volvé a generarla.
> Cómo se usa: [README de la revisión cultural](../README.md). Marcá cada casilla cuando lo hayás revisado; lo que esté mal
> anotalo en el issue «Revisión cultural de Gracias a Dios» con qué dice, qué debería decir y por qué.

## Lo general

- [ ] **Cabecera:** Puerto Lempira
- [ ] **Lugar emblema:** Río Plátano
- [ ] **Dato del mapa:** La Biosfera del Río Plátano es Patrimonio de la Humanidad de la UNESCO.
- [ ] **Coleccionable:** Pluma de guara roja
- [ ] **Esencia:** Lagunas, ríos y avionetas marcan los trayectos; el bosque se conoce sin extraer su patrimonio.

## Lugares

- [ ] **Puerto Lempira** (puerto): Capital de La Mosquitia, a la orilla de la laguna.
- [ ] **Laguna de Caratasca** (lago): La laguna más grande de Honduras.
- [ ] **Biosfera del Río Plátano** (selva): Patrimonio de la Humanidad.
- [ ] **Ciudad Blanca** (ruinas): Leyenda de una ciudad perdida en la selva.
- [ ] **Río Patuca** (rio): Uno de los ríos más largos de Centroamérica.
- [ ] **Brus Laguna** (pueblo): Pueblo miskito entre sabana y laguna.

## Comidas

- [ ] **Wabul** (Puerto Lempira): Bebida espesa de guineo cocido con leche de coco.
- [ ] **Tapado de pescado** (Brus Laguna): Pescado con yuca, plátano y coco.
- [ ] **Casabe** (Brus Laguna): Tortilla de yuca para el viaje largo.

## Palabras

- [ ] **naksa**: hola, en miskito
- [ ] **tingki pali**: muchas gracias, en miskito
- [ ] **aisabe**: adiós, en miskito
- [ ] **yamni**: bueno, en miskito
- [ ] **pipante**: canoa larga de río
- [ ] **wabul**: bebida de guineo y coco

## Juegos

Nombre, dónde pasa, de qué va y el guiño que sale al jugar.

- [ ] 🗿 **Ciudad Blanca sin extraer** · Ciudad Blanca · motor `exploradores` · 5 etapas
  - De qué va: Localizá evidencias en una réplica con ruta señalada.
  - Guiño: La ficha se lleva; la pieza se queda.
- [ ] 🗿 **La ficha que faltaba** · Ciudad Blanca · motor `exploradores` · 4 etapas
  - De qué va: Contrastá hallazgos con fichas para excluir una pieza sin procedencia; no visitás el sitio real.
  - Guiño: La ficha se lleva; la pieza se queda.
- [ ] 🍫 **El bosque deja ver** · Biosfera del Río Plátano · motor `graciasadios.lidar` · 5 etapas
  - De qué va: Separá copa y suelo con umbrales de altura.
  - Guiño: No todo puntito bajito es una pared.
- [ ] 🍫 **La nube de puntos estornudó** · Biosfera del Río Plátano · motor `graciasadios.lidar` · 4 etapas
  - De qué va: Repará huecos de escaneo por continuidad de pendientes mientras una nube de puntos de utilería estornuda colores, sin animar restos arqueológicos.
  - Guiño: No todo puntito bajito es una pared.
- [ ] 🛶 **Pipante por el Patuca** · Río Patuca · motor `graciasadios.pipante` · 5 etapas
  - De qué va: Cruzá remolinos con carga centrada.
  - Guiño: La proa ya dobló; acordate de la popa.
- [ ] 🛶 **La popa anda por su cuenta** · Río Patuca · motor `graciasadios.pipante` · 4 etapas
  - De qué va: Compensá un afluente con carga desplazada mientras la popa de cartón se estira como chicle y la proa le manda una postal para que regrese.
  - Guiño: La proa ya dobló; acordate de la popa.
- [ ] 🥣 **Aterriza el encargo** · Puerto Lempira · motor `graciasadios.pistalempira` · 4 etapas
  - De qué va: Secuenciá cruces de personal autorizado con ventanas fijas.
  - Guiño: El encargo llega cuando la pista está lista.
- [ ] 🥣 **La avioneta trae una cama** · Puerto Lempira · motor `graciasadios.pistalempira` · 4 etapas
  - De qué va: Mové una carga sobredimensionada por etapas entre refugios sin ocupar la franja de vuelo.
  - Guiño: El encargo llega cuando la pista está lista.
- [ ] 🎣 **Caratasca sin perder el norte** · Laguna de Caratasca · motor `graciasadios.caratasca` · 4 etapas
  - De qué va: Separá con dos mandos la rotación de una carta y la traslación de tu posición bajo viento lateral.
  - Guiño: Que la carta gire no quiere decir que la laguna se movió.
- [ ] 🍫 **Huellas para alejarse** · Biosfera del Río Plátano · motor `graciasadios.rastros` · 4 etapas
  - De qué va: Superponé huellas y marcas de tiempo para delimitar una zona de exclusión en el mapa.
  - Guiño: Si sabés por dónde pasó, sabés por dónde no meterte.
- [ ] 🥣 **Wabul sin grumos** · Puerto Lempira · motor `graciasadios.wabul` · 4 etapas
  - De qué va: Triturá plátano en una simulación de textura alternando trayectorias cruzadas del mazo.
  - Guiño: El grumo no se quita dándole igualito otra vez.
- [ ] 🚣 **Entrega a peso parejo** · Brus Laguna · motor `graciasadios.truequeflotante` · 4 etapas
  - De qué va: Intercambiá bultos simultáneamente entre dos embarcaciones para conservar su desplazamiento.
  - Guiño: Soltá y recibí parejo; la borda no espera.

## Motores propios

Cómo se juega cada motor que solo existe en este departamento.

- [ ] 📡 **Volumen bajo el dosel**: Clasificá retornos de un escaneo LiDAR simulado en suelo, copa y ruido. Ganás reconstruyendo un relieve continuo; borrar puntos bajos junto con hojas destruye la evidencia del terreno.
- [ ] 🛶 **Confluencias del Patuca**: Girás proa y popa por separado con impulsos de remo mientras leés remolinos móviles. Ganás cruzando una confluencia en diagonal; orientar solo la proa deja la popa atravesada.
- [ ] 🛬 **Cruce de pista**: Agrupá traslados en un tablero de permisos antes del aviso de aterrizaje. Ganás cuando nadie espera en la zona restringida; iniciar un cruce tarde devuelve el grupo al refugio.
- [ ] 🧭 **Carta que gira**: Separá con dos mandos la rotación de una carta y la traslación de tu posición bajo viento lateral. Ganás manteniendo rumbo entre dos marcas bajas de costa; confundir giro con deriva te saca del canal.
- [ ] 🐾 **Distancia del jaguar**: Superponé huellas y marcas de tiempo para delimitar una zona de exclusión en el mapa. Ganás eligiendo un lugar remoto de observación; seguir al animal cancela el recorrido.
- [ ] 🥣 **Textura del wabul**: Triturá plátano en una simulación de textura alternando trayectorias cruzadas del mazo. Ganás al reducir grumos sin compactar; repetir dirección forma placas difíciles de deshacer.
- [ ] ⚖️ **Mostrador de Brus**: Intercambiá bultos simultáneamente entre dos embarcaciones para conservar su desplazamiento. Ganás cerrando entregas sin sobrecarga transitoria; recibir antes de soltar hunde el borde virtual.

## Turismo

Lugares que el jugador visita dentro del departamento.

- [ ] **Dosel del Río Plátano** (Biosfera del Río Plátano, naturaleza)
  - Qué hacés: Observá estratos del bosque con un visor desde el sendero autorizado.
  - Dato: La reserva comprende bosque tropical húmedo y muy húmedo.
  - Fuente: <https://www.unesco.org/en/mab/rio-platano>
- [ ] **Manglar y sabana** (Biosfera del Río Plátano, naturaleza)
  - Qué hacés: Descubrí dos hábitats en una maqueta interactiva sin cortar vegetación.
  - Dato: La reserva incluye manglares, sabanas, humedales y lagunas.
  - Fuente: <https://www.unesco.org/en/mab/rio-platano>
- [ ] **Herbario de réplica** (Biosfera del Río Plátano, oficio)
  - Qué hacés: Compará hojas digitales y etiquetá una colección sin recolectar plantas.
  - Dato: UNESCO registra más de quinientas especies de plantas identificadas en la reserva.
  - Fuente: <https://www.unesco.org/en/mab/rio-platano>
- [ ] **Llegada a Puerto Lempira** (Puerto Lempira, sitio)
  - Qué hacés: Bajá de la avioneta virtual y armá tu recorrido con guía local.
  - Dato: La municipalidad presenta Puerto Lempira como destino de La Mosquitia.
  - Fuente: <https://www.alcaldiapuertolempira.hn/turismo>
- [ ] **Orilla de la laguna** (Laguna de Caratasca, naturaleza)
  - Qué hacés: Fotografiá el horizonte desde un punto de observación con guía.
  - Dato: Puerto Lempira está vinculado al paisaje lagunar de Caratasca.
  - Fuente: <https://www.alcaldiapuertolempira.hn/turismo>
- [ ] **Réplica documental de Ciudad Blanca** (Ciudad Blanca, sitio)
  - Qué hacés: Explorá una exposición digital situada en el mapa del departamento, sin abrir acceso al sitio real.
  - Dato: La investigación de Ciudad del Jaguar utilizó detección remota LiDAR; el centro físico de investigación está en Olancho.
  - Fuente: <https://www.eldiario.hn/inaugura-exposicion-de-piezas-arqueologicas-encotradas-en-ciudad-blanca/>

## Locuras

Sorpresas escondidas en el mapa. El texto es el que lee el jugador.

- [ ] **Nube de puntos con estornudo**: A Ciudad del Jaguar la estudiaron con LiDAR, un láser desde el aire. Esta nube de utilería estornuda puntitos de colores y vos los clasificás; los restos de verdad no se mueven ni se inventan.
  - Por qué: La investigación de Ciudad del Jaguar utilizó tecnología LiDAR. Fuente: <https://www.eldiario.hn/inaugura-exposicion-de-piezas-arqueologicas-encotradas-en-ciudad-blanca/>
- [ ] **La laguna se lleva la brújula**: Puerto Lempira vive frente a la laguna de Caratasca. Esta brújula de decorado se marea sola: antes de creerle, compará la carta con el viento.
  - Por qué: Puerto Lempira está asociado al paisaje lagunar de La Mosquitia. Fuente: <https://www.alcaldiapuertolempira.hn/turismo>
- [ ] **El dosel abre sombrilla**: El Río Plátano guarda bosque tropical húmedo, donde llueve seguido. Esta hoja de cartón del aula se volvió tu sombrilla un ratito.
  - Por qué: Río Plátano conserva bosque tropical húmedo. Fuente: <https://www.unesco.org/en/mab/rio-platano>

## Memes y frases

- [ ] ⛵🌊 **Salimos de esas honduras**: «¡Gracias a Dios que salimos de esas honduras!»
  - Qué es: Según la tradición, Colón dijo esta frase al doblar el cabo tras una tormenta; de ahí vendría el nombre del cabo y, quizá, del país.
  - Fuente: <https://en.wikipedia.org/wiki/Cabo_Gracias_a_Dios>
- [ ] ✈️🛶 **Por agua o por aire**: «A La Mosquitia se llega por agua o por aire.»
  - Qué es: Gracias a Dios es remoto y casi sin carreteras: se llega sobre todo por agua o en avión.
  - Fuente: <https://en.wikipedia.org/wiki/Gracias_a_Dios_Department>
- [ ] 🌳🦜 **La selva más grande**: «Río Plátano: parte de la selva más grande de Centroamérica.»
  - Qué es: La Reserva del Río Plátano, patrimonio de la UNESCO, es parte de la mayor área silvestre de Centroamérica.
  - Fuente: <https://en.wikipedia.org/wiki/Gracias_a_Dios_Department>

## La cabecera (Puerto Lempira)

- [ ] **Pulpería:** Pulpería La Moskitia
- [ ] **Muelle de Puerto Lempira**: Aquí llegan los pipantes y las lanchas desde las comunidades miskitas por la laguna de Caratasca.
- [ ] **Pista de aterrizaje**: A la Moskitia casi no llega carretera: se viene en avioneta o en lancha. Esta pista es la puerta de entrada.
- [ ] **Iglesia Morava**: Muchas familias miskitas son moravas. Los cantos en miskito se oyen desde la calle.

## Rótulos y textos en pantalla

Sacados del código de la zona y de los motores. Puede colarse algo técnico: ignoralo. Revisá nombres, datos y
ortografía; si algo está mal, anotá el archivo y la línea.

<details><summary><code>apps/web/src/game/dept/zones/GraciasADiosDescubrimientos.tsx</code> · 5 textos</summary>

| Línea | Texto |
|---:|---|
| 103 | Compará carta y viento |
| 109 | Aula del dosel |
| 121 | Prendé el escáner |
| 121 | Mirá la brújula |
| 121 | Abrí la sombrilla |

</details>

<details><summary><code>apps/web/src/game/dept/zones/graciasadios.tsx</code> · 5 textos</summary>

| Línea | Texto |
|---:|---|
| 55 | Embarcadero de pipantes |
| 102 | Petroglifos de Walpaulban Sirpi |
| 102 | Río Plátano |
| 174 | El río está muy hondo: buscá el tronco para cruzar |
| 178 | Yampu |

</details>

<details><summary><code>apps/web/src/game/minigames/graciasadios/Archivo.tsx</code> · 19 textos</summary>

| Línea | Texto |
|---:|---|
| 32 | Código |
| 32 | Procedencia |
| 32 | Foto |
| 162 | Aquí no hay marca que registrar. |
| 165 | Esa pieza no tiene procedencia: no entra al inventario. |
| 175 | Inventario completo. Pasá a la otra sala de la réplica. |
| 188 | Esa pieza sí tiene procedencia: registrá su ficha. |
| 188 | No hay pieza cerca para excluir. |
| 194 | Excluida: pieza sin procedencia, fuera del inventario. |
| 203 | Recorré la réplica por la ruta señalada. Acercate a cada marca (código, procedencia y foto) y registrala con F: tres marcas cierran la ficha de una vitrina. Salirte de la ruta o tocar un resto anula la ficha. Si una pieza no tiene procedencia, excluila con E. |
| 204 | caminar por la réplica |
| 248 | Te saliste del recorrido: la ficha se anuló. |
| 250 | Tocaste un resto: la pieza se queda y la ficha se anula. |
| 258 | Réplica de exposición: no es el sitio real |
| 304 | Réplica de Ciudad Blanca · la ficha que faltaba |
| 304 | Réplica de Ciudad Blanca |
| 348 | 🚫 excluida |
| 348 | 📋 ficha lista |
| 360 | Sin procedencia |

</details>

<details><summary><code>apps/web/src/game/minigames/graciasadios/Carta.tsx</code> · 8 textos</summary>

| Línea | Texto |
|---:|---|
| 50 | Pasaste, pero con la carta girada no sabés tu rumbo. |
| 54 | Confundiste giro con deriva: te saliste del canal. |
| 65 | Pasá entre cada par de marcas bajas de la costa. La carta se gira sola: F y E la enderezan hasta que la N quede arriba. El viento te corre de lado: el cursor corrige esa deriva. Que la carta gire no quiere decir que te moviste. |
| 66 | girar la carta ↻ |
| 66 | girar la carta ↺ |
| 115 | ¡fuera del canal! |
| 132 | Laguna de Caratasca · carta y viento |
| 165 | 0.1 ? '→' : s.x |

</details>

<details><summary><code>apps/web/src/game/minigames/graciasadios/Lidar.tsx</code> · 18 textos</summary>

| Línea | Texto |
|---:|---|
| 81 | Ese suelo no sigue la pendiente de los vecinos. |
| 84 | Borraste puntos bajos con las hojas: se perdió el terreno. |
| 86 | Quedaron hojas abajo: el relieve sale con chichotes. |
| 87 | El ruido quedó como suelo: quitalo antes de cortar. |
| 105 | Ahí no hay ningún punto que quitar. |
| 110 | Quitaste el suelo: esa era la evidencia del terreno. |
| 114 | Esa era hoja: con el corte se iba sola. |
| 125 | Cada columna del escaneo trae hojas (verde), suelo (café) y a veces ruido (rosado) debajo del suelo. Quitá el ruido con E y cortá la copa con F: el umbral va entre el suelo y la hoja más baja. Cortar debajo del suelo borra el terreno. |
| 171 | ¡Achís! La nube revolvió los colores: fiate de la altura. |
| 177 | Se fue la columna sin clasificar. |
| 184 | Hueco sin suelo: poné el umbral donde sigue la pendiente y F |
| 186 | Hay ruido bajo el suelo: E lo quita |
| 187 | F corta todo lo que queda arriba del umbral |
| 189 | · 🤧 colores revueltos |
| 213 | Escaneo de utilería · repará los huecos |
| 213 | Escaneo del dosel · Río Plátano |
| 264 | ¡Achís! |
| 264 | nube de utilería |

</details>

<details><summary><code>apps/web/src/game/minigames/graciasadios/Mostrador.tsx</code> · 17 textos</summary>

| Línea | Texto |
|---:|---|
| 12 | Arroz |
| 12 | Casabe |
| 12 | Pescado seco |
| 12 | Cocos |
| 12 | Leña |
| 12 | Plátano |
| 12 | Bidón de agua |
| 12 | Yuca |
| 39 | Bulto |
| 75 | Ahí no hay bulto. |
| 79 | Ese bulto no es del pedido. |
| 84 | Recibiste antes de soltar: se hundió el borde. Soltá primero. |
| 94 | Entrega cerrada a peso parejo. |
| 105 | Los bultos con etiqueta amarilla van al otro bote. Elegí el bulto con el cursor y F lo pasa. Mirá cuánto le cabe a cada bote: el que va justo tiene que soltar lo suyo antes de recibir, o se le hunde el borde. |
| 136 | Soltá primero desde el bote que va justo |
| 169 | Brus Laguna · trueque de bote a bote |
| 172 | Mostrador del muelle |

</details>

<details><summary><code>apps/web/src/game/minigames/graciasadios/Pipante.tsx</code> · 4 textos</summary>

| Línea | Texto |
|---:|---|
| 68 | Te saliste de la diagonal de la confluencia. |
| 171 | Afluente del Patuca · carga corrida |
| 171 | Confluencia del Patuca |
| 227 | 📮 Postal de la proa: «¡Regresá, popa!» |

</details>

<details><summary><code>apps/web/src/game/minigames/graciasadios/Pista.tsx</code> · 14 textos</summary>

| Línea | Texto |
|---:|---|
| 66 | Sin permiso no se entra a la pista. |
| 71 | La cama cruza sola: primero pasá lo que ya tenés listo. |
| 78 | El grupo ya va lleno. |
| 93 | Ya hay alguien en la pista. |
| 97 | No hay grupo listo en el refugio. |
| 100 | Pista cerrada: la avioneta está bajando. |
| 113 | Elegí en la fila a quien tiene permiso (chaleco verde) y F lo suma al grupo. E lo hace cruzar la pista: solo si la ventana alcanza para todo el cruce. Si te agarra el aviso con gente en la franja, vuelven al refugio. Los de chaleco rojo se retiran solos. |
| 162 | Aviso de aterrizaje: no empecés cruces largos. |
| 172 | Empezaste tarde: el grupo vuelve al refugio. |
| 255 | Pista de Puerto Lempira · llegó una cama |
| 255 | Pista de Puerto Lempira |
| 263 | Refugio de llegada |
| 288 | 📢 Aviso de aterrizaje |
| 290 | 🛬 Avioneta en pista |

</details>

<details><summary><code>apps/web/src/game/minigames/graciasadios/Rastros.tsx</code> · 8 textos</summary>

| Línea | Texto |
|---:|---|
| 127 | Eso es seguir al animal: se canceló el recorrido. |
| 131 | Ahí está el rastro: buscá un lugar lejos. |
| 138 | de más |
| 148 | Ordená las huellas del jaguar por la hora: así sabés hacia dónde va. F marca la zona de exclusión (el rastro y las dos casillas que siguen). E elige el lugar de observación: lejos y nunca adelante del animal. Las huellas de danto no cuentan. |
| 149 | marcar exclusión |
| 149 | observar desde ahí |
| 189 | El rastro se enfrió: llegó otro mapa. |
| 243 | Mapa del Río Plátano · zona de exclusión |

</details>

<details><summary><code>apps/web/src/game/minigames/graciasadios/Wabul.tsx</code> · 9 textos</summary>

| Línea | Texto |
|---:|---|
| 70 | Misma dirección otra vez: se hizo placa. Cruzá la pasada. |
| 75 | ¡Wabul sin grumos! Otra tanda de plátano. |
| 93 | voltear el mazo ↔ ↕ |
| 123 | ↔ por fila |
| 123 | ↕ por columna |
| 125 | Sin placas |
| 159 | Wabul de Puerto Lempira · el guacal |
| 190 | Mazo ↔ |
| 190 | Mazo ↕ |

</details>

<details><summary><code>apps/web/src/game/minigames/graciasadios/comun.tsx</code> · 5 textos</summary>

| Línea | Texto |
|---:|---|
| 27 | WASD / mouse |
| 28 | F / clic |
| 29 | E · mando X |
| 30 | Mando: stick derecho / RT |
| 32 | Palanca / arrastrá |

</details>
