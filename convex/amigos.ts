// Amigos, bloqueos e invitación con código (MC-22, MC-24). Todo con la identidad de invitado (`quien`).
//
// En el juego cada quien se conoce por su id público de sala (`idPublico`, el mismo del pase): no revela la
// cuenta. La tabla `publicos` lo traduce a la cuenta y se llena al pedir un pase o un código.
// Un bloqueo corta todo en los dos sentidos: chat (la sala lo sabe por el pase), directos, amistad y códigos.
import {
  CHAT,
  CODIGO,
  codigoDe,
  idPublico,
  normalizarCodigo,
  puedeProbarCodigo,
  SECRETO_MIN,
  salaValida,
  sumarFalloCodigo,
} from '@mundo-catrucho/reglas';
import {
  type DataModelFromSchemaDefinition,
  type GenericMutationCtx,
  type GenericQueryCtx,
  type MutationBuilder,
  mutationGeneric,
  type QueryBuilder,
  queryGeneric,
} from 'convex/server';
import { type GenericId, v } from 'convex/values';
import { asegurarContadores } from './avance';
import { asegurarUsuario, quien, usuarioActual } from './identidad';
import type schema from './schema';

declare const process: { env: { SALA_SECRETO?: string } };
declare const crypto: { getRandomValues(b: Uint8Array): Uint8Array };

type Modelo = DataModelFromSchemaDefinition<typeof schema>;
type Lectura = GenericQueryCtx<Modelo>;
type Escritura = GenericMutationCtx<Modelo>;
type IdUsuario = GenericId<'usuarios'>;
const mutation: MutationBuilder<Modelo, 'public'> = mutationGeneric;
const query: QueryBuilder<Modelo, 'public'> = queryGeneric;

/** El secreto de las salas, o null si no está puesto (sin él no hay ids públicos). */
export const secretoSalas = () => {
  const s = process.env.SALA_SECRETO;
  return s && s.length >= SECRETO_MIN ? s : null;
};
const ID_PUBLICO = /^[\w-]{1,24}$/;

// ------------------------------------------------------------------ ayudas (las usan chat, moderación y salas)
/** Guarda (una vez) qué cuenta tiene este id público. */
export async function registrarPublico(ctx: Escritura, usuarioId: IdUsuario, id: string) {
  const ya = await ctx.db
    .query('publicos')
    .withIndex('por_id', (q) => q.eq('id', id))
    .first();
  if (!ya) await ctx.db.insert('publicos', { id, usuarioId });
}
/** Cuenta de un id público, o null si nunca entró a una sala ni pidió un código. */
export async function usuarioDePublico(ctx: Lectura, id: unknown): Promise<IdUsuario | null> {
  if (typeof id !== 'string' || !ID_PUBLICO.test(id)) return null;
  const f = await ctx.db
    .query('publicos')
    .withIndex('por_id', (q) => q.eq('id', id))
    .first();
  return f?.usuarioId ?? null;
}
/** ¿Alguno de los dos bloqueó al otro? */
export async function hayBloqueo(ctx: Lectura, x: IdUsuario, y: IdUsuario) {
  for (const [de, a] of [
    [x, y],
    [y, x],
  ])
    if (
      await ctx.db
        .query('bloqueos')
        .withIndex('por_de', (q) => q.eq('de', de).eq('a', a))
        .first()
    )
      return true;
  return false;
}
/** La amistad (pedida o aceptada) entre dos cuentas, en cualquier sentido. */
export async function amistadEntre(ctx: Lectura, x: IdUsuario, y: IdUsuario) {
  for (const [a, b] of [
    [x, y],
    [y, x],
  ]) {
    const f = (
      await ctx.db
        .query('amistades')
        .withIndex('por_a', (q) => q.eq('a', a))
        .collect()
    ).find((r) => r.b === b);
    if (f) return f;
  }
  return null;
}
/** Ids públicos que bloqueó (los más nuevos), para el pase de sala. */
export async function bloqueadosParaPase(ctx: Lectura, usuarioId: IdUsuario, secreto: string) {
  const filas = await ctx.db
    .query('bloqueos')
    .withIndex('por_de', (q) => q.eq('de', usuarioId))
    .order('desc')
    .take(CHAT.bloqueosEnPase);
  return Promise.all(filas.map((f) => idPublico(f.a, secreto)));
}
const nombreDe = async (ctx: Lectura, id: IdUsuario) => (await ctx.db.get(id))?.nombre ?? 'Catracho';
const codigoActivo = async (ctx: Lectura, usuarioId: IdUsuario, ahora: number) =>
  (
    await ctx.db
      .query('invitaciones')
      .withIndex('por_de', (q) => q.eq('de', usuarioId))
      .collect()
  ).find((i) => i.vence > ahora) ?? null;

