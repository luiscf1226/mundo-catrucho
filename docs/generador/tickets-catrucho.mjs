// Tickets (issues) de Mundo Catrucho por fase. [id, título, listo cuando, tamaño (C/M/G), depende de]
// Los tickets por departamento salen de contenido.json: uno por departamento, con sus motores, juegos, turismo y locuras.
import { existsSync, readFileSync } from 'node:fs';

const leer = (f) => {
  const u = new URL(f, import.meta.url);
  return existsSync(u) ? JSON.parse(readFileSync(u, 'utf8')) : null;
};
export const CONTENIDO = leer('./contenido.json') ?? {};
export const VIAJES = leer('./viajes.json') ?? { rutas: [], eventosDeCarretera: [], vehiculos: [] };
const ORDEN = [
  'franciscomorazan',
  'comayagua',
  'lapaz',
  'cortes',
  'atlantida',
  'colon',
  'islas',
  'yoro',
  'graciasadios',
  'copan',
  'lempira',
  'ocotepeque',
  'santabarbara',
  'intibuca',
  'olancho',
  'elparaiso',
  'choluteca',
  'valle',
];
const NOMBRE = {
  franciscomorazan: 'Francisco Morazán',
  comayagua: 'Comayagua',
  lapaz: 'La Paz',
  cortes: 'Cortés',
  atlantida: 'Atlántida',
  colon: 'Colón',
  islas: 'Islas de la Bahía',
  yoro: 'Yoro',
  graciasadios: 'Gracias a Dios',
  copan: 'Copán',
  lempira: 'Lempira',
  ocotepeque: 'Ocotepeque',
  santabarbara: 'Santa Bárbara',
  intibuca: 'Intibucá',
  olancho: 'Olancho',
  elparaiso: 'El Paraíso',
  choluteca: 'Choluteca',
  valle: 'Valle',
};
const deps = ORDEN.filter((d) => CONTENIDO[d]);
const motoresDe = (d) => CONTENIDO[d].motores,
  nuevos = (d) => motoresDe(d).filter((m) => !m.reutiliza).length;
export const TOTALES = {
  motores: deps.reduce((n, d) => n + motoresDe(d).length, 0),
  nuevos: deps.reduce((n, d) => n + nuevos(d), 0),
  juegos: deps.reduce((n, d) => n + CONTENIDO[d].juegos.length, 0),
  turismo: deps.reduce((n, d) => n + CONTENIDO[d].turismo.length, 0),
  locuras: deps.reduce((n, d) => n + CONTENIDO[d].locuras.length, 0),
};
// esfuerzo: motor nuevo 1–2 semanas, motor reutilizado 2–4 días, cada juego sobre su motor 2–4 días, cada punto turístico 1 día
export const ESFUERZO = (() => {
  const reus = TOTALES.motores - TOTALES.nuevos,
    s = (a, b) => [a, b];
  const min = TOTALES.nuevos * 1 + reus * 0.4 + TOTALES.juegos * 0.4 + TOTALES.turismo * 0.2,
    max = TOTALES.nuevos * 2 + reus * 0.8 + TOTALES.juegos * 0.8 + TOTALES.turismo * 0.2;
  return s(Math.round(min), Math.round(max));
})();

