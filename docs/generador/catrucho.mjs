// Genera plan-mundo-catrucho.html a partir del catálogo real del juego (catrucho/shared/data).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chip, contar, esc, mermaid, page, reqs, section, table, tickets, ticketsMd, tree } from './lib.mjs';
import { TICKETS, CONTENIDO, VIAJES, TOTALES, ESFUERZO, PRIMER_DEPTO, ULTIMO_DEPTO } from './tickets-catrucho.mjs';

const here = dirname(fileURLToPath(import.meta.url)), data = join(here, '../../apps/web/shared/data');
const J = f => JSON.parse(readFileSync(join(data, f), 'utf8'));
const depts = J('departments.json').departments, shop = J('shop.json'), motores = J('minigames.json');
const cat = Object.assign({}, ...['centro', 'norte', 'occidente', 'sur-oriente'].map(f => J(`catalogo/${f}.json`)));
const META = 20; // meta de juegos por departamento que pidió el usuario (de 10 a 20)
const BIOMA = { costa: 'Costa caribe', sur: 'Sur cálido', valle: 'Valle', lago: 'Lago', montana: 'Montaña', capital: 'Capital', selva: 'Selva', isla: 'Islas', bosque: 'Bosque nublado' };
const ORDEN = ['franciscomorazan', 'comayagua', 'lapaz', 'cortes', 'atlantida', 'colon', 'islas', 'yoro', 'graciasadios', 'copan', 'lempira', 'ocotepeque', 'santabarbara', 'intibuca', 'olancho', 'elparaiso', 'choluteca', 'valle'];
const D = ORDEN.map(id => ({ ...depts.find(d => d.id === id), c: cat[id], x: CONTENIDO[id] ?? { esencia: '', motores: [], juegos: [], turismo: [], locuras: [] } }));
const total = TOTALES.juegos, lugares = D.reduce((n, d) => n + d.c.lugares.length, 0), comidas = D.reduce((n, d) => n + d.c.comidas.length, 0), palabras = D.reduce((n, d) => n + d.c.palabras.length, 0);
const lista = D.flatMap(d => d.x.juegos);
const porTipo = t => lista.filter(j => j.tipo === t).length;
const variantes = lista.filter(j => j.origen).length;
const reutilizados = D.flatMap(d => d.x.motores).filter(m => m.reutiliza).map(m => m.reutiliza);
const nombreMotor = Object.fromEntries(motores.map(m => [m.id, m.name]));