// ------------------------------------------------------------------ lista
/**
 * Amigos, pedidos, bloqueados y el código activo de quien llama. `id` es su propio id público. Sin cuenta o sin
 * salas responde listas vacías.
 */
export const lista = query({
  args: quien,
  handler: async (ctx, args) => {
    const vacio = { ok: true as const, id: null as string | null, amigos: [], bloqueados: [], codigo: null };
    const secreto = secretoSalas();
    const yo = await usuarioActual(ctx, args);
    if (!yo || !secreto) return vacio;
    const mio = yo.usuario._id;
    const filas = [
      ...(await ctx.db
        .query('amistades')
        .withIndex('por_a', (q) => q.eq('a', mio))
        .collect()),
      ...(await ctx.db
        .query('amistades')
        .withIndex('por_b', (q) => q.eq('b', mio))
        .collect()),
    ];
    const amigos = await Promise.all(
      filas.map(async (f) => {
        const otro = f.a === mio ? f.b : f.a;
        return {
          amistadId: f._id,
          nombre: await nombreDe(ctx, otro),
          id: await idPublico(otro, secreto),
          estado:
            f.estado === 'aceptada' ? ('amigos' as const) : f.a === mio ? ('enviada' as const) : ('recibida' as const),
        };
      }),
    );
    const bloqueos = await ctx.db
      .query('bloqueos')
      .withIndex('por_de', (q) => q.eq('de', mio))
      .order('desc')
      .collect();
    const bloqueados = await Promise.all(
      bloqueos.map(async (b) => ({ nombre: await nombreDe(ctx, b.a), id: await idPublico(b.a, secreto) })),
    );
    const inv = await codigoActivo(ctx, mio, Date.now());
    return {
      ok: true as const,
      id: await idPublico(mio, secreto),
      amigos: amigos.sort((x, y) => x.nombre.localeCompare(y.nombre)),
      bloqueados,
      codigo: inv ? { codigo: inv.codigo, vence: inv.vence, sala: inv.sala ?? null } : null,
    };
  },
});

// ------------------------------------------------------------------ amistad
/**
 * Pide amistad a alguien que viste en una sala (por su id público). Si esa persona ya te la había pedido, quedan
 * amigos. Motivos: `sin-salas`, `no-existe`, `propio`, `bloqueado`, `ya`.
 */
export const pedir = mutation({
  args: { ...quien, id: v.string() },
  handler: async (ctx, args) => {
    if (!secretoSalas()) return { ok: false as const, motivo: 'sin-salas' };
    const { usuario } = await asegurarUsuario(ctx, args);
    const otro = await usuarioDePublico(ctx, args.id);
    if (!otro) return { ok: false as const, motivo: 'no-existe' };
    if (otro === usuario._id) return { ok: false as const, motivo: 'propio' };
    if (await hayBloqueo(ctx, usuario._id, otro)) return { ok: false as const, motivo: 'bloqueado' };
    const ya = await amistadEntre(ctx, usuario._id, otro);
    if (ya?.estado === 'aceptada' || ya?.a === usuario._id) return { ok: false as const, motivo: 'ya' };
    if (ya) {
      await ctx.db.patch(ya._id, { estado: 'aceptada' });
      return { ok: true as const, estado: 'amigos' as const, amistadId: ya._id };
    }
    const amistadId = await ctx.db.insert('amistades', { a: usuario._id, b: otro, estado: 'pedida' });
    return { ok: true as const, estado: 'enviada' as const, amistadId };
  },
});

