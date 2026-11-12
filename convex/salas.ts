// Pase de sala en vivo (MC-18): identifica al jugador y le firma un pase corto para una sala exacta.
// La sala (workers/salas) lo verifica con el mismo `SALA_SECRETO`; sin pase válido no deja entrar.
// Hasta Clerk (MC-07) el jugador es el invitado de `identidad.ts`; con Clerk solo cambia `tokenDe`.
import { firmarPase, idPublico, SECRETO_MIN, salaValida } from '@mundo-catrucho/reglas';
import { type DataModelFromSchemaDefinition, type MutationBuilder, mutationGeneric } from 'convex/server';
import { v } from 'convex/values';
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
    const firmado = await firmarPase(
      { id, nombre: args.nombre ?? usuario.nombre, sala: args.sala, avatar: perfil.avatar },
      secreto,
    );
    return { ok: true as const, pase: firmado, id };
  },
});
