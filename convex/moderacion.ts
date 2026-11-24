// Reportes y cola de moderación (MC-22). Reportar es público (con tope por día); ver la cola y resolverla solo con
// permisos de administrador: `npx convex run moderacion:cola '{}'` (ver convex/README.md).
//
// Un mensaje de sala se cita tal como lo mandó la sala, con su firma: si el texto, el autor o la sala no coinciden
// con la firma, el reporte se rechaza. De un directo basta su id: el texto sale de la base.
import {
  CHAT,
  fechaHonduras,
  mensajeAutentico,
  motivoValido,
  partirSalaCerrada,
  salaValida,
} from '@mundo-catrucho/reglas';
import {
  type DataModelFromSchemaDefinition,
  internalMutationGeneric,
  internalQueryGeneric,
  type MutationBuilder,
  mutationGeneric,
  type QueryBuilder,
} from 'convex/server';
import { type GenericId, v } from 'convex/values';
import { secretoSalas, usuarioDePublico } from './amigos';
import { asegurarUsuario, quien, usuarioDe } from './identidad';
import type schema from './schema';

type Modelo = DataModelFromSchemaDefinition<typeof schema>;
const mutation: MutationBuilder<Modelo, 'public'> = mutationGeneric;
const internalQuery: QueryBuilder<Modelo, 'internal'> = internalQueryGeneric;
const internalMutation: MutationBuilder<Modelo, 'internal'> = internalMutationGeneric;

/** Medianoche de Honduras (UTC−6, sin horario de verano) del día de `ahora`, en milisegundos. */
const inicioDia = (ahora: number) => Date.parse(`${fechaHonduras(ahora)}T06:00:00Z`);

/**
 * Reporta un mensaje del chat de sala (`mensaje`, tal como llegó, con `firma`) o un directo (`directoId`).
 * Motivos: `motivo`, `firma`, `no-existe`, `propio`, `tope`, `ya`, `sin-salas`.
 */
export const reportar = mutation({
  args: {
    ...quien,
    motivo: v.string(),
    mensaje: v.optional(
      v.object({
        id: v.string(),
        de: v.string(),
        sala: v.string(),
        ts: v.number(),
        texto: v.string(),
        firma: v.string(),
      }),
    ),
    directoId: v.optional(v.id('directos')),
  },
  handler: async (ctx, args) => {
    if (!motivoValido(args.motivo)) return { ok: false as const, motivo: 'motivo' };
    const { usuario } = await asegurarUsuario(ctx, args);
    const yo = usuario._id;
    const ahora = Date.now();
    const hoy = await ctx.db
      .query('reportes')
      .withIndex('por_de', (q) => q.eq('de', yo).gte('_creationTime', inicioDia(ahora)))
      .collect();
    if (hoy.length >= CHAT.reportesDia) return { ok: false as const, motivo: 'tope' };

    let a: GenericId<'usuarios'> | null = null;
    let fila: { sala?: string; mensajeId?: string; directo?: GenericId<'directos'>; texto: string };
    if (args.mensaje) {
      const secreto = secretoSalas();
      if (!secreto) return { ok: false as const, motivo: 'sin-salas' };
      const { firma, ...m } = args.mensaje;
      if (
        (!salaValida(m.sala) && !partirSalaCerrada(m.sala)) ||
        !/^[a-z0-9]{1,32}$/.test(m.id) ||
        !/^[\w-]{1,24}$/.test(m.de) ||
        !Number.isSafeInteger(m.ts) ||
        m.ts < 0 ||
        m.texto.length > CHAT.largoMax
      )
        return { ok: false as const, motivo: 'mensaje' };
      if (!(await mensajeAutentico(m, firma, secreto))) return { ok: false as const, motivo: 'firma' };
      a = await usuarioDePublico(ctx, m.de);
      fila = { sala: m.sala, mensajeId: m.id, texto: m.texto };
      if (hoy.some((r) => r.mensajeId === m.id && r.sala === m.sala)) return { ok: false as const, motivo: 'ya' };
    } else if (args.directoId) {
      const d = await ctx.db.get(args.directoId);
      const amistad = d && (await ctx.db.get(d.amistad));
      // solo quien está en la conversación, y solo lo que mandó el otro
      if (!d || !amistad || (amistad.a !== yo && amistad.b !== yo)) return { ok: false as const, motivo: 'no-existe' };
      a = d.de;
      fila = { directo: d._id, texto: d.texto };
      if (hoy.some((r) => r.directo === d._id)) return { ok: false as const, motivo: 'ya' };
    } else return { ok: false as const, motivo: 'no-existe' };
    if (!a) return { ok: false as const, motivo: 'no-existe' };
    if (a === yo) return { ok: false as const, motivo: 'propio' };
    const id = await ctx.db.insert('reportes', { de: yo, a, motivo: args.motivo, estado: 'nuevo', ...fila });
    return { ok: true as const, id, quedan: CHAT.reportesDia - hoy.length - 1 };
  },
});