/** Acepta o rechaza un pedido que te hicieron. Rechazar lo borra. */
export const responder = mutation({
  args: { ...quien, amistadId: v.id('amistades'), aceptar: v.boolean() },
  handler: async (ctx, args) => {
    const { usuario } = await asegurarUsuario(ctx, args);
    const f = await ctx.db.get(args.amistadId);
    if (!f || f.b !== usuario._id || f.estado !== 'pedida') return { ok: false as const, motivo: 'no' };
    if (args.aceptar) await ctx.db.patch(f._id, { estado: 'aceptada' });
    else await ctx.db.delete(f._id);
    return { ok: true as const };
  },
});

async function borrarAmistad(ctx: Escritura, amistadId: GenericId<'amistades'>) {
  for (const d of await ctx.db
    .query('directos')
    .withIndex('por_amistad', (q) => q.eq('amistad', amistadId))
    .collect())
    await ctx.db.delete(d._id);
  await ctx.db.delete(amistadId);
}

/** Quita una amistad (o retira un pedido); los directos de esa conversación se borran. */
export const quitar = mutation({
  args: { ...quien, amistadId: v.id('amistades') },
  handler: async (ctx, args) => {
    const { usuario } = await asegurarUsuario(ctx, args);
    const f = await ctx.db.get(args.amistadId);
    if (!f || (f.a !== usuario._id && f.b !== usuario._id)) return { ok: false as const, motivo: 'no' };
    await borrarAmistad(ctx, f._id);
    return { ok: true as const };
  },
});

// ------------------------------------------------------------------ bloqueos
/** Bloquea a alguien por su id público: quita la amistad, sus pedidos y tu código ya no le sirve. */
export const bloquear = mutation({
  args: { ...quien, id: v.string() },
  handler: async (ctx, args) => {
    const { usuario } = await asegurarUsuario(ctx, args);
    const otro = await usuarioDePublico(ctx, args.id);
    if (!otro) return { ok: false as const, motivo: 'no-existe' };
    if (otro === usuario._id) return { ok: false as const, motivo: 'propio' };
    const ya = await ctx.db
      .query('bloqueos')
      .withIndex('por_de', (q) => q.eq('de', usuario._id).eq('a', otro))
      .first();
    if (!ya) {
      const filas = await ctx.db
        .query('bloqueos')
        .withIndex('por_de', (q) => q.eq('de', usuario._id))
        .take(CHAT.bloqueosEnPase);
      if (filas.length >= CHAT.bloqueosEnPase) return { ok: false as const, motivo: 'tope-bloqueos' };
      await ctx.db.insert('bloqueos', { de: usuario._id, a: otro });
    }
    const amistad = await amistadEntre(ctx, usuario._id, otro);
    if (amistad) await borrarAmistad(ctx, amistad._id);
    return { ok: true as const };
  },
});

export const desbloquear = mutation({
  args: { ...quien, id: v.string() },
  handler: async (ctx, args) => {
    const { usuario } = await asegurarUsuario(ctx, args);
    const otro = await usuarioDePublico(ctx, args.id);
    if (!otro) return { ok: false as const, motivo: 'no-existe' };
    const filas = await ctx.db
      .query('bloqueos')
      .withIndex('por_de', (q) => q.eq('de', usuario._id).eq('a', otro))
      .collect();
    for (const f of filas) await ctx.db.delete(f._id);
    return { ok: true as const };
  },
});

// ------------------------------------------------------------------ código de invitación (MC-24)
/**
 * Código de 5 letras para que alguien entre a tu misma sala en vivo. Si ya tenés uno vigente se reutiliza y se
 * actualiza la sala (el juego lo vuelve a llamar al cambiar de sala). Vence en `CODIGO.vigenciaMs`.
 */
