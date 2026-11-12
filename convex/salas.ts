// Pase de sala en vivo (MC-18): identifica al jugador y le firma un pase corto para una sala exacta.
// La sala (workers/salas) lo verifica con el mismo `SALA_SECRETO`; sin pase válido no deja entrar.
// Hasta Clerk (MC-07) el jugador es el invitado de `identidad.ts`; con Clerk solo cambia `tokenDe`.
import {
  firmarActa,
  firmarPase,
  idPublico,
  PARTIDA,
  partirSala,
  partirSalaCerrada,
  SECRETO_MIN,
  salaValida,
  VIAJE,
} from '@mundo-catrucho/reglas';
import {
  type DataModelFromSchemaDefinition,
  type FunctionReference,
  internalMutationGeneric,
  type MutationBuilder,
  makeFunctionReference,
  mutationGeneric,
  type QueryBuilder,
  queryGeneric,
} from 'convex/server';
import { type GenericId, v } from 'convex/values';
import { bloqueadosParaPase, hayBloqueo, registrarPublico } from './amigos';
import { asegurarUsuario, quien } from './identidad';
import type schema from './schema';

declare const process: { env: { SALA_SECRETO?: string } };

type Modelo = DataModelFromSchemaDefinition<typeof schema>;
const mutation: MutationBuilder<Modelo, 'public'> = mutationGeneric;

/**
 * `{ ok: true, pase, id }` para entrar a `sala` (`mapa:N` o `dept:<id>:N`), o `{ ok: false, motivo }`.
 * Es mutación porque crea al invitado si todavía no existe, igual que `tienda:entrar`.
 */
export const pase = mutation({
  args: { ...quien, sala: v.string(), nombre: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const secreto = process.env.SALA_SECRETO;
    if (!secreto || secreto.length < SECRETO_MIN) return { ok: false as const, motivo: 'sin-salas' };
    if (!salaValida(args.sala)) return { ok: false as const, motivo: 'sala' };
    const { usuario, perfil } = await asegurarUsuario(ctx, args);
    const id = await idPublico(usuario._id, secreto);
    // MC-22: el id público queda ligado a la cuenta (amistad y reportes) y el pase lleva a quiénes bloqueó
    await registrarPublico(ctx, usuario._id, id);
    const bloqueados = await bloqueadosParaPase(ctx, usuario._id, secreto);
    const firmado = await firmarPase(
      { id, nombre: args.nombre ?? usuario.nombre, sala: args.sala, avatar: perfil.avatar, bloqueados },
      secreto,
    );
    return { ok: true as const, pase: firmado, id };
  },
});

// ------------------------------------------------------------------ salas cerradas (MC-25, MC-31)
const query: QueryBuilder<Modelo, 'public'> = queryGeneric;
const internalMutation: MutationBuilder<Modelo, 'internal'> = internalMutationGeneric;
const secretoSalas = () => {
  const s = process.env.SALA_SECRETO;
  return s && s.length >= SECRETO_MIN ? s : null;
};

/**
 * Pase y acta para la sala de una partida entre amigos (`juego:<partidaId>`). Solo para sus jugadores y mientras
 * esté abierta. El acta le dice a la sala el motor, la etapa, la semilla y el cupo; vale `PARTIDA.actaMs`.
 */
export const paseJuego = mutation({
  args: { ...quien, partidaId: v.string(), nombre: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const secreto = secretoSalas();
    if (!secreto) return { ok: false as const, motivo: 'sin-salas' };
    const { usuario, perfil } = await asegurarUsuario(ctx, args);
    const pid = ctx.db.normalizeId('partidas', args.partidaId);
    const p = pid ? await ctx.db.get(pid) : null;
    if (!p?.sala || !p.motor || !p.jugadores.includes(usuario._id)) return { ok: false as const, motivo: 'ajena' };
    if (p.estado !== 'abierta' && p.estado !== 'cerrada') return { ok: false as const, motivo: 'cerrada' };
    if (p.abandonaron?.includes(usuario._id)) return { ok: false as const, motivo: 'abandonada' };
    const id = await idPublico(usuario._id, secreto);
    const pase = await firmarPase(
      { id, nombre: args.nombre ?? usuario.nombre, sala: p.sala, avatar: perfil.avatar },
      secreto,
    );
    const acta = await firmarActa(
      {
        partidaId: p._id,
        motor: p.motor,
        etapa: p.etapa,
        etapas: p.etapas ?? 1,
        semilla: p.semilla,
        cupo: PARTIDA.cupo,
        vence: Date.now() + PARTIDA.actaMs,
      },
      secreto,
    );
    return { ok: true as const, pase, acta, id, sala: p.sala };
  },
});

