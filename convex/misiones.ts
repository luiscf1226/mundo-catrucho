// Misiones del día (MC-16). El cron de `crons.ts` las reparte a medianoche de Honduras: las mismas para todos
// ese día, sorteadas con la fecha como semilla (`misionesDelDia`). Cada jugador recibe su copia la primera vez
// que hace algo ese día; el progreso avanza desde `cerrarPartida` y las demás mutaciones de `progreso.ts`.
import { fechaHonduras, misionesDelDia } from '@mundo-catrucho/reglas';
import { type DataModelFromSchemaDefinition, internalMutationGeneric, type MutationBuilder } from 'convex/server';
import { v } from 'convex/values';
import type schema from './schema';

type Modelo = DataModelFromSchemaDefinition<typeof schema>;
const internalMutation: MutationBuilder<Modelo, 'internal'> = internalMutationGeneric;

/** Reparte las misiones de hoy (o de `fecha`). Si ya estaban, no cambia nada. */
export const repartir = internalMutation({
  args: { fecha: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const fecha = args.fecha ?? fechaHonduras(Date.now());
    const ya = await ctx.db
      .query('misionesGlobales')
      .withIndex('por_fecha', (q) => q.eq('fecha', fecha))
      .first();
    if (ya) return { fecha, ids: ya.ids, nuevas: false };
    const ids = misionesDelDia(fecha);
    await ctx.db.insert('misionesGlobales', { fecha, ids });
    return { fecha, ids, nuevas: true };
  },
});