export const crearCodigo = mutation({
  args: { ...quien, sala: v.optional(v.string()), nombre: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const secreto = secretoSalas();
    if (!secreto) return { ok: false as const, motivo: 'sin-salas' };
    if (args.sala !== undefined && !salaValida(args.sala)) return { ok: false as const, motivo: 'sala' };
    const { usuario } = await asegurarUsuario(ctx, { invitado: args.invitado, nombre: args.nombre });
    await registrarPublico(ctx, usuario._id, await idPublico(usuario._id, secreto));
    const ahora = Date.now();
    const vence = ahora + CODIGO.vigenciaMs;
    const activo = await codigoActivo(ctx, usuario._id, ahora);
    if (activo) {
      await ctx.db.patch(activo._id, { sala: args.sala, vence });
      return { ok: true as const, codigo: activo.codigo, vence };
    }
    // los vencidos de esta persona se van
    for (const i of await ctx.db
      .query('invitaciones')
      .withIndex('por_de', (q) => q.eq('de', usuario._id))
      .collect())
      await ctx.db.delete(i._id);
    for (let intento = 0; intento < 8; intento++) {
      const codigo = codigoDe(crypto.getRandomValues(new Uint8Array(CODIGO.largo)));
      const choca = (
        await ctx.db
          .query('invitaciones')
          .withIndex('por_codigo', (q) => q.eq('codigo', codigo))
          .collect()
      ).some((i) => i.vence > ahora);
      if (choca) continue;
      await ctx.db.insert('invitaciones', { codigo, de: usuario._id, vence, sala: args.sala });
      return { ok: true as const, codigo, vence };
    }
    return { ok: false as const, motivo: 'ocupado' };
  },
});

/**
 * Usa el código de un amigo: devuelve su sala exacta (para entrar aunque el tramo no sea el que toca), su nombre y
 * su id público (para pedirle amistad). Motivos: `codigo`, `vencido`, `propio`, `bloqueado`, `sin-sala`.
 */
export const usarCodigo = mutation({
  args: { ...quien, codigo: v.string(), nombre: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const secreto = secretoSalas();
    if (!secreto) return { ok: false as const, motivo: 'sin-salas' };
    const codigo = normalizarCodigo(args.codigo);
    if (!codigo) return { ok: false as const, motivo: 'codigo' };
    const { usuario } = await asegurarUsuario(ctx, { invitado: args.invitado, nombre: args.nombre });
    const ahora = Date.now(),
      c = await asegurarContadores(ctx, usuario._id);
    if (!puedeProbarCodigo(c.fallosCodigo, ahora)) return { ok: false as const, motivo: 'espera' };
    const fallo = async (motivo: 'codigo' | 'vencido') => {
      await ctx.db.patch(c._id, { fallosCodigo: sumarFalloCodigo(c.fallosCodigo, ahora) });
      return { ok: false as const, motivo };
    };
    const filas = await ctx.db
      .query('invitaciones')
      .withIndex('por_codigo', (q) => q.eq('codigo', codigo))
      .collect();
    if (!filas.length) return await fallo('codigo');
    const inv = filas.find((i) => i.vence > ahora);
    if (!inv) return await fallo('vencido');
    if (inv.de === usuario._id) return { ok: false as const, motivo: 'propio' };
    // un bloqueado no te puede invitar (ni vos usar su código): el mismo aviso que un código que no existe
    if (await hayBloqueo(ctx, usuario._id, inv.de)) return { ok: false as const, motivo: 'codigo' };
    if (!inv.sala) return { ok: false as const, motivo: 'sin-sala' };
    await registrarPublico(ctx, usuario._id, await idPublico(usuario._id, secreto));
    return {
      ok: true as const,
      sala: inv.sala,
      nombre: await nombreDe(ctx, inv.de),
      id: await idPublico(inv.de, secreto),
    };
  },
});
