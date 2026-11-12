// Partidas (MC-14). `abrirPartida` guarda motor, etapa y la hora del servidor; `cerrarPartida` mide la duración
// con ese reloj, valida el resultado con @mundo-catrucho/reglas y paga una sola vez.
import {
  APERTURA_MIN_MS,
  avanzarJuego,
  decidirApertura,
  decidirCierre,
  decidirRecibo,
  deptoDeJuego,
  etapaAbierta,
  eventosDePartida,
  idPublico,
  type JuegoDeCatalogo,
  motorJuntos,
  PARTIDA,
  SECRETO_MIN,
  type Tema,
  validarResultado,
  verificarRecibo,
} from '@mundo-catrucho/reglas';
import {
  type DataModelFromSchemaDefinition,
  type FunctionReference,
  type GenericMutationCtx,
  type GenericQueryCtx,
  internalMutationGeneric,
  type MutationBuilder,
  makeFunctionReference,
  mutationGeneric,
  type QueryBuilder,
  queryGeneric,
} from 'convex/server';
import { type GenericId, v } from 'convex/values';
import catCentro from '../apps/web/shared/data/catalogo/centro.json' with { type: 'json' };
import catNorte from '../apps/web/shared/data/catalogo/norte.json' with { type: 'json' };
import catOccidente from '../apps/web/shared/data/catalogo/occidente.json' with { type: 'json' };
import catSurOriente from '../apps/web/shared/data/catalogo/sur-oriente.json' with { type: 'json' };
import minigames from '../apps/web/shared/data/minigames.json' with { type: 'json' };
import { hayBloqueo } from './amigos';
import { avanzar, pagar, type Sesion, sesion, terminar, visitar } from './avance';
import { asegurarUsuario, quien } from './identidad';
import type schema from './schema';

type Modelo = DataModelFromSchemaDefinition<typeof schema>;
const query: QueryBuilder<Modelo, 'public'> = queryGeneric;
const mutation: MutationBuilder<Modelo, 'public'> = mutationGeneric;
const modo = v.union(v.literal('solo'), v.literal('duo'), v.literal('abierto'));

/** ¿Es posible este resultado? No lee ni escribe tablas: responde con `validarResultado` tal cual. */
export const validar = query({
  args: {
    motor: v.string(),
    puntos: v.number(),
    estrellas: v.number(),
    duracion: v.number(),
    etapa: v.number(),
    etapas: v.optional(v.number()),
    gano: v.optional(v.boolean()),
  },
  handler: async (_ctx, resultado) => validarResultado(resultado),
});

const MOTORES_SUELTOS = minigames.map((m) => m.id);
type Tupla = [string, string, string, ...unknown[]];
const EMPAQUETADO = { ...catCentro, ...catNorte, ...catOccidente, ...catSurOriente } as unknown as Record<
  string,
  { juegos?: Tupla[] }
>;

type JuegoFila = { id: string; motor: string; etapas: number; tema?: Tema };
const deEmpaquetado = (deptId: string, t: Tupla): JuegoFila => ({
  id: `${deptId}.${t[0]}`,
  motor: t[2],
  etapas: typeof t[8] === 'number' ? t[8] : 3,
  tema: (t[7] ?? {}) as Tema,
});
const aJuego = (j: JuegoFila): JuegoDeCatalogo => ({ motor: j.motor, etapas: j.etapas, tema: j.tema ?? {} });
const juegosDeFila = (datos: unknown) =>
  ((datos as { catalogo?: { juegos?: JuegoFila[] } } | undefined)?.catalogo?.juegos ?? []) as JuegoFila[];

/** Motor, etapas y tema de un juego 'depto.juego': del último catálogo publicado o, si no hay, del empaquetado. */
async function juegoDelCatalogo(ctx: GenericQueryCtx<Modelo>, juegoId: string): Promise<JuegoDeCatalogo | null> {
  const deptId = juegoId.split('.')[0];
  const ultima = await ctx.db.query('catalogo').withIndex('por_version').order('desc').first();
  if (ultima) {
    const fila = await ctx.db
      .query('catalogo')
      .withIndex('por_version', (q) => q.eq('version', ultima.version).eq('deptId', deptId))
      .first();
    const j = juegosDeFila(fila?.datos).find((x) => x.id === juegoId);
    return j ? aJuego(j) : null;
  }
  const t = EMPAQUETADO[deptId]?.juegos?.find((x) => `${deptId}.${x[0]}` === juegoId);
  return t ? aJuego(deEmpaquetado(deptId, t)) : null;
}