let n = 0;
const id = () => `MC-${String(++n).padStart(2, '0')}`;
const fase = (titulo, nota, items) => [
  titulo,
  nota,
  items.map(([t, ok, tam, dep, cuerpo]) => [id(), t, ok, tam, dep ?? '', cuerpo]),
];
const F = {};
const RESTO = [
  (F[0] = fase('Fase 0 · Pulido del prototipo', 'Se puede hacer ya, sin cuentas.', [
    [
      'Primer commit, GitHub y revisión automática',
      'Cada cambio compila el juego y corre la prueba de punta a punta en GitHub Actions.',
      'C',
    ],
    [
      'Vista desde arriba del mapa gigante',
      'En el lobby se aleja la cámara con la rueda, pellizco o un botón hasta ver toda Honduras desde arriba, con los rótulos de los 18 departamentos legibles; se vuelve al muñeco con un toque.',
      'M',
    ],
    [
      'Afinar la dificultad de las etapas',
      'Una persona gana la etapa 1 de cada motor al primer intento y la última le cuesta.',
      'M',
    ],
    ['Probar los motores en celular', 'Cada motor se juega completo con los dedos; los fallos quedan corregidos.', 'M'],
    [
      'Atardecer y noche que se vean bien',
      'El mapa y los viajes vuelven a tener ciclo de día sin quedar oscuros.',
      'C',
    ],
  ])),
  (F[1] = fase(
    'Fase 1 · La base',
    'Cuentas y avance en la nube. Usa tu cuenta de Cloudflare y una de Convex y Clerk.',
    [
      [
        'Crear el proyecto de Convex y subir el esquema',
        '`npx convex dev` corre y todas las tablas existen.',
        'C',
        'tus cuentas',
      ],
      [
        'Cuentas con Clerk',
        'Entrar con Google o correo usando Clerk; Convex reconoce al usuario por su token (integración oficial Convex + Clerk).',
        'M',
      ],
      [
        'Jugar sin cuenta y crearla después',
        'Se juega sin registrarse; al crear la cuenta, el avance guardado en el navegador pasa a Convex sin perder nada.',
        'M',
      ],
      [
        'Perfil y personaje en la nube',
        'Lempiritas, nivel y ropa se leen de Convex y se ven igual en otro dispositivo.',
        'M',
      ],
      [
        'Catálogo en Convex',
        'Departamentos, motores, juegos, turismo, comidas y palabras se suben con un script y el juego los lee al iniciar.',
        'M',
      ],
      [
        'Publicar en Cloudflare con tu cuenta',
        'El juego abre en una dirección propia; cada rama tiene su vista previa. Hace falta un token de API de Cloudflare o tu `wrangler login`.',
        'C',
        'tu cuenta de Cloudflare',
      ],
    ],
  )),
  (F[2] = fase('Fase 2 · El servidor manda', 'Nada que valga se escribe desde el juego.', [
    [
      'Reglas compartidas',
      'Premios, niveles y topes viven en `packages/reglas` y los usan juego, Convex y salas.',
      'M',
    ],
    ['Tienda en el servidor', 'Comprar y equipar son mutaciones; no se puede comprar sin Lempiritas.', 'M'],
    ['Partidas validadas', 'Abrir y cerrar partida en Convex; un puntaje imposible se rechaza.', 'G'],
    [
      'Etapas, visitas y recuerdos en el servidor',
      'El avance de cada juego y departamento se guarda al cerrar la partida.',
      'M',
    ],
    [
      'Misiones del día y logros',
      'Un cron reparte las misiones a medianoche de Honduras; los logros los da el servidor.',
      'M',
    ],
    ['Tablas de clasificación reales', 'Por juego y por departamento, con jugadores de verdad.', 'M'],
  ])),
  (F[3] = fase('Fase 3 · Verse y hablar', 'Los demás dejan de ser bots.', [
    ['Pase firmado de sala', 'Convex firma el pase y la sala rechaza a quien no lo trae.', 'M'],
    ['Ver a otros moverse', 'El juego manda su posición 15 veces por segundo y dibuja a los demás suavizados.', 'G'],
    ['Salas de mapa y de departamento', 'Tramos de 24 jugadores; al llenarse se abre otro.', 'M'],
    ['Emotes entre jugadores', 'Lo que hace uno lo ven los de su sala.', 'C'],
    [
      'Chat moderado',
      'Chat de sala y entre amigos, con filtro de palabras y de datos personales, límite de mensajes, reportar, silenciar y bloquear. Se puede apagar en Ajustes. Los reportes llegan a una cola de moderación.',
      'G',
    ],
    [
      'Conectados reales y bots de relleno',
      'El mapa muestra la ocupación verdadera; con poca gente la sala agrega bots marcados como bots.',
      'M',
    ],
  ])),
  (F[4] = fase('Fase 4 · Dúo y mundo abierto', 'Jugar minijuegos con otra persona.', [
    ['Amigos e invitación con código', 'Un código de 5 letras mete a dos personas a la misma partida.', 'M'],
    ['Sala de partida', 'Reloj, semilla, puntajes y recibo firmado al terminar.', 'G'],
    [
      'Dúo y mundo abierto en el kit de motores',
      'Todo motor nuevo declara cómo se juega de a dos y con varios; el kit lo resuelve sin código repetido.',
      'G',
    ],
  ])),
  (F[5] = fase(
    'Fase 5 · Viajes reales',
    `Rutas por carreteras reales, paradas, vendedores y eventos de carretera${VIAJES.rutas.length ? ` (${VIAJES.rutas.length} rutas, ${VIAJES.eventosDeCarretera.length} eventos, ${VIAJES.vehiculos.length} vehículos)` : ''}.`,
    [
      [
        'Rutas reales entre departamentos',
        'Cada viaje sigue su carretera real (CA-5, CA-4…), con su paisaje y su duración proporcional a la real; se puede saltar.',
        'G',
      ],
      [
        'Paradas y vendedores en el camino',
        'El bus para donde le hacen la parada; se suben vendedores y se puede comprar comida típica del tramo.',
        'M',
      ],
      [
        'Eventos de carretera',
        'Derrumbes, ganado en la calle, neblina, peajes, retenes de tránsito y túmulos aparecen según la ruta.',
        'M',
      ],
      [
        'Vehículos nuevos',
        'Pickup con gente atrás, mototaxi, lancha y barco a Islas de la Bahía, avioneta o lancha a La Mosquitia, cayuco y bicitaxi, cada uno con su manejo.',
        'G',
      ],
      ['Viaje compartido', 'Varios jugadores en el mismo bus; uno maneja y los demás van de pasajeros.', 'M'],
    ],
  )),
  (F[6] = fase(
    'Fase 6 · Contenido exclusivo por departamento',
    `Cada motor pertenece a un solo departamento${TOTALES.motores ? `: ${TOTALES.motores} motores (${TOTALES.nuevos} nuevos), ${TOTALES.juegos} juegos, ${TOTALES.turismo} lugares para explorar y ${TOTALES.locuras} locuras` : ''}. Un ticket por departamento; dentro van sus juegos como lista.`,
    [
      [
        'Kit de motores',
        'Plantilla para crear un motor nuevo en días y no semanas: ciclo de etapas, HUD, bots, dúo, guardado y prueba automática.',
        'G',
      ],
      [
        'Panel de contenido',
        'Editar lugares, comidas, palabras, turismo y parámetros de juegos sin publicar versión; una mecánica nueva sí requiere código.',
        'G',
      ],
      [
        'Revisión cultural',
        'Una persona de cada departamento revisa sus juegos, turismo y locuras antes de publicarlos; lo dudoso se corrige o se quita.',
        'M',
      ],
      [
        'Exploración turística',
        'Cada lugar turístico es un punto que se descubre caminando y tiene una actividad (foto, subir, probar, ayudar), con su álbum de recuerdos.',
        'M',
      ],
      ...deps.map((d) => [
        `Departamento: ${NOMBRE[d]}`,
        `${motoresDe(d).length} motores exclusivos (${nuevos(d)} nuevos), ${CONTENIDO[d].juegos.length} juegos, ${CONTENIDO[d].turismo.length} lugares para explorar y ${CONTENIDO[d].locuras.length} locuras, jugables y revisados.`,
        'G',
        '',
        { dept: d },
      ]),
      [
        'Eventos por fecha',
        'Feria Juniana, Carnaval de La Ceiba, 15 de septiembre y otras fechas se encienden solas.',
        'M',
      ],
    ],
  )),
  (F[7] = fase('Fase 7 · Celulares y arte', '', [
    ['Cargar por departamento', 'La primera carga pesa menos de 3 MB; cada departamento baja al entrar.', 'M'],
    ['Rendimiento en celular', '30 cuadros por segundo estables en un celular de gama media, medido.', 'M'],
    ['Mando', 'Todo el juego se maneja con mando.', 'C'],
    ['Animaciones exageradas', 'Caídas, celebraciones y emotes de las locuras con animación propia.', 'G'],
    [
      'Clubes, Selección y marcas con apodos',
      'Escudos y nombres propios para todo lo que es marca de otros. Si algún día hay permiso escrito, se cambia por el real.',
      'C',
    ],
  ])),
];
// Va primero en el plan, pero se numera al final para no cambiar los números de los issues que ya existen.
const PREP = fase(
  'Preparación · Repo y herramientas',
  'Antes de programar: estructura, revisión automática, guía para agentes, capturas y entornos.',
  [
    [
      'Estructura y comandos',
      'Un `pnpm install` en la raíz instala todo; `pnpm dev`, `pnpm test`, `pnpm build` y `pnpm check` funcionan para todo el proyecto.',
      'C',
    ],
    [
      'Reglas de código',
      'TypeScript estricto y Biome para lint y formato; `pnpm check` pasa limpio y corre en cada pull request.',
      'C',
    ],
    [
      'Guía para los agentes',
      '`CLAUDE.md` y `AGENTS.md` explican el proyecto, cómo probar y qué no tocar; una skill `ola` reparte una ola en paralelo, junta la rama `ola-N` y entrega vista previa, capturas y el pull request.',
      'M',
    ],
    [
      'Capturas y video automáticos',
      '`pnpm capturas` abre el juego en Chromium sin ventana, recorre las escenas clave y guarda imágenes y un video corto; el pull request de cada ola los muestra.',
      'M',
    ],
    [
      'Plantillas y protección de main',
      'Plantilla de pull request (qué cambió, cómo se probó, capturas) y de issue; `main` solo acepta cambios por pull request con la revisión automática en verde.',
      'C',
    ],
    [
      'Entornos y secretos',
      'Desarrollo, vista previa y producción separados en Convex, Clerk y Cloudflare; las llaves viven en los secretos de GitHub y Cloudflare, nunca en el código.',
      'C',
      'tus cuentas',
    ],
  ],
);
export const TICKETS = [PREP, ...RESTO];
// dependencias que se leen mejor por título
const porTitulo = Object.fromEntries(TICKETS.flatMap((f) => f[2]).map((t) => [t[1], t[0]]));
const dep = (t, ...de) => {
  const x = TICKETS.flatMap((f) => f[2]).find((y) => y[1] === t);
  x[4] = [x[4], ...de.map((d) => porTitulo[d])].filter(Boolean).join(', ');
};
dep('Cuentas con Clerk', 'Crear el proyecto de Convex y subir el esquema');
dep('Jugar sin cuenta y crearla después', 'Cuentas con Clerk');
dep('Perfil y personaje en la nube', 'Cuentas con Clerk');
dep('Catálogo en Convex', 'Crear el proyecto de Convex y subir el esquema');
dep('Reglas compartidas', 'Perfil y personaje en la nube');
dep('Tienda en el servidor', 'Reglas compartidas');
dep('Partidas validadas', 'Reglas compartidas');
dep('Etapas, visitas y recuerdos en el servidor', 'Partidas validadas');
dep('Misiones del día y logros', 'Partidas validadas');
dep('Tablas de clasificación reales', 'Partidas validadas');
dep('Pase firmado de sala', 'Cuentas con Clerk');
dep('Ver a otros moverse', 'Pase firmado de sala');
dep('Salas de mapa y de departamento', 'Ver a otros moverse');
dep('Emotes entre jugadores', 'Ver a otros moverse');
dep('Chat moderado', 'Ver a otros moverse');
dep('Conectados reales y bots de relleno', 'Salas de mapa y de departamento');
dep('Amigos e invitación con código', 'Pase firmado de sala');
dep('Sala de partida', 'Partidas validadas', 'Pase firmado de sala');
dep('Dúo y mundo abierto en el kit de motores', 'Sala de partida', 'Kit de motores');
dep('Viaje compartido', 'Salas de mapa y de departamento', 'Rutas reales entre departamentos');
dep('Panel de contenido', 'Catálogo en Convex');
dep('Exploración turística', 'Etapas, visitas y recuerdos en el servidor');
for (const d of deps) dep(`Departamento: ${NOMBRE[d]}`, 'Kit de motores', 'Revisión cultural');
dep('Eventos por fecha', 'Panel de contenido');
dep('Rendimiento en celular', 'Cargar por departamento');
export const PRIMER_DEPTO = deps.length ? porTitulo[`Departamento: ${NOMBRE[deps[0]]}`] : '';
export const ULTIMO_DEPTO = deps.length ? porTitulo[`Departamento: ${NOMBRE[deps.at(-1)]}`] : '';
export { NOMBRE as NOMBRE_DEPTO, ORDEN as ORDEN_DEPTOS };