/**
 * Cola de moderación: los reportes sin revisar (o todos con `todos: true`), del más nuevo al más viejo, con los
 * nombres y cuántos reportes acumula cada reportado. Solo administración (`npx convex run`).
 */
export const cola = internalQuery({
  args: { todos: v.optional(v.boolean()), limite: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limite = Math.max(1, Math.min(200, args.limite ?? 50));
    const filas = args.todos
      ? await ctx.db.query('reportes').order('desc').take(limite)
      : await ctx.db
          .query('reportes')
          .withIndex('por_estado', (q) => q.eq('estado', 'nuevo'))
          .order('desc')
          .take(limite);
    const nombre = async (id: GenericId<'usuarios'>) => (await ctx.db.get(id))?.nombre ?? '(borrado)';
    const cuenta = new Map<string, number>();
    for (const r of filas) cuenta.set(r.a, (cuenta.get(r.a) ?? 0) + 1);
    return Promise.all(
      filas.map(async (r) => ({
        id: r._id,
        cuando: new Date(r._creationTime).toISOString(),
        estado: r.estado ?? 'nuevo',
        motivo: r.motivo,
        texto: r.texto ?? null,
        donde: r.sala ?? (r.directo ? 'directo' : null),
        mensajeId: r.mensajeId ?? null,
        reporta: await nombre(r.de),
        reportado: await nombre(r.a),
        reportadoId: r.a,
        reportesEnCola: cuenta.get(r.a) ?? 1,
      })),
    );
  },
});

/** Marca un reporte como revisado (sale de la cola). */
export const resolver = internalMutation({
  args: { reporteId: v.id('reportes') },
  handler: async (ctx, args) => {
    if (!(await ctx.db.get(args.reporteId))) return { ok: false as const };
    await ctx.db.patch(args.reporteId, { estado: 'visto' });
    return { ok: true as const };
  },
});

/**
 * Borra lo social de un invitado: amistades (con sus directos), bloqueos en los dos sentidos, códigos, id público y
 * reportes hechos o recibidos. Lo usan las pruebas junto a `progreso:olvidarInvitado`.
 */
export const olvidarSocial = internalMutation({
  args: quien,
  handler: async (ctx, args) => {
    const usuario = await usuarioDe(ctx, args);
    if (!usuario) return 0;
    const id = usuario._id;
    let n = 0;
    const amistades = [
      ...(await ctx.db
        .query('amistades')
        .withIndex('por_a', (q) => q.eq('a', id))
        .collect()),
      ...(await ctx.db
        .query('amistades')
        .withIndex('por_b', (q) => q.eq('b', id))
        .collect()),
    ];
    for (const f of amistades) {
      for (const d of await ctx.db
        .query('directos')
        .withIndex('por_amistad', (q) => q.eq('amistad', f._id))
        .collect()) {
        await ctx.db.delete(d._id);
        n++;
      }
      await ctx.db.delete(f._id);
      n++;
    }
    const filas = [
      ...(await ctx.db
        .query('bloqueos')
        .withIndex('por_de', (q) => q.eq('de', id))
        .collect()),
      ...(await ctx.db
        .query('bloqueos')
        .withIndex('por_a', (q) => q.eq('a', id))
        .collect()),
      ...(await ctx.db
        .query('invitaciones')
        .withIndex('por_de', (q) => q.eq('de', id))
        .collect()),
      ...(await ctx.db
        .query('publicos')
        .withIndex('por_usuario', (q) => q.eq('usuarioId', id))
        .collect()),
      ...(await ctx.db
        .query('reportes')
        .withIndex('por_de', (q) => q.eq('de', id))
        .collect()),
      ...(await ctx.db.query('reportes').collect()).filter((r) => r.a === id),
    ];
    for (const f of filas) {
      await ctx.db.delete(f._id);
      n++;
    }
    return n;
  },
});
