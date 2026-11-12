// Partidas. Por ahora solo la validación pura con las reglas compartidas (@mundo-catrucho/reglas);
// `abrirPartida` y `cerrarPartida` (MC-14) la llamarán antes de pagar premios con `premioPartida`.
import { validarResultado } from '@mundo-catrucho/reglas';
import { type DataModelFromSchemaDefinition, type QueryBuilder, queryGeneric } from 'convex/server';
import { v } from 'convex/values';
import type schema from './schema';

type Modelo = DataModelFromSchemaDefinition<typeof schema>;
const query: QueryBuilder<Modelo, 'public'> = queryGeneric;

/** ¿Es posible este resultado? No lee ni escribe tablas: responde con `validarResultado` tal cual. */
export const validar = query({
  args: {
    motor: v.string(),
    puntos: v.number(),
    estrellas: v.number(),
    duracion: v.number(),
    etapa: v.number(),
    etapas: v.optional(v.number()),
    gano: v.optional(v.boolean()),
  },
  handler: async (_ctx, resultado) => validarResultado(resultado),
});