/** Todos los juegos del catálogo vigente (para validar el avance que sube del navegador). */
export async function juegosDelCatalogo(ctx: GenericQueryCtx<Modelo>): Promise<Map<string, JuegoDeCatalogo>> {
  const out = new Map<string, JuegoDeCatalogo>();
  const ultima = await ctx.db.query('catalogo').withIndex('por_version').order('desc').first();
  if (ultima) {
    const filas = await ctx.db
      .query('catalogo')
      .withIndex('por_version', (q) => q.eq('version', ultima.version))
      .collect();
    for (const f of filas) for (const j of juegosDeFila(f.datos)) out.set(j.id, aJuego(j));
    return out;
  }
  for (const [deptId, d] of Object.entries(EMPAQUETADO))
    for (const t of d.juegos ?? []) {
      const j = deEmpaquetado(deptId, t);
      out.set(j.id, aJuego(j));
    }
  return out;
}

/** Abre una partida antes de jugar. Devuelve su id; sin él no se paga nada al terminar. */
export const abrirPartida = mutation({
  args: { ...quien, motor: v.string(), etapa: v.number(), juegoId: v.optional(v.string()), modo: v.optional(modo) },
  handler: async (ctx, args) => {
    const { usuario } = await asegurarUsuario(ctx, args);
    const juego = args.juegoId ? await juegoDelCatalogo(ctx, args.juegoId) : null;
    if (args.juegoId && !juego) return { ok: false as const, motivo: 'juego desconocido' };
    const a = decidirApertura({ motor: args.motor, etapa: args.etapa, juego, motoresSueltos: MOTORES_SUELTOS });
    if (!a.ok) return a;
    // solo se juega hasta la etapa desbloqueada (MC-15)
    if (args.juegoId && a.etapa > etapaAbierta(await progresoDe(ctx, usuario._id, args.juegoId), a.etapas))
      return { ok: false as const, motivo: 'etapa bloqueada' };
    const ahora = Date.now();
    const turno = await reservarApertura(ctx, usuario._id, ahora);
    if (!turno.ok) return turno;
    const id = await ctx.db.insert('partidas', {
      juegoId: args.juegoId ?? a.motor,
      motor: a.motor,
      etapa: a.etapa,
      etapas: a.etapas,
      modo: args.modo ?? 'solo',
      semilla: Math.floor(Math.random() * 2 ** 31),
      jugadores: [usuario._id],
      dueno: usuario._id,
      estado: 'abierta',
      inicio: ahora,
    });
    return { ok: true as const, id };
  },
});

async function progresoDe(ctx: GenericQueryCtx<Modelo>, usuarioId: GenericId<'usuarios'>, juegoId: string) {
  return ctx.db
    .query('progresoJuegos')
    .withIndex('por_usuario_juego', (q) => q.eq('usuarioId', usuarioId).eq('juegoId', juegoId))
    .unique();
}

/**
 * Cierra la partida con el resultado del navegador. La duración la mide el servidor. Un resultado imposible
 * la cierra como `rechazada` sin pagar; una partida ajena o ya cerrada no se toca. Si paga, también guarda el
 * avance del juego, la visita del departamento, la marca para la clasificación, las misiones y los logros.
 */