// ------------------------------------------------------------------ requerimientos
const RF = [
  ['Cuenta y avance', [
    ['RF-01', 'Jugar como invitado, sin registrarse. El avance queda en el dispositivo.', 1, 'hecho'],
    ['RF-02', 'Crear cuenta con Google o correo usando Clerk, y pasar a la cuenta el avance que se jugó sin ella.', 1, 'pendiente'],
    ['RF-03', 'Avance en la nube: Lempiritas, nivel, ropa, etapas y logros se ven igual en cualquier dispositivo.', 1, 'pendiente'],
  ]],
  ['Personaje y ropero', [
    ['RF-04', 'Escoger hombre o mujer, piel, cabello, rostro y nombre.', 1, 'hecho'],
    ['RF-05', 'Ropero con atuendos hondureños por grupo: folclor, maya, Selección, clubes y Honduras de calle.', 1, 'hecho', '25 atuendos hoy.'],
    ['RF-06', 'Clubes, Selección y marcas van con apodos y escudos propios. Si algún día hay permiso escrito, se cambian por los reales.', 1, 'hecho', 'Decidido: aprobaste la propuesta.'],
  ]],
  ['El mapa gigante', [
    ['RF-07', 'El lobby es un mapa de Honduras que se camina, con los 18 departamentos y su relieve y vegetación.', 1, 'hecho'],
    ['RF-08', 'Cada departamento muestra qué tipos de juego tiene, cuántos son y cuánta gente hay conectada.', 1, 'parcial', 'Los conectados son simulados.'],
    ['RF-09', 'Alrededor del mapa, un paseo con lo más conocido del país.', 2, 'hecho', '12 placas.'],
    ['RF-10', 'No hay menú de minijuegos. A un juego solo se entra caminando hasta su puesto.', 1, 'hecho'],
    ['RF-35', 'Vista desde arriba: la cámara del lobby se aleja hasta ver toda Honduras, con los departamentos legibles, y vuelve al muñeco.', 1, 'pendiente'],
  ]],
  ['Viajes', [
    ['RF-11', 'Viajar caminando por el mapa gigante hasta el portal del departamento.', 1, 'hecho'],
    ['RF-12', 'Viajar directo desde el mapa 2D.', 1, 'hecho'],
    ['RF-13', 'Terminal de buses: rapidito, taxi o bus amarillo, con pasaje, tráfico, choques, claxon y radio.', 1, 'hecho'],
    ['RF-36', 'Viajes reales: cada ruta sigue su carretera real, con paisaje, paradas, vendedores que se suben y eventos de carretera; la duración es proporcional a la real y se puede saltar.', 1, 'pendiente', `${VIAJES.rutas.length} rutas y ${VIAJES.eventosDeCarretera.length} eventos planeados.`],
    ['RF-37', 'Más vehículos según el lugar: pickup, mototaxi, lancha y barco a Islas, avioneta o lancha a La Mosquitia, cayuco y bicitaxi.', 2, 'parcial', 'Hoy hay rapidito, taxi, bus y mototaxi.'],
    ['RF-14', 'Viaje compartido: varios jugadores en el mismo bus, uno maneja.', 3, 'pendiente'],
  ]],
  ['Departamentos', [
    ['RF-15', 'Cada departamento tiene sus ciudades y lugares naturales como estaciones que se recorren a pie.', 1, 'hecho', `${lugares} lugares.`],
    ['RF-16', 'Contenido exclusivo: cada motor (mecánica) pertenece a un solo departamento. Si un juego existe en un departamento, no existe en ningún otro, ni con otro tema.', 1, 'pendiente', `${TOTALES.motores} motores exclusivos, ${total} juegos.`],
    ['RF-17', 'Puestos de comida típica en cada lugar, con la doña de delantal y el perro aguacatero.', 1, 'hecho', `${comidas} comidas.`],
    ['RF-18', 'Hondureñismos de cada zona en rótulos y trivias (paleta en Tegus, pilón en Comayagua).', 1, 'hecho', `${palabras} palabras.`],
    ['RF-19', 'Guiños que solo entiende quien conoce el lugar, en cada juego.', 2, 'parcial', 'Cada juego tiene uno escrito; faltan los visuales.'],
    ['RF-38', 'Exploración turística: lugares que se descubren caminando, cada uno con una actividad (foto, subir, probar, ayudar) y un álbum de recuerdos.', 1, 'pendiente', `${TOTALES.turismo} lugares.`],
    ['RF-39', 'Locuras: memes, momentos virales y costumbres graciosas de cada zona como animaciones, emotes, personajes y sorpresas, sin burlarse de nadie.', 2, 'pendiente', `${TOTALES.locuras} planeadas.`],
  ]],
  ['Minijuegos', [
    ['RF-20', 'Tres tipos de juego: estrella (lo más propio del lugar), normal y loco (absurdo y muy chistoso). Todos usan un motor de su propio departamento.', 1, 'pendiente', `${porTipo('estrella')} estrella, ${porTipo('normal')} normales y ${porTipo('loco')} locos.`],
    ['RF-21', 'Los juegos son largos: de 3 a 6 etapas, y el avance se guarda.', 1, 'hecho', 'Guardado local.'],
    ['RF-22', 'Modos: solo con bots, dúo y mundo abierto. Si falta gente, se completa con bots.', 1, 'parcial', 'Hoy todos los demás son bots.'],
    ['RF-23', 'Al terminar: estrellas, premios y posiciones.', 1, 'hecho'],
    ['RF-24', 'El servidor valida cada resultado antes de dar premios.', 1, 'pendiente'],
  ]],
  ['Economía', [
    ['RF-25', 'Lempiritas y experiencia por jugar, visitar y coleccionar. Niveles.', 1, 'hecho', 'Guardado local.'],
    ['RF-26', 'Tienda de ropa y emotes. Sin dinero real en la primera versión.', 1, 'hecho'],
    ['RF-27', 'Misiones del día y logros.', 2, 'hecho'],
    ['RF-28', 'Tablas de clasificación por juego y por departamento.', 2, 'parcial', 'Hoy contra marcas simuladas.'],
  ]],
  ['Jugar con otros', [
    ['RF-29', 'Ver a otros jugadores moverse en el mapa y en los departamentos.', 1, 'pendiente'],
    ['RF-30', 'Amigos, invitación a dúo con código y salas privadas.', 1, 'pendiente'],
    ['RF-31', 'Chat de sala y entre amigos, con filtro, límite de mensajes, reportar, silenciar y bloquear; se puede apagar. También emotes y frases rápidas.', 1, 'parcial', 'Decidido: con chat. Los emotes ya existen.'],
    ['RF-32', 'Eventos por fecha: Feria Juniana, Carnaval de La Ceiba, 15 de septiembre.', 3, 'pendiente'],
  ]],
  ['Contenido', [
    ['RF-33', 'Panel para agregar juegos, lugares, comidas y palabras sin publicar una versión nueva.', 2, 'pendiente'],
    ['RF-34', 'Cada dato cultural lo revisa alguien del departamento antes de publicarse.', 2, 'pendiente', 'El catálogo actual se escribió sin revisar contra fuentes.'],
  ]],
];
const RNF = [
  ['Calidad', [
    ['RNF-01', '60 cuadros por segundo en computadora y 30 estables en celular de gama media.', 1, 'parcial', 'En computadora ya da 60; en celular no se ha medido.'],
    ['RNF-02', 'Menos de 350 llamadas de dibujo por escena.', 1, 'hecho', 'Hoy entre 150 y 314.'],
    ['RNF-03', 'Primera carga de menos de 3 MB. Lo demás se baja al entrar a cada departamento.', 2, 'parcial', 'Hoy todo pesa 1.95 MB en un solo archivo.'],
    ['RNF-04', 'Teclado y mouse, pantalla táctil y mando.', 1, 'parcial', 'Falta mando.'],
    ['RNF-05', 'Los demás jugadores se ven con menos de 150 ms de retraso desde Centroamérica.', 1, 'pendiente'],
    ['RNF-06', 'Una sala de mundo abierto aguanta 24 jugadores; con más gente se abre otra.', 2, 'pendiente'],
  ]],
  ['Seguridad y cuidado', [
    ['RNF-07', 'Lempiritas, compras y avance solo se escriben en el servidor.', 1, 'pendiente'],
    ['RNF-08', 'Cuidado del público joven: el chat filtra groserías, teléfonos y direcciones; los nombres se filtran y ningún dato personal queda a la vista.', 1, 'pendiente'],
    ['RNF-09', 'Si se cae la conexión, se sigue jugando solo y se sincroniza al volver.', 2, 'pendiente'],
    ['RNF-10', 'Texto en español de Honduras, con estructura lista para traducir.', 3, 'parcial'],
  ]],
];

