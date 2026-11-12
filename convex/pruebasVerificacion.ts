// Preparación administrativa de la regresión: adelanta el reloj de filas creadas por la prueba.
// Es interna; ningún jugador puede llamar estas mutaciones.
import { DURACION_MAX_S } from '@mundo-catrucho/reglas';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { internalMutation } from './_generated/server';

export const vencerFilas = internalMutation({
  args: { partidaId: v.id('partidas'), viajeId: v.id('viajesCompartidos') },
  handler: async (ctx, { partidaId, viajeId }) => {
    await ctx.db.patch(partidaId, { inicio: Date.now() - DURACION_MAX_S * 1000 - 1 });
    await ctx.db.patch(viajeId, { vence: Date.now() - 1 });
    await ctx.scheduler.runAfter(0, internal.partidas.vencerPartida, { partidaId });
    await ctx.scheduler.runAfter(0, internal.salas.borrarViaje, { viajeId });
  },
});

export const rechazarPartida = internalMutation({
  args: { partidaId: v.id('partidas') },
  handler: async (ctx, { partidaId }) => {
    await ctx.db.patch(partidaId, { estado: 'rechazada' });
  },
});
