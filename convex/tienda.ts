// La pulpería en el servidor (MC-13). El saldo, lo comprado y lo puesto viven aquí; los precios salen de
// shop.json por medio de @mundo-catrucho/reglas y nunca del navegador.
import { decidirCompra, decidirEquipar, limpiarAvatar } from '@mundo-catrucho/reglas';
import {
  type DataModelFromSchemaDefinition,
  type GenericMutationCtx,
  type MutationBuilder,
  mutationGeneric,
  type QueryBuilder,
  queryGeneric,
} from 'convex/server';
import { type GenericId, v } from 'convex/values';
import { asegurarContadores, sesion, terminar } from './avance';
import { asegurarUsuario, compradosDe, quien, usuarioActual, vista } from './identidad';
import type schema from './schema';

type Modelo = DataModelFromSchemaDefinition<typeof schema>;
const mutation: MutationBuilder<Modelo, 'public'> = mutationGeneric;
const query: QueryBuilder<Modelo, 'public'> = queryGeneric;
const avatarParcial = v.record(v.string(), v.string());

/** Después de comprar o vestirse: «A la moda» y «Traje típico» los da el servidor (MC-16). */
async function logrosDeTienda(ctx: GenericMutationCtx<Modelo>, args: { invitado: string }) {
  const s = await sesion(ctx, { invitado: args.invitado });
  return (await terminar(s)).logros;
}
async function perfilDe(
  ctx: GenericMutationCtx<Modelo>,
  usuarioId: GenericId<'usuarios'>,
  perfilId: GenericId<'perfiles'>,
) {
  const perfil = await ctx.db.get(perfilId);
  if (!perfil) throw new Error('Sin perfil.');
  return vista(perfil, await compradosDe(ctx, usuarioId));
}

/**
 * Entra como invitado (lo crea la primera vez con el nombre y el avatar que traiga) y devuelve su perfil. Con
 * `nombre` lo actualiza (la clasificación lo muestra limpio); con `creado` (ya terminó su personaje) gana
 * «Primeros pasos». `logros` trae lo que pagó.
 */
export const entrar = mutation({
  args: {
    ...quien,
    nombre: v.optional(v.string()),
    avatar: v.optional(avatarParcial),
    creado: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const s = await sesion(ctx, args);
    if (args.creado) {
      const c = await asegurarContadores(ctx, s.usuarioId);
      if (!c.entro) await ctx.db.patch(c._id, { entro: true });
    }
    const { logros } = await terminar(s);
    const perfil = await ctx.db.get(s.perfilId);
    if (!perfil) throw new Error('Sin perfil.');
    return { ...vista(perfil, await compradosDe(ctx, s.usuarioId)), logros };
  },
});

/** Perfil de quien llama, o null si nunca entró. */
export const miPerfil = query({
  args: quien,
  handler: async (ctx, args) => {
    const actual = await usuarioActual(ctx, args);
    return actual ? vista(actual.perfil, await compradosDe(ctx, actual.usuario._id)) : null;
  },
});

/** Compra un artículo con el saldo del servidor. Con `equipar` también se lo pone en la misma transacción. */
export const comprar = mutation({
  args: { ...quien, itemId: v.string(), equipar: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const { usuario, perfil } = await asegurarUsuario(ctx, args),
      comprados = await compradosDe(ctx, usuario._id);
    const compra = decidirCompra({ saldo: perfil.monedas, comprados, itemId: args.itemId });
    if (!compra.ok) return { ok: false as const, motivo: compra.motivo, perfil: vista(perfil, comprados) };
    await ctx.db.insert('inventario', { usuarioId: usuario._id, itemId: args.itemId });
    comprados.push(args.itemId);
    let avatar = perfil.avatar;
    const puesto = args.equipar ? decidirEquipar({ comprados, itemId: args.itemId }) : null;
    if (puesto?.ok) avatar = { ...avatar, ...puesto.cambios };
    await ctx.db.patch(perfil._id, { monedas: compra.saldo, avatar });
    const logros = await logrosDeTienda(ctx, args);
    return { ok: true as const, perfil: await perfilDe(ctx, usuario._id, perfil._id), logros };
  },
});

/** Se pone algo que ya tiene. Rechaza lo que no existe, los emotes y lo que no compró. */
export const equipar = mutation({
  args: { ...quien, itemId: v.string() },
  handler: async (ctx, args) => {
    const { usuario, perfil } = await asegurarUsuario(ctx, args),
      comprados = await compradosDe(ctx, usuario._id);
    const r = decidirEquipar({ comprados, itemId: args.itemId });
    if (!r.ok) return { ok: false as const, motivo: r.motivo, perfil: vista(perfil, comprados) };
    const avatar = { ...perfil.avatar, ...r.cambios };
    await ctx.db.patch(perfil._id, { avatar });
    const logros = await logrosDeTienda(ctx, args);
    return { ok: true as const, perfil: await perfilDe(ctx, usuario._id, perfil._id), logros };
  },
});

/** Cambios sueltos del creador de personaje: colores, cuerpo y piezas que ya tiene. Lo demás se ignora. */
export const vestir = mutation({
  args: { ...quien, avatar: avatarParcial },
  handler: async (ctx, args) => {
    const { usuario, perfil } = await asegurarUsuario(ctx, args),
      comprados = await compradosDe(ctx, usuario._id);
    const avatar = { ...perfil.avatar, ...limpiarAvatar(args.avatar, comprados) };
    await ctx.db.patch(perfil._id, { avatar });
    const logros = await logrosDeTienda(ctx, args);
    return { ok: true as const, perfil: await perfilDe(ctx, usuario._id, perfil._id), logros };
  },
});