// ------------------------------------------------------------------ arquitectura
const CAPAS = [
  ['Juego', 'React, TypeScript, React Three Fiber, Zustand, Tailwind, Vite', 'Todo lo que se ve y se juega: mapa, departamentos, motores e interfaz. Hoy existen 14 motores; los demás se hacen con el kit de motores.'],
  ['Publicación', 'Cloudflare Workers con archivos estáticos', 'Sirve el juego desde el punto más cercano al jugador. Una vista previa por cada rama.'],
  ['Datos y reglas', 'Convex', 'Cuentas, perfil, ropa, avance, tienda, misiones y tablas. Cada cambio pasa por una mutación que valida. Las consultas se actualizan solas en pantalla.'],
  ['Tiempo real', 'Cloudflare Durable Objects (WebSocket con hibernación)', 'Una sala por tramo del mapa, por departamento y por partida. Reparte posiciones 15 veces por segundo y arbitra las partidas.'],
  ['Sesión', 'Clerk', 'Pantallas de entrada con Google y correo, ya hechas. Convex valida el token de Clerk con su integración oficial. Se juega sin cuenta y el avance pasa a la cuenta al crearla.'],
  ['Chat', 'Durable Object de la sala más Convex', 'La sala reparte los mensajes en vivo; Convex guarda reportes y bloqueos. Un filtro corre antes de repartir.'],
  ['Archivos', 'Cloudflare R2', 'Modelos, texturas y audio cuando el arte deje de ser todo por código.'],
  ['Protección', 'Cloudflare Turnstile y límites por IP en Workers', 'Frena bots y abuso antes de que lleguen a Convex.'],
  ['Medición', 'Workers Analytics Engine', 'Qué juegos se juegan, en qué etapa se abandonan, cuánto tarda cada carga.'],
  ['Entrega', 'GitHub Actions con wrangler y convex deploy', 'Cada cambio aprobado se publica solo.'],
];
const TABLAS = [
  ['usuarios', 'clerkId, nombre, creado', 'Se crea la primera vez que llega un token de Clerk.'],
  ['perfiles', 'usuarioId, avatar, monedas, xp, nivel, modo', 'Un documento por jugador. Solo lo cambian las mutaciones.'],
  ['inventario', 'usuarioId, itemId, obtenido', 'Ropa y emotes que tiene.'],
  ['progresoJuegos', 'usuarioId, juegoId, etapa, estrellas[], mejor, veces', 'El avance por etapas de cada juego.'],
  ['visitas', 'usuarioId, deptId, recuerdo', 'Departamentos visitados y recuerdos encontrados.'],
  ['misionesDia', 'usuarioId, fecha, misiones[]', 'Las reparte un cron a medianoche, hora de Honduras.'],
  ['logros', 'usuarioId, logroId, fecha', ''],
  ['partidas', 'juegoId, etapa, modo, sala, jugadores[], semilla, estado, resultado', 'Se abre antes de jugar y se cierra con el recibo de la sala.'],
  ['marcas', 'juegoId, usuarioId, puntos, etapa', 'Tablas de clasificación; índice por juego y por departamento.'],
  ['amistades', 'a, b, estado', ''],
  ['invitaciones', 'codigo, de, juegoId, vence', 'Código de 5 letras para dúo o sala privada.'],
  ['salas', 'tipo, deptId, tramo, ocupacion', 'La escribe la sala cada 30 segundos; de aquí salen los conectados del mapa.'],
  ['catalogo', 'departamentos, motores, juegos, turismo, locuras, rutas, comidas, palabras, items, version', 'El contenido. Se edita desde el panel y el juego lo lee al iniciar.'],
  ['eventos', 'nombre, desde, hasta, deptId, reglas', 'Ferias y fechas especiales.'],
  ['reportes', 'de, a, motivo, mensaje, fecha, estado', 'Cola de moderación de nombres, chat y conducta.'],
  ['bloqueos', 'de, a', 'A quién no ve ni escucha cada jugador.'],
];
const FUNCIONES = [
  ['Consultas', 'miPerfil · catalogo · progresoDe(departamento) · tabla(juego) · conectados · misAmigos'],
  ['Mutaciones', 'alEntrar (crea el usuario desde Clerk) · subirAvanceLocal · guardarAvatar · comprar · equipar · reclamarMision · viajar · abrirPartida · invitar · aceptarInvitacion'],
  ['Internas', 'cerrarPartida (solo la llama la sala con su recibo firmado) · anotarOcupacion'],
  ['Acciones', 'emitirPaseDeSala (firma un pase corto para entrar a una sala)'],
  ['Crons', 'repartirMisionesDelDia · abrirYCerrarEventos · limpiarPartidasViejas'],
];
const SALAS = [
  ['mapa:<tramo>', 'El mapa gigante', '24', 'Posiciones, emotes y vehículos. Si se llena, se abre otro tramo.'],
  ['dept:<id>:<tramo>', 'Un departamento', '24', 'Lo mismo, más quién está en cada puesto.'],
  ['juego:<partida>', 'Una partida en dúo o mundo abierto', '2 a 8', 'Reloj, semilla, puntajes y bots de relleno. Al terminar manda el recibo a Convex.'],
  ['viaje:<id>', 'Un bus compartido', '8', 'Quién maneja, choques y radio. Para la fase de viaje compartido.'],
];
const MOTOR_NOTA = {
  corte: 'Los dos cortan lo mismo y compiten por el combo.', monta: 'Turnos, o los dos a la vez en corrales vecinos.', ritmo: 'La misma canción; gana la mejor precisión.', ruta: 'Carrera en la misma ruta, con fantasmas del otro.',
  pesca: 'Mismo muelle; el pez grande es del primero que lo engancha.', atrapa: 'Mismo campo; cada cosa es de quien llega primero.', cocina: 'Dúo cooperativo: uno arma, el otro entrega.', trivia: 'Todos escogen plataforma al mismo tiempo.',
  manejo: 'Carrera por las mismas paradas.', futbol: 'Dos contra dos, con bots de relleno.', feria: 'Turnos en cada puesto.', exploradores: 'Cooperativo: se reparten los objetos.', pulperia: 'Dúo cooperativo en el mostrador.', carrera: 'Carrera lado a lado.',
};
const TAM_SEM = { C: [0.2, 0.2], M: [0.4, 0.8], G: [1, 2] };
const FASES = TICKETS.map(([titulo, nota, ts]) => { const [a, b] = ts.reduce(([x, y], t) => [x + TAM_SEM[t[3]][0], y + TAM_SEM[t[3]][1]], [0, 0]); const dep = titulo.includes('exclusivo');
  return [titulo.split(' · ')[0].replace('Fase ', ''), titulo.split(' · ')[1], nota || '—', String(ts.length), dep ? `${ESFUERZO[0]} a ${ESFUERZO[1]} semanas-persona` : `${Math.round(a)} a ${Math.ceil(b)} semanas`]; });
