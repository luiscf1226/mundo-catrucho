// Tablas de clasificación (MC-17): la mejor marca de cada jugador por juego y por departamento, con su nombre
// limpio. Las marcas solo salen de partidas validadas por `cerrarPartida`.
import { limpiarNombre } from '@mundo-catrucho/reglas';
import {
  type DataModelFromSchemaDefinition,
  type GenericQueryCtx,
  type QueryBuilder,
  queryGeneric,
} from 'convex/server';
import { type GenericId, v } from 'convex/values';
import { tokenDe } from './identidad';
import type schema from './schema';

type Modelo = DataModelFromSchemaDefinition<typeof schema>;
const query: QueryBuilder<Modelo, 'public'> = queryGeneric;

/** Filas que se muestran. */
export const PUESTOS = 10;
/** Marcas que se revisan por departamento para sacar la mejor de cada jugador. */
const REVISAR_DEPTO = 400;

async function yoDe(ctx: GenericQueryCtx<Modelo>, invitado: string | undefined) {
  if (!invitado || !/^[0-9a-f]{64}$/.test(invitado)) return null;
  const token = await tokenDe({ invitado });
  const u = await ctx.db
    .query('usuarios')
    .withIndex('por_token', (q) => q.eq('tokenIdentifier', token))
    .unique();
  return u?._id ?? null;
}
type Marca = { usuarioId: GenericId<'usuarios'>; juegoId: string; puntos: number; etapa: number };
async function filas(ctx: GenericQueryCtx<Modelo>, marcas: Marca[], yo: GenericId<'usuarios'> | null) {
  const out = [];
  for (const m of marcas) {
    const u = await ctx.db.get(m.usuarioId);
    out.push({
      nombre: limpiarNombre(u?.nombre),
      juegoId: m.juegoId,
      puntos: m.puntos,
      etapa: m.etapa,
      tu: m.usuarioId === yo,
    });
  }
  return out;
}

/** Los mejores de un juego ('depto.juego', o el motor de un minijuego suelto). `tuya` es tu marca si no entraste. */
export const porJuego = query({
  args: { juegoId: v.string(), invitado: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const yo = await yoDe(ctx, args.invitado);
    const top = await ctx.db
      .query('marcas')
      .withIndex('por_juego', (q) => q.eq('juegoId', args.juegoId))
      .order('desc')
      .take(PUESTOS);
    const lista = await filas(ctx, top, yo);
    let tuya = null;
    if (yo && !lista.some((f) => f.tu)) {
      const m = await ctx.db
        .query('marcas')
        .withIndex('por_usuario_juego', (q) => q.eq('usuarioId', yo).eq('juegoId', args.juegoId))
        .unique();
      if (m) tuya = (await filas(ctx, [m], yo))[0];
    }
    return { filas: lista, tuya };
  },
});

/** Los mejores de un departamento: la mejor marca de cada jugador entre todos los juegos de ese departamento. */
export const porDepto = query({
  args: { deptId: v.string(), invitado: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const yo = await yoDe(ctx, args.invitado);
    const vistas = new Set<string>(),
      mejores: Marca[] = [];
    const marcas = await ctx.db
      .query('marcas')
      .withIndex('por_dept', (q) => q.eq('deptId', args.deptId))
      .order('desc')
      .take(REVISAR_DEPTO);
    for (const m of marcas) {
      if (vistas.has(m.usuarioId)) continue;
      vistas.add(m.usuarioId);
      mejores.push(m);
      if (mejores.length >= PUESTOS) break;
    }
    const lista = await filas(ctx, mejores, yo);
    let tuya = null;
    if (yo && !lista.some((f) => f.tu)) {
      const m = marcas.find((x) => x.usuarioId === yo);
      if (m) tuya = (await filas(ctx, [m], yo))[0];
    }
    return { filas: lista, tuya };
  },
});
