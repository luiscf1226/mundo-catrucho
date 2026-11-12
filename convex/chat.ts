// Mensajes directos entre amigos (MC-22): solo entre amistades aceptadas y sin bloqueo, con el mismo filtro que la
// sala (`filtrarChat`) y ritmo por minuto. El juego los lee con un sondeo de `chat:directos` mientras la
// conversación está abierta.
import { CHAT, filtrarChat } from '@mundo-catrucho/reglas';
import {
  type DataModelFromSchemaDefinition,
  type MutationBuilder,
  mutationGeneric,
  type QueryBuilder,
  queryGeneric,
} from 'convex/server';
import { v } from 'convex/values';
import { hayBloqueo } from './amigos';
import { asegurarUsuario, quien, usuarioActual } from './identidad';
import type schema from './schema';

type Modelo = DataModelFromSchemaDefinition<typeof schema>;
const mutation: MutationBuilder<Modelo, 'public'> = mutationGeneric;
const query: QueryBuilder<Modelo, 'public'> = queryGeneric;

/** Manda un directo. Motivos: `no-amigos`, `bloqueado`, `vacio`, `ritmo`. Responde el texto ya filtrado. */
export const enviarDirecto = mutation({
  args: { ...quien, amistadId: v.id('amistades'), texto: v.string() },
  handler: async (ctx, args) => {
    const { usuario } = await asegurarUsuario(ctx, args);
    const yo = usuario._id;
    const f = await ctx.db.get(args.amistadId);
    if (!f || f.estado !== 'aceptada' || (f.a !== yo && f.b !== yo)) return { ok: false as const, motivo: 'no-amigos' };
    if (await hayBloqueo(ctx, f.a, f.b)) return { ok: false as const, motivo: 'bloqueado' };
    const filtrado = filtrarChat(args.texto);
    if (!filtrado) return { ok: false as const, motivo: 'vacio' };
    const recientes = await ctx.db
      .query('directos')
      .withIndex('por_de', (q) => q.eq('de', yo).gt('_creationTime', Date.now() - 60_000))
      .take(CHAT.directosMinuto);
    if (recientes.length >= CHAT.directosMinuto) return { ok: false as const, motivo: 'ritmo' };
    const id = await ctx.db.insert('directos', {
      amistad: f._id,
      de: yo,
      texto: filtrado.texto,
      tapado: filtrado.tapado,
    });
    // cada conversación guarda solo los últimos
    const viejos = await ctx.db
      .query('directos')
      .withIndex('por_amistad', (q) => q.eq('amistad', f._id))
      .order('desc')
      .collect();
    for (const d of viejos.slice(CHAT.directosMax)) await ctx.db.delete(d._id);
    return { ok: true as const, id, texto: filtrado.texto, tapado: filtrado.tapado };
  },
});

/** Los últimos directos de una conversación, del más viejo al más nuevo. */
export const directos = query({
  args: { ...quien, amistadId: v.id('amistades') },
  handler: async (ctx, args) => {
    const actual = await usuarioActual(ctx, args);
    const f = await ctx.db.get(args.amistadId);
    if (!actual || !f || f.estado !== 'aceptada') return { ok: false as const, motivo: 'no-amigos' };
    const yo = actual.usuario._id;
    if (f.a !== yo && f.b !== yo) return { ok: false as const, motivo: 'no-amigos' };
    if (await hayBloqueo(ctx, f.a, f.b)) return { ok: false as const, motivo: 'bloqueado' };
    const filas = await ctx.db
      .query('directos')
      .withIndex('por_amistad', (q) => q.eq('amistad', f._id))
      .order('desc')
      .take(CHAT.directosMax);
    return {
      ok: true as const,
      mensajes: filas.reverse().map((d) => ({
        id: d._id,
        mio: d.de === yo,
        texto: d.texto,
        tapado: d.tapado,
        ts: d._creationTime,
      })),
    };
  },
});
