# Tickets · Mundo Catrucho

Tamaños: C = hasta 1 día · M = 2 a 4 días · G = 1 a 2 semanas.

## Fase 0 · Pulido del prototipo

Se puede hacer ya, sin cuentas.

| Id | Ticket | Listo cuando | Tamaño | Depende de |
|---|---|---|---|---|
| MC-01 | Primer commit, GitHub y revisión automática | Cada cambio compila el juego y corre la prueba de punta a punta en GitHub Actions. | C | — |
| MC-02 | Vista desde arriba del mapa gigante | En el lobby se aleja la cámara con la rueda, pellizco o un botón hasta ver toda Honduras desde arriba, con los rótulos de los 18 departamentos legibles; se vuelve al muñeco con un toque. | M | — |
| MC-03 | Afinar la dificultad de las etapas | Una persona gana la etapa 1 de cada motor al primer intento y la última le cuesta. | M | — |
| MC-04 | Probar los motores en celular | Cada motor se juega completo con los dedos; los fallos quedan corregidos. | M | — |
| MC-05 | Atardecer y noche que se vean bien | El mapa y los viajes vuelven a tener ciclo de día sin quedar oscuros. | C | — |

## Fase 1 · La base

Cuentas y avance en la nube. Usa tu cuenta de Cloudflare y una de Convex y Clerk.

| Id | Ticket | Listo cuando | Tamaño | Depende de |
|---|---|---|---|---|
| MC-06 | Crear el proyecto de Convex y subir el esquema | `npx convex dev` corre y todas las tablas existen. | C | tus cuentas |
| MC-07 | Cuentas con Clerk | Entrar con Google o correo usando Clerk; Convex reconoce al usuario por su token (integración oficial Convex + Clerk). | M | MC-06 |
| MC-08 | Jugar sin cuenta y crearla después | Se juega sin registrarse; al crear la cuenta, el avance guardado en el navegador pasa a Convex sin perder nada. | M | MC-07 |
| MC-09 | Perfil y personaje en la nube | Lempiritas, nivel y ropa se leen de Convex y se ven igual en otro dispositivo. | M | MC-07 |
| MC-10 | Catálogo en Convex | Departamentos, motores, juegos, turismo, comidas y palabras se suben con un script y el juego los lee al iniciar. | M | MC-06 |
| MC-11 | Publicar en Cloudflare con tu cuenta | El juego abre en una dirección propia; cada rama tiene su vista previa. Hace falta un token de API de Cloudflare o tu `wrangler login`. | C | tu cuenta de Cloudflare |

## Fase 2 · El servidor manda

Nada que valga se escribe desde el juego.

| Id | Ticket | Listo cuando | Tamaño | Depende de |
|---|---|---|---|---|
| MC-12 | Reglas compartidas | Premios, niveles y topes viven en `packages/reglas` y los usan juego, Convex y salas. | M | MC-09 |
| MC-13 | Tienda en el servidor | Comprar y equipar son mutaciones; no se puede comprar sin Lempiritas. | M | MC-12 |
| MC-14 | Partidas validadas | Abrir y cerrar partida en Convex; un puntaje imposible se rechaza. | G | MC-12 |
| MC-15 | Etapas, visitas y recuerdos en el servidor | El avance de cada juego y departamento se guarda al cerrar la partida. | M | MC-14 |
| MC-16 | Misiones del día y logros | Un cron reparte las misiones a medianoche de Honduras; los logros los da el servidor. | M | MC-14 |
| MC-17 | Tablas de clasificación reales | Por juego y por departamento, con jugadores de verdad. | M | MC-14 |

## Fase 3 · Verse y hablar

Los demás dejan de ser bots.