export const cerrarPartida = mutation({
  args: { ...quien, partidaId: v.id('partidas'), puntos: v.number(), estrellas: v.number(), gano: v.boolean() },
  handler: async (ctx, args) => {
    const s = await sesion(ctx, args),
      partida = await ctx.db.get(args.partidaId);
    if (!partida?.motor || partida.inicio === undefined) return { ok: false as const, motivo: 'ajena' as const };
    // una partida entre amigos (MC-25) solo la cierra el recibo de su sala (`cerrarJuntos`)
    if (partida.sala) return { ok: false as const, motivo: 'ajena' as const };
    const ahora = s.ahora,
      juego = partida.juegoId !== partida.motor ? await juegoDelCatalogo(ctx, partida.juegoId) : null;
    const d = decidirCierre({
      partida: {
        estado: partida.estado,
        jugadores: partida.jugadores,
        motor: partida.motor,
        etapa: partida.etapa,
        etapas: partida.etapas ?? 1,
        inicio: partida.inicio,
        tema: juego?.tema,
      },
      usuarioId: s.usuarioId,
      ahora,
      cierre: { puntos: args.puntos, estrellas: args.estrellas, gano: args.gano },
      avance: { nivel: s.saldo.nivel, xp: s.saldo.xp },
    });
    if (d.tipo === 'error') return { ok: false as const, motivo: d.motivo };
    const resultado = [{ usuarioId: s.usuarioId, puntos: args.puntos, estrellas: args.estrellas, gano: args.gano }];
    if (d.tipo !== 'pagada') {
      await ctx.db.patch(partida._id, { estado: d.tipo, cierre: ahora, motivos: d.motivos, resultado });
      return { ok: false as const, motivo: d.tipo, motivos: d.motivos };
    }
    s.saldo = { monedas: s.saldo.monedas + d.monedas + d.bono, xp: d.avance.xp, nivel: d.avance.nivel };
    s.subidas = d.avance.subidas;
    await ctx.db.patch(partida._id, {
      estado: 'cerrada',
      cierre: ahora,
      resultado: [{ ...resultado[0], estrellas: d.estrellas }],
      pago: { monedas: d.monedas + d.bono, xp: d.xp },
    });
    const r = { motor: partida.motor, puntos: args.puntos, estrellas: d.estrellas, gano: args.gano };
    // avance del juego (también de los sueltos, con su motor como id)
    const prev = await progresoDe(ctx, s.usuarioId, partida.juegoId),
      g = avanzarJuego(prev, { ...r, etapa: partida.etapa, etapas: partida.etapas ?? 1 }),
      fila = { etapa: g.etapa, estrellas: g.estrellas, mejor: g.mejor, veces: g.veces };
    if (prev) await ctx.db.patch(prev._id, fila);
    else await ctx.db.insert('progresoJuegos', { usuarioId: s.usuarioId, juegoId: partida.juegoId, ...fila });
    // la visita del departamento del juego y la marca para la clasificación
    const deptId = deptoDeJuego(partida.juegoId);
    if (deptId !== 'lobby') await visitar(s, deptId);
    const marca = await ctx.db
      .query('marcas')
      .withIndex('por_usuario_juego', (q) => q.eq('usuarioId', s.usuarioId).eq('juegoId', partida.juegoId))
      .unique();
    if (!marca)
      await ctx.db.insert('marcas', {
        juegoId: partida.juegoId,
        deptId,
        usuarioId: s.usuarioId,
        puntos: args.puntos,
        etapa: partida.etapa,
      });
    else if (args.puntos > marca.puntos) await ctx.db.patch(marca._id, { puntos: args.puntos, etapa: partida.etapa });
    await avanzar(s, eventosDePartida(r));
    const fin = await terminar(s, { partida: r });
    return {
      ok: true as const,
      monedas: d.monedas,
      bono: d.bono,
      xp: d.xp,
      ...fin,
      progreso: { juegoId: partida.juegoId, ...fila, avance: g.avance },
    };
  },
});

// ------------------------------------------------------------------ partida entre amigos (MC-25)
declare const process: { env: { SALA_SECRETO?: string } };
const datosJuntos = (p: { _id: string; juegoId: string; motor?: string; etapa: number; semilla: number }) => ({
  ok: true as const,
  partidaId: p._id,
  juegoId: p.juegoId,
  motor: p.motor ?? '',
  etapa: p.etapa,
  semilla: p.semilla,
});

/**
 * Abre una partida para jugar con alguien de la sala: un juego del catálogo con motor del kit, modo `duo`, la
 * semilla de los dos y la sala `juego:<id>`. Comparte el turno de apertura con la partida sola de cada uno. Solo la cierra
 * `cerrarJuntos` con el recibo firmado de la sala.
 */
