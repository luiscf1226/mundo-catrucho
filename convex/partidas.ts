// Partidas (MC-14). `abrirPartida` guarda motor, etapa y la hora del servidor; `cerrarPartida` mide la duración
// con ese reloj, valida el resultado con @mundo-catrucho/reglas y paga una sola vez.
import { decidirApertura, decidirCierre, type JuegoDeCatalogo, validarResultado } from '@mundo-catrucho/reglas';
import {
  type DataModelFromSchemaDefinition,
  type GenericQueryCtx,
  type MutationBuilder,
  mutationGeneric,
  type QueryBuilder,
  queryGeneric,
} from 'convex/server';
import { v } from 'convex/values';
import catCentro from '../apps/web/shared/data/catalogo/centro.json' with { type: 'json' };
import catNorte from '../apps/web/shared/data/catalogo/norte.json' with { type: 'json' };
import catOccidente from '../apps/web/shared/data/catalogo/occidente.json' with { type: 'json' };
import catSurOriente from '../apps/web/shared/data/catalogo/sur-oriente.json' with { type: 'json' };
import minigames from '../apps/web/shared/data/minigames.json' with { type: 'json' };
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

/** Motor y etapas de un juego 'depto.juego': del último catálogo publicado o, si no hay, del empaquetado. */
async function juegoDelCatalogo(ctx: GenericQueryCtx<Modelo>, juegoId: string): Promise<JuegoDeCatalogo | null> {
  const deptId = juegoId.split('.')[0];
  const ultima = await ctx.db.query('catalogo').withIndex('por_version').order('desc').first();
  if (ultima) {
    const fila = await ctx.db
      .query('catalogo')
      .withIndex('por_version', (q) => q.eq('version', ultima.version).eq('deptId', deptId))
      .first();
    const juegos = (fila?.datos?.catalogo?.juegos ?? []) as { id: string; motor: string; etapas: number }[];
    const j = juegos.find((x) => x.id === juegoId);
    return j ? { motor: j.motor, etapas: j.etapas } : null;
  }
  const t = EMPAQUETADO[deptId]?.juegos?.find((x) => `${deptId}.${x[0]}` === juegoId);
  return t ? { motor: t[2], etapas: typeof t[8] === 'number' ? t[8] : 3 } : null;
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
    const id = await ctx.db.insert('partidas', {
      juegoId: args.juegoId ?? a.motor,
      motor: a.motor,
      etapa: a.etapa,
      etapas: a.etapas,
      modo: args.modo ?? 'solo',
      semilla: Math.floor(Math.random() * 2 ** 31),
      jugadores: [usuario._id],
      estado: 'abierta',
      inicio: Date.now(),
    });
    return { ok: true as const, id };
  },
});

/**
 * Cierra la partida con el resultado del navegador. La duración la mide el servidor. Un resultado imposible
 * la cierra como `rechazada` sin pagar; una partida ajena o ya cerrada no se toca.
 */
export const cerrarPartida = mutation({
  args: { ...quien, partidaId: v.id('partidas'), puntos: v.number(), estrellas: v.number(), gano: v.boolean() },
  handler: async (ctx, args) => {
    const { usuario, perfil } = await asegurarUsuario(ctx, args),
      partida = await ctx.db.get(args.partidaId);
    if (!partida?.motor || partida.inicio === undefined) return { ok: false as const, motivo: 'ajena' as const };
    const ahora = Date.now();
    const d = decidirCierre({
      partida: {
        estado: partida.estado,
        jugadores: partida.jugadores,
        motor: partida.motor,
        etapa: partida.etapa,
        etapas: partida.etapas ?? 1,
        inicio: partida.inicio,
      },
      usuarioId: usuario._id,
      ahora,
      cierre: { puntos: args.puntos, estrellas: args.estrellas, gano: args.gano },
      avance: { nivel: perfil.nivel, xp: perfil.xp },
    });
    if (d.tipo === 'error') return { ok: false as const, motivo: d.motivo };
    const resultado = [{ usuarioId: usuario._id, puntos: args.puntos, estrellas: args.estrellas, gano: args.gano }];
    if (d.tipo !== 'pagada') {
      await ctx.db.patch(partida._id, { estado: d.tipo, cierre: ahora, motivos: d.motivos, resultado });
      return { ok: false as const, motivo: d.tipo, motivos: d.motivos };
    }
    const monedas = perfil.monedas + d.monedas + d.bono;
    await ctx.db.patch(partida._id, {
      estado: 'cerrada',
      cierre: ahora,
      resultado: [{ ...resultado[0], estrellas: d.estrellas }],
      pago: { monedas: d.monedas + d.bono, xp: d.xp },
    });
    await ctx.db.patch(perfil._id, { monedas, xp: d.avance.xp, nivel: d.avance.nivel });
    return {
      ok: true as const,
      monedas: d.monedas,
      bono: d.bono,
      xp: d.xp,
      subidas: d.avance.subidas,
      saldo: { monedas, xp: d.avance.xp, nivel: d.avance.nivel },
    };
  },
});
