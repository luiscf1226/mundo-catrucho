// Partidas (MC-14). `abrirPartida` guarda motor, etapa y la hora del servidor; `cerrarPartida` mide la duración
// con ese reloj, valida el resultado con @mundo-catrucho/reglas y paga una sola vez.
import {
  avanzarJuego,
  decidirApertura,
  decidirCierre,
  deptoDeJuego,
  etapaAbierta,
  eventosDePartida,
  type JuegoDeCatalogo,
  type Tema,
  turnoDeApertura,
  validarResultado,
} from '@mundo-catrucho/reglas';
import {
  type DataModelFromSchemaDefinition,
  type GenericQueryCtx,
  type MutationBuilder,
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
import { avanzar, sesion, terminar, visitar } from './avance';
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
    // una sola abierta por jugador: las anteriores quedan abandonadas sin pagar
    const ahora = Date.now(),
      abiertas = await ctx.db
        .query('partidas')
        .withIndex('por_dueno_estado', (q) => q.eq('dueno', usuario._id).eq('estado', 'abierta'))
        .collect();
    const turno = turnoDeApertura({ abiertas: abiertas.map((p) => ({ id: p._id, inicio: p.inicio ?? 0 })), ahora });
    if (!turno.ok) return turno;
    for (const p of abiertas)
      await ctx.db.patch(p._id, { estado: 'abandonada', cierre: ahora, motivos: ['se abrió otra partida'] });
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