const RIESGOS = [
  ['Esfuerzo', `Cada motor exclusivo es código propio. Con ${TOTALES.nuevos} motores nuevos, ${total} juegos y ${TOTALES.turismo} lugares turísticos, el contenido suma de ${ESFUERZO[0]} a ${ESFUERZO[1]} semanas-persona. El kit de motores busca bajar eso; conviene empezar por dos o tres departamentos y medir.`],
  ['Memes y personas reales', 'Las locuras usan apodos y parodias, nunca el nombre de una persona privada. Cada una tiene su fuente y pasa la revisión cultural.'],
  ['Datos culturales', 'El catálogo se escribió de memoria. Antes de publicar, cada departamento necesita una revisión de alguien de ahí.'],
  ['Chat', 'Con chat hay que moderar desde el primer día: filtro, reportes, bloqueos y alguien que revise la cola. Se puede limitar a amigos si hace falta.'],
  ['Costo', 'Cloudflare y Convex tienen plan gratuito para empezar. El gasto real depende de cuánta gente se conecte a la vez; conviene revisar sus precios vigentes antes de la fase 3.'],
  ['Motor', 'Seguir en la web permite publicar hoy y jugar sin instalar. Pasar a Unity solo valdría la pena si se quiere consola.'],
];

// ------------------------------------------------------------------ departamentos (sale del catálogo)
const lugarDe = (d, id) => d.c.lugares.find(l => l[0] === id)?.[1] ?? id;
const TIPO = { estrella: 'Estrella', normal: 'Normal', loco: 'Loco' };
const TURISMO = { mirador: 'Mirador', sitio: 'Sitio', naturaleza: 'Naturaleza', festividad: 'Festividad', comida: 'Comida', leyenda: 'Leyenda', oficio: 'Oficio', viral: 'Viral' };
const fuente = u => (u ? ` <a class="nota" href="${esc(u)}" target="_blank" rel="noopener">fuente</a>` : '');
const deptHtml = d => {
  const x = d.x, n = x.juegos.length, motor = Object.fromEntries(x.motores.map(m => [m.id, m]));
  return `<div class="dept" id="d-${d.id}">
    <div class="dept-h"><h3>${esc(d.name)}</h3><span>${esc(d.cabecera)} · ${BIOMA[d.biome]} · ${d.c.tipos}</span></div>
    ${x.esencia ? `<p class="esencia">${esc(x.esencia)}</p>` : ''}
    <div class="barra" role="img" aria-label="${n} de ${META} juegos"><i style="width:${Math.round(n / META * 100)}%"></i></div>
    <p class="nota">${x.motores.length} motores propios · ${n} juegos de ${META} · ${x.turismo.length} lugares para explorar · ${x.locuras.length} locuras.</p>
    <h4>Motores que solo existen aquí</h4>
    ${table(['Motor', 'Cómo se juega', 'Por qué solo aquí', 'Código'], x.motores.map(m => [m.nombre, m.mecanica, m.porQueAqui, m.reutiliza ? `Reutiliza «${nombreMotor[m.reutiliza] ?? m.reutiliza}»` : 'Nuevo']), 'motores-d')}
    <h4>Juegos</h4>
    ${table(['#', 'Juego', 'Lugar', 'Tipo', 'De qué va', 'Motor', 'Etapas'], x.juegos.map((j, i) => [String(i + 1), { html: `${esc(j.icono)} ${esc(j.nombre)}${j.guino ? `<details><summary>Guiño</summary><p>${esc(j.guino)}</p></details>` : ''}` }, lugarDe(d, j.lugar), { html: `<span class="tipo ${esc(j.tipo)}">${TIPO[j.tipo] ?? j.tipo}</span>` }, j.deQueVa, motor[j.motor]?.nombre ?? j.motor, String(j.etapas)]), 'juegos juegos-d')}
    <div class="cols">
      <div><h4>Para explorar</h4><ul class="lista">${x.turismo.map(t => `<li><b>${esc(t.nombre)}</b> <span class="chip">${TURISMO[t.tipo] ?? esc(t.tipo)}</span><br>${esc(t.queHaces)} <span class="nota">${esc(t.dato)}</span>${fuente(t.fuente)}</li>`).join('')}</ul></div>
      <div><h4>Locuras</h4><ul class="lista">${x.locuras.map(l => `<li><b>${esc(l.nombre)}</b><br>${esc(l.queEs)} <span class="nota">En el juego: ${esc(l.comoAparece)}</span>${fuente(l.fuente)}</li>`).join('')}</ul></div>
    </div>
    <dl class="kv">
      <dt>Comidas</dt><dd>${d.c.comidas.map(c => `<b>${esc(c[0])}</b> <span class="nota">(${esc(lugarDe(d, c[1]))})</span>`).join(' · ')}</dd>
      <dt>Se dice</dt><dd>${d.c.palabras.map(p => `<b>${esc(p[0])}</b> <span class="nota">${esc(p[1])}</span>`).join(' · ')}</dd>
    </dl>
  </div>`;
};
const NDEP = Object.fromEntries(depts.map(d => [d.id, d.name]));
const viajesHtml = () => {
  const V = VIAJES; if (!V.rutas.length) return '<p class="nota">Las rutas se están investigando.</p>';
  return `<p>Un viaje dura de 40 segundos a 4 minutos según la distancia real, y se puede saltar. Sigue su carretera, con su paisaje, sus paradas y sus imprevistos.</p>
    ${table(['De', 'A', 'Carretera', 'Real', 'En el juego', 'Paradas', 'Paisaje'], V.rutas.map(r => [NDEP[r.de] ?? r.de, NDEP[r.a] ?? r.a, r.carretera, `${r.horasReales} h`, `${r.minutosEnJuego} min`, { html: r.paradas.map(p => `<b>${esc(p.nombre)}</b>: ${esc(p.queHay)}${p.evento ? ` <span class="nota">${esc(p.evento)}</span>` : ''}`).join('<br>') + fuente(r.fuente) }, (r.paisaje ?? []).join(', ')]), 'rutas')}
    <h3>Lo que puede pasar en la carretera</h3>
    ${table(['Evento', 'Qué es', 'Dónde', 'Qué cambia'], V.eventosDeCarretera.map(e => [e.nombre, e.queEs, e.donde === 'todas' ? 'En todas' : [].concat(e.donde).map(x => NDEP[x] ?? x).join(', '), e.efecto]))}
    <h3>Vehículos</h3>
    ${table(['Vehículo', 'Cómo se maneja', 'Dónde'], V.vehiculos.map(v => [v.nombre, v.comoSeManeja, [].concat(v.donde).map(x => NDEP[x] ?? x).join(', ')]))}`;
};
const atuendos = shop.items.filter(i => i.cat === 'atuendo');
const GRUPO = { undefined: 'Para empezar (gratis)', folclor: 'Folclor', maya: 'Maya', seleccion: 'Selección', club: 'Clubes', honduras: 'Honduras de calle' };

