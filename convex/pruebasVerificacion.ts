// Preparación administrativa de la regresión: adelanta el reloj de filas creadas por la prueba.
// Es interna; ningún jugador puede llamar estas mutaciones.
import { DURACION_MAX_S } from '@mundo-catrucho/reglas';
import {
  type DataModelFromSchemaDefinition,
  type FunctionReference,
  internalMutationGeneric,
  type MutationBuilder,
  makeFunctionReference,
} from 'convex/server';
import { type GenericId, v } from 'convex/values';
import type schema from './schema';

type Modelo = DataModelFromSchemaDefinition<typeof schema>;
const internalMutation: MutationBuilder<Modelo, 'internal'> = internalMutationGeneric;
const interna = <A extends Record<string, unknown>>(nombre: string) =>
  makeFunctionReference<'mutation', A>(nombre) as unknown as FunctionReference<'mutation', 'internal', A>;
const vencerPartida = interna<{ partidaId: GenericId<'partidas'> }>('partidas:vencerPartida');
const borrarViaje = interna<{ viajeId: GenericId<'viajesCompartidos'> }>('salas:borrarViaje');

export const vencerFilas = internalMutation({
  args: { partidaId: v.id('partidas'), viajeId: v.id('viajesCompartidos') },
  handler: async (ctx, { partidaId, viajeId }) => {
    await ctx.db.patch(partidaId, { inicio: Date.now() - DURACION_MAX_S * 1000 - 1 });
    await ctx.db.patch(viajeId, { vence: Date.now() - 1 });
    await ctx.scheduler.runAfter(0, vencerPartida, { partidaId });
    await ctx.scheduler.runAfter(0, borrarViaje, { viajeId });
  },
});

export const rechazarPartida = internalMutation({
  args: { partidaId: v.id('partidas') },
  handler: async (ctx, { partidaId }) => {
    await ctx.db.patch(partidaId, { estado: 'rechazada' });
  },
});