export const abrirJuntos = mutation({
  args: { ...quien, juegoId: v.string() },
  handler: async (ctx, args) => {
    const { usuario } = await asegurarUsuario(ctx, args);
    const juego = await juegoDelCatalogo(ctx, args.juegoId);
    if (!juego) return { ok: false as const, motivo: 'juego desconocido' };
    if (!motorJuntos(juego.motor)) return { ok: false as const, motivo: 'ese juego no se juega entre dos' };
    const ahora = Date.now();
    const turno = await reservarApertura(ctx, usuario._id, ahora);
    if (!turno.ok) return turno;
    const id = await ctx.db.insert('partidas', {
      juegoId: args.juegoId,
      motor: juego.motor,
      // la primera etapa: la tienen abierta los dos
      etapa: 0,
      etapas: juego.etapas,
      modo: 'duo',
      semilla: Math.floor(Math.random() * 2 ** 31),
      jugadores: [usuario._id],
      estado: 'abierta',
      inicio: Date.now(),
    });
    await ctx.db.patch(id, { sala: `juego:${id}` });
    await ctx.scheduler.runAfter(PARTIDA.esperaMaxMs, vencerEsperaRef, { partidaId: id });
    const p = await ctx.db.get(id);
    return p ? datosJuntos(p) : { ok: false as const, motivo: 'no se abrió' };
  },
});

/** Entra a una partida entre amigos (desde la invitación de la sala o un código de amigo). */
export const unirseJuntos = mutation({
  args: { ...quien, partidaId: v.string() },
  handler: async (ctx, args) => {
    const { usuario } = await asegurarUsuario(ctx, args);
    const id = ctx.db.normalizeId('partidas', args.partidaId);
    const p = id ? await ctx.db.get(id) : null;
    if (!p?.sala || p.estado !== 'abierta') return { ok: false as const, motivo: 'ya no está' };
    if (p.jugadores.includes(usuario._id)) return datosJuntos(p);
    if (p.jugadores.length >= PARTIDA.cupo) return { ok: false as const, motivo: 'llena' };
    if (Date.now() - (p.inicio ?? 0) >= PARTIDA.esperaMaxMs) {
      await ctx.db.patch(p._id, { estado: 'vencida', cierre: Date.now() });
      return { ok: false as const, motivo: 'ya no está' };
    }
    for (const otro of p.jugadores)
      if (await hayBloqueo(ctx, usuario._id, otro)) return { ok: false as const, motivo: 'bloqueado' };
    const turno = await reservarApertura(ctx, usuario._id, Date.now(), p._id);
    if (!turno.ok) return turno;
    await ctx.db.patch(p._id, { jugadores: [...p.jugadores, usuario._id] });
    return datosJuntos(p);
  },
});

/** Sesión de otro jugador de la partida (el recibo les paga a todos en la misma llamada). */
async function sesionDe(s: Sesion, usuarioId: GenericId<'usuarios'>): Promise<Sesion | null> {
  const perfil = await s.ctx.db
    .query('perfiles')
    .withIndex('por_usuario', (q) => q.eq('usuarioId', usuarioId))
    .unique();
  if (!perfil) return null;
  return {
    ctx: s.ctx,
    usuarioId,
    perfilId: perfil._id,
    avatar: perfil.avatar,
    saldo: { monedas: perfil.monedas, xp: perfil.xp, nivel: perfil.nivel },
    subidas: 0,
    logros: [],
    misiones: null,
    ahora: s.ahora,
  };
}

/**
 * Cierra una partida entre amigos con el recibo firmado de su sala (`SALA_SECRETO`). El primero que lo manda le
 * paga a cada jugador una sola vez (`decidirRecibo` + `premioPartida`); los demás reciben lo que ya les tocó.
 * Un recibo alterado, de otra partida, vencido o repetido no paga.
 */