/** Pase para un viaje compartido (`viaje:<id>`): el primero que entra maneja; los demás van de pasajeros. */
export const paseViaje = mutation({
  args: { ...quien, sala: v.string(), nombre: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const secreto = secretoSalas();
    if (!secreto) return { ok: false as const, motivo: 'sin-salas' };
    if (partirSalaCerrada(args.sala)?.tipo !== 'viaje') return { ok: false as const, motivo: 'sala' };
    const { usuario, perfil } = await asegurarUsuario(ctx, args);
    let viaje = await ctx.db
      .query('viajesCompartidos')
      .withIndex('por_sala', (q) => q.eq('sala', args.sala))
      .unique();
    if (viaje && Date.now() >= (viaje.vence ?? 0)) {
      await ctx.db.delete(viaje._id);
      viaje = null;
    }
    for (const otro of viaje?.jugadores ?? [])
      if (await hayBloqueo(ctx, usuario._id, otro)) return { ok: false as const, motivo: 'bloqueado' };
    if (!viaje) {
      const vence = Date.now() + VIAJE.vigenciaMs;
      const viajeId = await ctx.db.insert('viajesCompartidos', { sala: args.sala, jugadores: [usuario._id], vence });
      await ctx.scheduler.runAfter(VIAJE.vigenciaMs, borrarViajeRef, { viajeId });
    } else if (!viaje.jugadores.includes(usuario._id)) {
      if (viaje.jugadores.length >= VIAJE.cupo) return { ok: false as const, motivo: 'llena' };
      await ctx.db.patch(viaje._id, { jugadores: [...viaje.jugadores, usuario._id] });
    }
    const id = await idPublico(usuario._id, secreto);
    const pase = await firmarPase(
      { id, nombre: args.nombre ?? usuario.nombre, sala: args.sala, avatar: perfil.avatar },
      secreto,
    );
    return { ok: true as const, pase, id };
  },
});

// ------------------------------------------------------------------ ocupación (MC-23)
/** Un aviso de ocupación sirve tanto: después la sala se da por vacía. */
export const OCUPACION_VIGENTE_MS = 75_000;

/** La escribe `POST /salas/ocupacion` (http.ts) con el aviso firmado de la sala. Uno más viejo no pisa al nuevo. */
export const reportar = internalMutation({
  args: { sala: v.string(), ocupacion: v.number(), momento: v.number() },
  handler: async (ctx, args) => {
    const p = partirSala(args.sala);
    if (
      !p ||
      !Number.isFinite(args.momento) ||
      args.momento > Date.now() + 5000 ||
      Date.now() - args.momento > OCUPACION_VIGENTE_MS
    )
      return;
    const tipo = p.zona === 'mapa' ? ('mapa' as const) : ('dept' as const),
      deptId = tipo === 'dept' ? p.zona.slice(5) : undefined;
    const filas = await ctx.db
      .query('salas')
      .withIndex('por_dept', (q) => q.eq('deptId', deptId))
      .collect();
    const fila = filas.find((f) => f.tipo === tipo && f.tramo === p.tramo);
    const datos = {
      ocupacion: Math.max(0, Math.min(1000, Math.round(args.ocupacion))),
      visto: args.momento,
      momento: args.momento,
    };
    if (!fila) await ctx.db.insert('salas', { tipo, deptId, tramo: p.tramo, ...datos });
    else if ((fila.momento ?? 0) < args.momento) await ctx.db.patch(fila._id, datos);
  },
});

/** Conectados de verdad (sin bots) en el mapa y en cada departamento, según los avisos de los últimos 75 s. */
export const conectados = query({
  args: {},
  handler: async (ctx) => {
    const desde = Date.now() - OCUPACION_VIGENTE_MS;
    const filas = await ctx.db
      .query('salas')
      .withIndex('por_visto', (q) => q.gt('visto', desde))
      .collect();
    const depts: Record<string, number> = {};
    let mapa = 0;
    for (const f of filas) {
      if (f.tipo === 'mapa') mapa += f.ocupacion;
      else if (f.tipo === 'dept' && f.deptId) depts[f.deptId] = (depts[f.deptId] ?? 0) + f.ocupacion;
    }
    const total = mapa + Object.values(depts).reduce((a, b) => a + b, 0);
    return { mapa, depts, total };
  },
});

const borrarViajeRef = makeFunctionReference<'mutation', { viajeId: GenericId<'viajesCompartidos'> }>(
  'salas:borrarViaje',
) as unknown as FunctionReference<'mutation', 'internal', { viajeId: GenericId<'viajesCompartidos'> }>;
export const borrarViaje = internalMutation({
  args: { viajeId: v.id('viajesCompartidos') },
  handler: async (ctx, { viajeId }) => {
    const viaje = await ctx.db.get(viajeId);
    if (viaje && Date.now() >= (viaje.vence ?? 0)) await ctx.db.delete(viajeId);
  },
});