const body = [
  section('resumen', 'Dónde estamos', 'Resumen', `
    <div class="aprobar"><h3>Decisiones tomadas</h3><ul><li><b>Cuentas con Clerk</b>, conectado a Convex con su integración oficial.</li><li><b>Con chat</b>, moderado desde el primer día.</li><li><b>Clubes y marcas con apodos</b> y escudos propios.</li><li><b>Tu cuenta de Cloudflare</b> para publicar el juego y las salas.</li><li><b>Nada se repite entre departamentos:</b> cada motor vive en uno solo.</li></ul></div>
    <p>Mundo Catrucho es un juego 3D para navegador. Se entra a un mapa gigante de Honduras, se viaja a los departamentos y en cada uno se juegan minijuegos hechos con cosas de ahí.</p>
    <p>El prototipo ya se juega de punta a punta, pero todo vive en el navegador de cada persona: no hay cuentas, los demás jugadores son bots y los premios no los valida nadie. Este plan lleva ese prototipo a un juego en línea de verdad, con <b>Cloudflare</b> para publicar y para el tiempo real, <b>Convex</b> para los datos y las reglas, y <b>Clerk</b> para las cuentas.</p>
    <p><a href="https://claude.ai/artifact/SmctS5HY3fg18rh2C1hUmS">Abrir el prototipo jugable</a></p>`),
  section('funcionales', 'Qué tiene que hacer', 'Requerimientos funcionales', reqs(RF)),
  section('calidad', 'Qué tan bien tiene que hacerlo', 'Requerimientos de calidad', reqs(RNF)),
  section('arquitectura', 'Cómo se arma', 'Arquitectura', `
    <p>Tres piezas, cada una con un trabajo claro. El juego dibuja. Convex guarda y decide. Las salas de Cloudflare reparten lo que pasa en vivo.</p>
    ${mermaid(`
flowchart LR
  J["Jugador<br/>navegador o celular"]
  W["Cloudflare Workers<br/>sirve el juego"]
  C[("Convex<br/>datos y reglas")]
  S["Durable Object<br/>sala en vivo"]
  R[("R2<br/>modelos y audio")]
  A["Analytics Engine"]
  W -->|"juego"| J
  J <-->|"consultas y mutaciones"| C
  J <-->|"WebSocket, 15 veces por segundo"| S
  C -->|"pase de sala firmado"| J
  S -->|"recibo de la partida"| C
  R -->|"archivos"| J
  W --> A`)}
    ${table(['Pieza', 'Tecnología', 'Qué hace'], CAPAS)}
    <h3>Quién manda en cada cosa</h3>
    <ul><li><b>Convex</b> manda sobre todo lo que vale: Lempiritas, ropa, avance, tablas. El juego nunca escribe eso directo.</li><li><b>La sala</b> manda sobre la partida: reloj, semilla, puntajes y quién está. Al terminar firma un recibo.</li><li><b>El juego</b> manda solo sobre su propio muñeco y lo que se ve.</li></ul>
    <h3>Una partida en dúo, paso a paso</h3>
    ${mermaid(`
sequenceDiagram
  participant A as Jugador
  participant C as Convex
  participant S as Sala
  A->>C: abrirPartida(juego, etapa, modo)
  C-->>A: pase firmado y dirección de la sala
  A->>S: conectar con el pase
  S-->>A: empieza (semilla, etapa, bots de relleno)
  A->>S: lo que hace cada jugador
  S-->>A: lo que hacen los demás
  S->>C: recibo firmado con el resultado
  C-->>A: premios y avance, por consulta reactiva`)}
    <h3>Salas en vivo</h3>
    ${table(['Sala', 'Para qué', 'Cupo', 'Qué lleva'], SALAS.map(r => [{ html: `<code>${esc(r[0])}</code>` }, r[1], r[2], r[3]]))}`),
  section('datos', 'Qué se guarda', 'Modelo de datos en Convex', `
    ${table(['Tabla', 'Campos principales', 'Notas'], TABLAS.map(r => [{ html: `<code>${esc(r[0])}</code>` }, r[1], r[2]]))}
    <h3>Funciones</h3>
    ${table(['Tipo', 'Funciones'], FUNCIONES)}`),
  section('motores', 'Un motor, un departamento', 'Minijuegos', `
    <p>Un motor es una mecánica jugable. Cada motor pertenece a <b>un solo departamento</b>: si un juego existe en Olancho, no existe en ningún otro lado, ni cambiándole el tema. En total son <b>${TOTALES.motores} motores</b>: ${TOTALES.motores - TOTALES.nuevos} reutilizan el código de los 14 que ya existen en el prototipo, cada uno en el departamento que mejor le queda, y <b>${TOTALES.nuevos} son nuevos</b>.</p>
    <p>Hay tres tipos de juego: <b>estrella</b> (${porTipo('estrella')}), lo más propio del lugar; <b>normal</b> (${porTipo('normal')}); y <b>loco</b> (${porTipo('loco')}), absurdo y muy chistoso, inspirado en lo viral de cada zona.</p>
    ${table(['Motor del prototipo', 'Ahora vive en'], motores.map(m => { const d = D.find(dd => dd.x.motores.some(mm => mm.reutiliza === m.id)); return [m.name, d ? d.name : 'Sin asignar']; }))}
    <p class="aviso"><b>Esfuerzo para decidir el ritmo:</b> un motor nuevo es de 1 a 2 semanas; adaptar uno existente, de 2 a 4 días; cada juego sobre su motor, de 2 a 4 días; cada lugar turístico, un día. En total: <b>${ESFUERZO[0]} a ${ESFUERZO[1]} semanas-persona</b> solo de contenido. El kit de motores es lo primero de esa fase porque abarata todo lo demás. Se entrega por departamento.</p>`),
  section('viajes', 'Viajes reales', 'Viajes', viajesHtml()),
  section('departamentos', 'Los 18 departamentos', 'Contenido', `
    <p class="aviso">Todo es propuesta de diseño. Las locuras y los datos turísticos traen su fuente, pero cada departamento pasa por la revisión de alguien de ahí antes de publicarse. Ninguna regla de juego se presenta como una tradición real.</p>
    <p>${total} juegos, ${TOTALES.turismo} lugares para explorar y ${TOTALES.locuras} locuras. La meta es llegar a ${META} juegos por departamento; la barra de cada uno muestra cuánto falta.</p>
    <div class="mapa-d">${D.map(d => `<a href="#d-${d.id}"><span>${esc(d.name)}</span><b>${d.x.juegos.length}/${META}</b></a>`).join('')}</div>
    ${D.map(deptHtml).join('')}`),
  section('ropero', 'El ropero', 'Personaje', `
    <p>${atuendos.length} atuendos completos, cada uno para cuerpo de hombre y de mujer.</p>
    ${Object.entries(GRUPO).map(([g, name]) => { const a = atuendos.filter(i => String(i.grupo) === g); return a.length ? `<h4>${name}</h4><div class="chips">${a.map(i => `<span class="chip" title="${esc(i.nota ?? '')}">${esc(i.name)}${i.price ? ` · L ${i.price}` : ''}</span>`).join('')}</div>` : ''; }).join('')}`),
  section('repositorio', 'Cómo queda el proyecto', 'Repositorio', `
    ${tree(`
mundo-catrucho/
  apps/web/          el juego (el prototipo actual: src/, shared/, tools/)
  convex/            schema.ts, perfiles.ts, tienda.ts, partidas.ts, catalogo.ts, crons.ts
  workers/salas/     la sala en vivo (Durable Object) y su wrangler.toml
  packages/reglas/   premios, niveles y validaciones que comparten juego, Convex y salas
  contenido/         el catálogo en JSON y el script que lo sube a Convex
  docs/              arquitectura, requerimientos y este plan`)}
    <p>La carpeta ya está creada en <code>~/Work/personal/mundo-catrucho</code> y agregada a T3 Code.</p>`),
  section('tickets', 'El trabajo, ticket por ticket', 'Tickets', `
    <div class="aprobar"><h3>Issues en GitHub</h3><p>Son ${contar(TICKETS)} tickets en ${TICKETS.length} fases. Cada uno es un issue y cada fase un hito en el repositorio. Los de departamento (${PRIMER_DEPTO} a ${ULTIMO_DEPTO}) traen adentro la lista de sus motores, juegos, lugares y locuras.</p></div>
    ${tickets(TICKETS)}`),
  section('fases', 'En qué orden', 'Fases', table(['Fase', 'Nombre', 'Qué se entrega', 'Tickets', 'Tiempo estimado'], FASES) + `<p class="nota">Los tiempos son estimados para una persona con ayuda de agentes; no son un compromiso.</p>`),
  section('riesgos', 'Lo que hay que decidir', 'Riesgos y decisiones', `<div class="cols">${RIESGOS.map(([t, x]) => `<div><h3>${esc(t)}</h3><p>${esc(x)}</p></div>`).join('')}</div>`),
].join('\n');