export const cerrarJuntos = mutation({
  args: { ...quien, partidaId: v.string(), recibo: v.string() },
  handler: async (ctx, args) => {
    const s = await sesion(ctx, args),
      id = ctx.db.normalizeId('partidas', args.partidaId),
      p = id ? await ctx.db.get(id) : null;
    if (!p?.sala || !p.motor || p.inicio === undefined || !p.jugadores.includes(s.usuarioId))
      return { ok: false as const, motivo: 'ajena' };
    const mio = () => p.pagos?.find((x) => x.usuarioId === s.usuarioId) ?? { monedas: 0, xp: 0 };
    if (p.estado === 'cerrada') return { ok: true as const, ya: true, ...mio(), ...(await terminar(s)) };
    const secreto = process.env.SALA_SECRETO;
    if (!secreto || secreto.length < SECRETO_MIN) return { ok: false as const, motivo: 'sin-salas' };
    const recibo = await verificarRecibo(args.recibo, secreto);
    if (!recibo) return { ok: false as const, motivo: 'recibo' };
    const jugadores = await Promise.all(
      p.jugadores.map(async (usuarioId) => ({ usuarioId, idPublico: await idPublico(usuarioId, secreto) })),
    );
    const d = decidirRecibo({
      partidaId: p._id,
      recibo,
      partida: { estado: p.estado, motor: p.motor, etapa: p.etapa, etapas: p.etapas ?? 1, inicio: p.inicio, jugadores },
      ahora: s.ahora,
    });
    if (d.tipo === 'error') return { ok: false as const, motivo: d.motivo };
    const pagos: { usuarioId: GenericId<'usuarios'>; monedas: number; xp: number }[] = [];
    for (const x of d.pagos) {
      const quienCobra = x.usuarioId === s.usuarioId ? s : await sesionDe(s, x.usuarioId);
      if (!quienCobra || !x.premio) {
        pagos.push({ usuarioId: x.usuarioId, monedas: 0, xp: 0 });
        continue;
      }
      pagar(quienCobra, x.premio);
      pagos.push({ usuarioId: x.usuarioId, monedas: x.premio.monedas, xp: x.premio.xp });
      const r = { motor: p.motor, puntos: x.puntos, estrellas: x.premio.estrellas, gano: x.gano };
      await avanzar(quienCobra, eventosDePartida(r));
      if (quienCobra !== s) await terminar(quienCobra, { partida: r });
    }
    await ctx.db.patch(p._id, {
      estado: 'cerrada',
      cierre: s.ahora,
      resultado: d.pagos.map((x) => ({
        usuarioId: x.usuarioId,
        puntos: x.puntos,
        estrellas: x.estrellas,
        gano: x.gano,
      })),
      pagos,
      motivos: d.pagos.flatMap((x) => x.motivos),
    });
    const yo = d.pagos.find((x) => x.usuarioId === s.usuarioId);
    const r = yo && { motor: p.motor, puntos: yo.puntos, estrellas: yo.premio?.estrellas ?? 0, gano: yo.gano };
    const mia = pagos.find((x) => x.usuarioId === s.usuarioId) ?? { monedas: 0, xp: 0 };
    return { ok: true as const, ya: false, ...mia, ...(await terminar(s, r && yo?.premio ? { partida: r } : {})) };
  },
});

const vencerEsperaRef = makeFunctionReference<'mutation', { partidaId: GenericId<'partidas'> }>(
  'partidas:vencerEspera',
) as unknown as FunctionReference<'mutation', 'internal', { partidaId: GenericId<'partidas'> }>;
const internalMutation: MutationBuilder<Modelo, 'internal'> = internalMutationGeneric;
export const vencerEspera = internalMutation({
  args: { partidaId: v.id('partidas') },
  handler: async (ctx, { partidaId }) => {
    const p = await ctx.db.get(partidaId);
    if (
      p?.estado === 'abierta' &&
      p.sala &&
      p.jugadores.length < PARTIDA.cupo &&
      Date.now() >= (p.inicio ?? 0) + PARTIDA.esperaMaxMs
    )
      await ctx.db.patch(p._id, { estado: 'vencida', cierre: Date.now() });
  },
});

async function reservarApertura(
  ctx: GenericMutationCtx<Modelo>,
  usuarioId: GenericId<'usuarios'>,
  ahora: number,
  conservar?: GenericId<'partidas'>,
) {
  const ultima = await ctx.db
    .query('aperturas')
    .withIndex('por_usuario', (q) => q.eq('usuarioId', usuarioId))
    .unique();
  if (ultima && ahora - ultima.momento < APERTURA_MIN_MS) return { ok: false as const, motivo: 'muy seguido' };
  if (ultima) await ctx.db.patch(ultima._id, { momento: ahora });
  else await ctx.db.insert('aperturas', { usuarioId, momento: ahora });
  const abiertas = await ctx.db
    .query('partidas')
    .withIndex('por_estado', (q) => q.eq('estado', 'abierta'))
    .collect();
  for (const p of abiertas)
    if (p._id !== conservar && p.jugadores.includes(usuarioId))
      await ctx.db.patch(p._id, { estado: 'vencida', cierre: ahora, motivos: ['se abrió otra partida'] });
  return { ok: true as const };
}
