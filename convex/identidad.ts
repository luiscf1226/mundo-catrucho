// Quién llama. Todos empiezan como invitados: el juego guarda un secreto aleatorio de 32 bytes y lo manda en cada
// llamada; aquí solo se guarda su SHA-256. Una cuenta puede tener más llaves en `vinculos` (MC-07, MC-09): el
// invitado de otro dispositivo que usó un código, o la cuenta de Clerk. Tienda, partidas y avance siguen llamando
// a `usuarioActual` / `asegurarUsuario` y no saben de dónde vino la llave.
import { AVATAR_INICIAL, limpiarAvatar, MONEDAS_INICIALES } from '@mundo-catrucho/reglas';
import type { DataModelFromSchemaDefinition, GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { type GenericId, v } from 'convex/values';
import type schema from './schema';

declare const crypto: { subtle: { digest(algoritmo: string, datos: Uint8Array): Promise<ArrayBuffer> } };

type Modelo = DataModelFromSchemaDefinition<typeof schema>;
type Lectura = GenericQueryCtx<Modelo>;
type Escritura = GenericMutationCtx<Modelo>;

/** Argumento que llevan todas las funciones del jugador: el secreto de invitado en hexadecimal. */
export const quien = { invitado: v.string() };
const SECRETO = /^[0-9a-f]{64}$/;

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
/** Identificador estable del jugador. Nunca se guarda el secreto, solo su hash. */
export async function tokenDe({ invitado }: { invitado: string }) {
  if (!SECRETO.test(invitado)) throw new Error('Identidad de invitado inválida.');
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = Number.parseInt(invitado.slice(i * 2, i * 2 + 2), 16);
  return `invitado:${hex(await crypto.subtle.digest('SHA-256', bytes))}`;
}

/** La llave de Clerk de quien llama (MC-07), o null. Sin `CLERK_JWT_ISSUER_DOMAIN` en Convex siempre es null. */
export async function tokenCuenta(ctx: Lectura): Promise<string | null> {
  const identidad = await ctx.auth.getUserIdentity();
  return identidad?.tokenIdentifier ?? null;
}
/** Dueño de una llave: la propia de la cuenta o una vinculada (otro dispositivo o Clerk). */
export async function usuarioPorToken(ctx: Lectura, token: string) {
  const propio = await ctx.db
    .query('usuarios')
    .withIndex('por_token', (q) => q.eq('tokenIdentifier', token))
    .unique();
  if (propio) return propio;
  const vinculo = await ctx.db
    .query('vinculos')
    .withIndex('por_token', (q) => q.eq('token', token))
    .first();
  return vinculo ? await ctx.db.get(vinculo.usuarioId) : null;
}
/** Quién llama: la cuenta de Clerk si ya está vinculada; si no, el invitado de este dispositivo. */
export async function usuarioDe(ctx: Lectura, args: { invitado: string }) {
  const cuenta = await tokenCuenta(ctx);
  if (cuenta) {
    const u = await usuarioPorToken(ctx, cuenta);
    if (u) return u;
  }
  return usuarioPorToken(ctx, await tokenDe(args));
}

const nombreLimpio = (n: string | undefined) => (n ?? '').replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 16) || 'Catracho';

/** Usuario y perfil de quien llama, o null si todavía no ha entrado nunca. */
export async function usuarioActual(ctx: Lectura, args: { invitado: string }) {
  const usuario = await usuarioDe(ctx, args);
  if (!usuario) return null;
  const perfil = await ctx.db
    .query('perfiles')
    .withIndex('por_usuario', (q) => q.eq('usuarioId', usuario._id))
    .unique();
  return perfil ? { usuario, perfil } : null;
}

/** Como `usuarioActual`, pero crea al invitado (con su perfil inicial) la primera vez. */
export async function asegurarUsuario(
  ctx: Escritura,
  args: { invitado: string; nombre?: string; avatar?: Record<string, unknown> },
) {
  const actual = await usuarioActual(ctx, args);
  if (actual) {
    // el nombre se cambia al terminar el personaje; la clasificación lo muestra limpio
    const nombre = args.nombre === undefined ? null : nombreLimpio(args.nombre);
    if (nombre && nombre !== actual.usuario.nombre) {
      await ctx.db.patch(actual.usuario._id, { nombre });
      return { ...actual, usuario: { ...actual.usuario, nombre } };
    }
    return actual;
  }
  const existente = await usuarioDe(ctx, args);
  const usuarioId =
    existente?._id ??
    (await ctx.db.insert('usuarios', {
      nombre: nombreLimpio(args.nombre),
      esInvitado: true,
      tokenIdentifier: await tokenDe(args),
    }));
  const perfilId = await ctx.db.insert('perfiles', {
    usuarioId,
    avatar: { ...AVATAR_INICIAL, ...limpiarAvatar(args.avatar ?? {}, []) },
    monedas: MONEDAS_INICIALES,
    xp: 0,
    nivel: 1,
    modo: 'solo',
  });
  const usuario = existente ?? (await ctx.db.get(usuarioId)),
    perfil = await ctx.db.get(perfilId);
  if (!usuario || !perfil) throw new Error('No se pudo crear el perfil.');
  return { usuario, perfil };
}

/** Lo que compró el jugador (sin lo gratis ni las piezas de atuendos: eso lo deriva `poseidos`). */
export async function compradosDe(ctx: Lectura, usuarioId: GenericId<'usuarios'>) {
  const filas = await ctx.db
    .query('inventario')
    .withIndex('por_usuario', (q) => q.eq('usuarioId', usuarioId))
    .collect();
  return filas.map((f) => f.itemId);
}

/** Lo que el juego necesita saber del perfil después de cada llamada. */
export const vista = (
  perfil: { monedas: number; xp: number; nivel: number; avatar: Record<string, unknown> },
  comprados: string[],
) => ({ monedas: perfil.monedas, xp: perfil.xp, nivel: perfil.nivel, avatar: perfil.avatar, comprados });
