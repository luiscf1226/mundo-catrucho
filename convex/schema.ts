// Modelo de datos de Mundo Catrucho en Convex. Ver docs/ARQUITECTURA.md.
// Regla: el juego nunca escribe estas tablas directo; todo pasa por mutaciones que validan.
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

const avatar = v.object({
  body: v.optional(v.union(v.literal('h'), v.literal('m'))),
  skin: v.string(),
  hair: v.string(),
  hairColor: v.string(),
  face: v.string(),
  shirt: v.string(),
  shirtColor: v.string(),
  pants: v.string(),
  pantsColor: v.string(),
  hat: v.string(),
  hatColor: v.string(),
  acc: v.string(),
  accColor: v.string(),
});
const modo = v.union(v.literal('solo'), v.literal('duo'), v.literal('abierto'));

export default defineSchema({
  usuarios: defineTable({ nombre: v.string(), esInvitado: v.boolean(), tokenIdentifier: v.optional(v.string()) }).index(
    'por_token',
    ['tokenIdentifier'],
  ),
  perfiles: defineTable({
    usuarioId: v.id('usuarios'),
    avatar,
    monedas: v.number(),
    xp: v.number(),
    nivel: v.number(),
    modo,
  }).index('por_usuario', ['usuarioId']),
  inventario: defineTable({ usuarioId: v.id('usuarios'), itemId: v.string() }).index('por_usuario', [
    'usuarioId',
    'itemId',
  ]),
  // avance por etapas de cada juego del catálogo (id 'depto.juego')
  progresoJuegos: defineTable({
    usuarioId: v.id('usuarios'),
    juegoId: v.string(),
    etapa: v.number(),
    estrellas: v.array(v.number()),
    mejor: v.number(),
    veces: v.number(),
  }).index('por_usuario_juego', ['usuarioId', 'juegoId']),
  visitas: defineTable({
    usuarioId: v.id('usuarios'),
    deptId: v.string(),
    recuerdo: v.boolean(),
    turismo: v.optional(v.array(v.object({ id: v.string(), completa: v.boolean() }))),
  }).index('por_usuario', ['usuarioId', 'deptId']),
  misionesDia: defineTable({
    usuarioId: v.id('usuarios'),
    fecha: v.string(),
    misiones: v.array(v.object({ id: v.string(), progreso: v.number(), cobrada: v.boolean() })),
  }).index('por_usuario_fecha', ['usuarioId', 'fecha']),
  logros: defineTable({ usuarioId: v.id('usuarios'), logroId: v.string() }).index('por_usuario', [
    'usuarioId',
    'logroId',
  ]),
  // una partida se abre antes de jugar; la cierra `partidas:cerrarPartida` (y más adelante el recibo firmado de la sala)
  partidas: defineTable({
    juegoId: v.string(),
    etapa: v.number(),
    modo,
    sala: v.optional(v.string()),
    semilla: v.number(),
    jugadores: v.array(v.id('usuarios')),
    abandonaron: v.optional(v.array(v.id('usuarios'))),
    estado: v.union(
      v.literal('abierta'),
      v.literal('cerrada'),
      v.literal('vencida'),
      v.literal('rechazada'),
      v.literal('abandonada'),
    ),
    resultado: v.optional(
      v.array(v.object({ usuarioId: v.id('usuarios'), puntos: v.number(), estrellas: v.number(), gano: v.boolean() })),
    ),
    // MC-14: lo que el servidor guardó al abrir y lo que decidió al cerrar
    motor: v.optional(v.string()),
    etapas: v.optional(v.number()),
    /** quien la abrió: tiene como mucho una abierta (las anteriores quedan «abandonada») */
    dueno: v.optional(v.id('usuarios')),
    /** milisegundos Unix del servidor */
    inicio: v.optional(v.number()),
    cierre: v.optional(v.number()),
    motivos: v.optional(v.array(v.string())),
    pago: v.optional(v.object({ monedas: v.number(), xp: v.number() })),
    // MC-25: partida entre amigos (`sala` = `juego:<id>`): lo que el recibo de la sala le pagó a cada uno
    pagos: v.optional(v.array(v.object({ usuarioId: v.id('usuarios'), monedas: v.number(), xp: v.number() }))),
  })
    .index('por_estado', ['estado'])
    .index('por_dueno_estado', ['dueno', 'estado']),
  aperturas: defineTable({
    usuarioId: v.id('usuarios'),
    momento: v.number(),
    partidaId: v.optional(v.id('partidas')),
  }).index('por_usuario', ['usuarioId']),
  viajesCompartidos: defineTable({
    sala: v.string(),
    jugadores: v.array(v.id('usuarios')),
    vence: v.optional(v.number()),
  }).index('por_sala', ['sala']),
  marcas: defineTable({
    juegoId: v.string(),
    deptId: v.string(),
    usuarioId: v.id('usuarios'),
    puntos: v.number(),
    etapa: v.number(),
  })
    .index('por_juego', ['juegoId', 'puntos'])
    .index('por_dept', ['deptId', 'puntos'])
    .index('por_usuario_juego', ['usuarioId', 'juegoId']),
  amistades: defineTable({
    a: v.id('usuarios'),
    b: v.id('usuarios'),
    estado: v.union(v.literal('pedida'), v.literal('aceptada')),
  })
    .index('por_a', ['a'])
    .index('por_b', ['b']),
  invitaciones: defineTable({
    codigo: v.string(),
    de: v.id('usuarios'),
    juegoId: v.optional(v.string()),
    vence: v.number(),
    /** MC-24: sala en vivo exacta de quien creó el código (`mapa:N` o `dept:<id>:N`) */
    sala: v.optional(v.string()),
  })
    .index('por_codigo', ['codigo'])
    .index('por_de', ['de']),
  // la escribe cada sala cada 30 s; de aquí salen los «conectados» del mapa
  salas: defineTable({
    tipo: v.union(v.literal('mapa'), v.literal('dept'), v.literal('juego'), v.literal('viaje')),
    deptId: v.optional(v.string()),
    tramo: v.number(),
    ocupacion: v.number(),
    visto: v.number(),
    /** MC-23: momento (de la sala) del último aviso; uno más viejo no pisa al nuevo */
    momento: v.optional(v.number()),
  })
    .index('por_dept', ['deptId'])
    .index('por_visto', ['visto']),
  // el contenido del juego (hoy vive en apps/web/shared/data); se sube con un script y se edita desde el panel
  catalogo: defineTable({ version: v.number(), deptId: v.string(), datos: v.any() }).index('por_version', [
    'version',
    'deptId',
  ]),
  eventos: defineTable({
    nombre: v.string(),
    desde: v.number(),
    hasta: v.number(),
    deptId: v.optional(v.string()),
    reglas: v.any(),
  }),
  reportes: defineTable({
    de: v.id('usuarios'),
    a: v.id('usuarios'),
    motivo: v.string(),
    // MC-22: qué se reportó. Del chat de sala: la sala y el mensaje (con la firma de la sala ya comprobada);
    // de un directo: su id. El texto se guarda como estaba al reportarlo.
    sala: v.optional(v.string()),
    mensajeId: v.optional(v.string()),
    directo: v.optional(v.id('directos')),
    texto: v.optional(v.string()),
    /** cola de moderación: 'nuevo' hasta que alguien lo revisa (`moderacion:resolver`) */
    estado: v.optional(v.union(v.literal('nuevo'), v.literal('visto'))),
  })
    .index('por_de', ['de'])
    .index('por_estado', ['estado']),
  // MC-22: bloqueos. Un bloqueado no ve tus mensajes ni vos los suyos, y no te puede invitar ni pedir amistad.
  bloqueos: defineTable({ de: v.id('usuarios'), a: v.id('usuarios') })
    .index('por_de', ['de', 'a'])
    .index('por_a', ['a']),
  // MC-22, MC-24: id público de la sala (`idPublico`) → cuenta; se llena al pedir un pase o un código
  publicos: defineTable({ id: v.string(), usuarioId: v.id('usuarios') })
    .index('por_id', ['id'])
    .index('por_usuario', ['usuarioId']),
  // MC-22: mensajes directos entre amistades aceptadas, ya filtrados
  directos: defineTable({
    amistad: v.id('amistades'),
    de: v.id('usuarios'),
    texto: v.string(),
    tapado: v.boolean(),
  })
    .index('por_amistad', ['amistad'])
    .index('por_de', ['de']),
  // MC-15, MC-16: lo que el servidor cuenta del jugador fuera de las partidas
  contadores: defineTable({
    usuarioId: v.id('usuarios'),
    /** terminó de crear su personaje (logro «Primeros pasos») */
    entro: v.boolean(),
    /** emotes contados (con pausa entre uno y otro) */
    emotes: v.number(),
    ultimoEmote: v.optional(v.number()),
    /** ritmo y tope del día de las monedas sueltas */
    monedas: v.optional(v.object({ fecha: v.string(), hoy: v.number(), fichas: v.number(), t: v.number() })),
    /** bonos de viaje pagados hoy (tope por día) */
    bonosViaje: v.optional(v.object({ fecha: v.string(), suma: v.number() })),
    /** ya subió (o no tenía) avance guardado en el navegador */
    migrado: v.boolean(),
    /** códigos de amigo fallidos en la ventana actual (contra adivinar códigos) */
    fallosCodigo: v.optional(v.object({ desde: v.number(), n: v.number() })),
  }).index('por_usuario', ['usuarioId']),
  // las misiones de cada día de Honduras; las reparte el cron de las 06:00 UTC
  misionesGlobales: defineTable({ fecha: v.string(), ids: v.array(v.string()) }).index('por_fecha', ['fecha']),
  // un viaje por carretera: se cobra el pasaje al salir y el bono al llegar, con la hora del servidor
  viajes: defineTable({
    usuarioId: v.id('usuarios'),
    veh: v.string(),
    de: v.string(),
    a: v.string(),
    precio: v.number(),
    inicio: v.number(),
    estado: v.union(v.literal('en-camino'), v.literal('llego'), v.literal('abandonado')),
    llegada: v.optional(v.number()),
    bono: v.optional(v.number()),
  }).index('por_usuario_estado', ['usuarioId', 'estado']),
});