| Id | Ticket | Listo cuando | Tamaño | Depende de |
|---|---|---|---|---|
| MC-18 | Pase firmado de sala | Convex firma el pase y la sala rechaza a quien no lo trae. | M | MC-07 |
| MC-19 | Ver a otros moverse | El juego manda su posición 15 veces por segundo y dibuja a los demás suavizados. | G | MC-18 |
| MC-20 | Salas de mapa y de departamento | Tramos de 24 jugadores; al llenarse se abre otro. | M | MC-19 |
| MC-21 | Emotes entre jugadores | Lo que hace uno lo ven los de su sala. | C | MC-19 |
| MC-22 | Chat moderado | Chat de sala y entre amigos, con filtro de palabras y de datos personales, límite de mensajes, reportar, silenciar y bloquear. Se puede apagar en Ajustes. Los reportes llegan a una cola de moderación. | G | MC-19 |
| MC-23 | Conectados reales y bots de relleno | El mapa muestra la ocupación verdadera; con poca gente la sala agrega bots marcados como bots. | M | MC-20 |

## Fase 4 · Dúo y mundo abierto

Jugar minijuegos con otra persona.

| Id | Ticket | Listo cuando | Tamaño | Depende de |
|---|---|---|---|---|
| MC-24 | Amigos e invitación con código | Un código de 5 letras mete a dos personas a la misma partida. | M | MC-18 |
| MC-25 | Sala de partida | Reloj, semilla, puntajes y recibo firmado al terminar. | G | MC-14, MC-18 |
| MC-26 | Dúo y mundo abierto en el kit de motores | Todo motor nuevo declara cómo se juega de a dos y con varios; el kit lo resuelve sin código repetido. | G | MC-25, MC-32 |

## Fase 5 · Viajes reales

Rutas por carreteras reales, paradas, vendedores y eventos de carretera (21 rutas, 20 eventos, 12 vehículos).

| Id | Ticket | Listo cuando | Tamaño | Depende de |
|---|---|---|---|---|
| MC-27 | Rutas reales entre departamentos | Cada viaje sigue su carretera real (CA-5, CA-4…), con su paisaje y su duración proporcional a la real; se puede saltar. | G | — |
| MC-28 | Paradas y vendedores en el camino | El bus para donde le hacen la parada; se suben vendedores y se puede comprar comida típica del tramo. | M | — |
| MC-29 | Eventos de carretera | Derrumbes, ganado en la calle, neblina, peajes, retenes de tránsito y túmulos aparecen según la ruta. | M | — |
| MC-30 | Vehículos nuevos | Pickup con gente atrás, mototaxi, lancha y barco a Islas de la Bahía, avioneta o lancha a La Mosquitia, cayuco y bicitaxi, cada uno con su manejo. | G | — |
| MC-31 | Viaje compartido | Varios jugadores en el mismo bus; uno maneja y los demás van de pasajeros. | M | MC-20, MC-27 |

## Fase 6 · Contenido exclusivo por departamento

Cada motor pertenece a un solo departamento: 144 motores (130 nuevos), 216 juegos, 118 lugares para explorar y 54 locuras. Un ticket por departamento; dentro van sus juegos como lista.

