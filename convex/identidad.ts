// Quién llama. Hasta que existan las cuentas con Clerk (MC-07) todos son invitados: el juego guarda un secreto
// aleatorio de 32 bytes y lo manda en cada llamada; aquí solo se guarda su SHA-256. Con Clerk solo cambia
// `tokenDe` (se leerá `ctx.auth.getUserIdentity()`): tienda y partidas siguen llamando a `usuarioActual`.
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

const nombreLimpio = (n: string | undefined) => (n ?? '').replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 16) || 'Catracho';

/** Usuario y perfil de quien llama, o null si todavía no ha entrado nunca. */
export async function usuarioActual(ctx: Lectura, args: { invitado: string }) {
  const token = await tokenDe(args);
  const usuario = await ctx.db
    .query('usuarios')
    .withIndex('por_token', (q) => q.eq('tokenIdentifier', token))
    .unique();
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
  if (actual) return actual;
  const token = await tokenDe(args);
  const existente = await ctx.db
    .query('usuarios')
    .withIndex('por_token', (q) => q.eq('tokenIdentifier', token))
    .unique();
  const usuarioId =
    existente?._id ??
    (await ctx.db.insert('usuarios', { nombre: nombreLimpio(args.nombre), esInvitado: true, tokenIdentifier: token }));
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