const html = page({
  title: 'Plan Mundo Catrucho', accent: '#0a7c8c', accentDark: '#4fd0de', accent2: '#c2571a', accent2Dark: '#f0a070',
  lead: 'Lo que el juego tiene que hacer, cómo se arma con Cloudflare, Convex y Clerk, y los 18 departamentos con sus motores, juegos, lugares y locuras que no se repiten en ningún otro.',
  facts: [[String(total), 'juegos'], [String(TOTALES.motores), 'motores exclusivos'], [String(TOTALES.turismo), 'lugares para explorar'], [String(TOTALES.locuras), 'locuras'], [String(VIAJES.rutas.length), 'rutas reales'], [String(lugares), 'lugares'], [String(atuendos.length), 'atuendos'], [`${RF.reduce((n, g) => n + g[1].length, 0) + RNF.reduce((n, g) => n + g[1].length, 0)}`, 'requerimientos'], [String(contar(TICKETS)), 'tickets']],
  nav: [['resumen', 'Dónde estamos'], ['funcionales', 'Requerimientos'], ['calidad', 'Calidad'], ['arquitectura', 'Arquitectura'], ['datos', 'Datos'], ['motores', 'Motores'], ['viajes', 'Viajes'], ['departamentos', 'Departamentos'], ...D.map(d => [`d-${d.id}`, '· ' + d.name]), ['ropero', 'Ropero'], ['repositorio', 'Repositorio'], ['tickets', 'Tickets'], ['fases', 'Fases'], ['riesgos', 'Decisiones']],
  body,
});
writeFileSync(join(here, 'plan-mundo-catrucho.html'), html);
writeFileSync(join(here, 'TICKETS-mundo-catrucho.md'), ticketsMd('Mundo Catrucho', TICKETS));
console.log('plan-mundo-catrucho.html', (html.length / 1024).toFixed(0) + ' KB', total, 'juegos');