| Id | Ticket | Listo cuando | Tamaño | Depende de |
|---|---|---|---|---|
| MC-32 | Kit de motores | Plantilla para crear un motor nuevo en días y no semanas: ciclo de etapas, HUD, bots, dúo, guardado y prueba automática. | G | — |
| MC-33 | Panel de contenido | Editar lugares, comidas, palabras, turismo y parámetros de juegos sin publicar versión; una mecánica nueva sí requiere código. | G | MC-10 |
| MC-34 | Revisión cultural | Una persona de cada departamento revisa sus juegos, turismo y locuras antes de publicarlos; lo dudoso se corrige o se quita. | M | — |
| MC-35 | Exploración turística | Cada lugar turístico es un punto que se descubre caminando y tiene una actividad (foto, subir, probar, ayudar), con su álbum de recuerdos. | M | MC-15 |
| MC-36 | Departamento: Francisco Morazán | 8 motores exclusivos (5 nuevos), 12 juegos, 6 lugares para explorar y 3 locuras, jugables y revisados. | G | MC-32, MC-34 |
| MC-37 | Departamento: Comayagua | 8 motores exclusivos (8 nuevos), 12 juegos, 7 lugares para explorar y 3 locuras, jugables y revisados. | G | MC-32, MC-34 |
| MC-38 | Departamento: La Paz | 8 motores exclusivos (8 nuevos), 12 juegos, 6 lugares para explorar y 3 locuras, jugables y revisados. | G | MC-32, MC-34 |
| MC-39 | Departamento: Cortés | 8 motores exclusivos (7 nuevos), 12 juegos, 9 lugares para explorar y 3 locuras, jugables y revisados. | G | MC-32, MC-34 |
| MC-40 | Departamento: Atlántida | 8 motores exclusivos (7 nuevos), 12 juegos, 7 lugares para explorar y 3 locuras, jugables y revisados. | G | MC-32, MC-34 |
| MC-41 | Departamento: Colón | 8 motores exclusivos (7 nuevos), 12 juegos, 6 lugares para explorar y 3 locuras, jugables y revisados. | G | MC-32, MC-34 |
| MC-42 | Departamento: Islas de la Bahía | 8 motores exclusivos (8 nuevos), 12 juegos, 7 lugares para explorar y 3 locuras, jugables y revisados. | G | MC-32, MC-34 |
| MC-43 | Departamento: Yoro | 8 motores exclusivos (7 nuevos), 12 juegos, 6 lugares para explorar y 3 locuras, jugables y revisados. | G | MC-32, MC-34 |
| MC-44 | Departamento: Gracias a Dios | 8 motores exclusivos (7 nuevos), 12 juegos, 6 lugares para explorar y 3 locuras, jugables y revisados. | G | MC-32, MC-34 |
| MC-45 | Departamento: Copán | 8 motores exclusivos (8 nuevos), 12 juegos, 7 lugares para explorar y 3 locuras, jugables y revisados. | G | MC-32, MC-34 |
| MC-46 | Departamento: Lempira | 8 motores exclusivos (7 nuevos), 12 juegos, 8 lugares para explorar y 3 locuras, jugables y revisados. | G | MC-32, MC-34 |
| MC-47 | Departamento: Ocotepeque | 8 motores exclusivos (8 nuevos), 12 juegos, 6 lugares para explorar y 3 locuras, jugables y revisados. | G | MC-32, MC-34 |
| MC-48 | Departamento: Santa Bárbara | 8 motores exclusivos (7 nuevos), 12 juegos, 6 lugares para explorar y 3 locuras, jugables y revisados. | G | MC-32, MC-34 |
| MC-49 | Departamento: Intibucá | 8 motores exclusivos (7 nuevos), 12 juegos, 6 lugares para explorar y 3 locuras, jugables y revisados. | G | MC-32, MC-34 |
| MC-50 | Departamento: Olancho | 8 motores exclusivos (6 nuevos), 12 juegos, 6 lugares para explorar y 3 locuras, jugables y revisados. | G | MC-32, MC-34 |
| MC-51 | Departamento: El Paraíso | 8 motores exclusivos (7 nuevos), 12 juegos, 7 lugares para explorar y 3 locuras, jugables y revisados. | G | MC-32, MC-34 |
| MC-52 | Departamento: Choluteca | 8 motores exclusivos (8 nuevos), 12 juegos, 6 lugares para explorar y 3 locuras, jugables y revisados. | G | MC-32, MC-34 |
| MC-53 | Departamento: Valle | 8 motores exclusivos (8 nuevos), 12 juegos, 6 lugares para explorar y 3 locuras, jugables y revisados. | G | MC-32, MC-34 |
| MC-54 | Eventos por fecha | Feria Juniana, Carnaval de La Ceiba, 15 de septiembre y otras fechas se encienden solas. | M | MC-33 |

## Fase 7 · Celulares y arte

| Id | Ticket | Listo cuando | Tamaño | Depende de |
|---|---|---|---|---|
| MC-55 | Cargar por departamento | La primera carga pesa menos de 3 MB; cada departamento baja al entrar. | M | — |
| MC-56 | Rendimiento en celular | 30 cuadros por segundo estables en un celular de gama media, medido. | M | MC-55 |
| MC-57 | Mando | Todo el juego se maneja con mando. | C | — |
| MC-58 | Animaciones exageradas | Caídas, celebraciones y emotes de las locuras con animación propia. | G | — |
| MC-59 | Clubes, Selección y marcas con apodos | Escudos y nombres propios para todo lo que es marca de otros. Si algún día hay permiso escrito, se cambia por el real. | C | — |
