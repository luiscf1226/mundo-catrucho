import {
  type DataModelFromSchemaDefinition,
  internalMutationGeneric,
  type MutationBuilder,
  type QueryBuilder,
  queryGeneric,
} from 'convex/server';
import { v } from 'convex/values';
import { leer, publicar } from './catalogoHistorial';
import { entradaCatalogo } from './catalogoModelo';
import { contenidoIgual } from './catalogoPanelModelo';
import type schema from './schema';

type Modelo = DataModelFromSchemaDefinition<typeof schema>;
const internalMutation: MutationBuilder<Modelo, 'internal'> = internalMutationGeneric;
const query: QueryBuilder<Modelo, 'public'> = queryGeneric;

export const reemplazar = internalMutation({
  args: { departamentos: v.array(entradaCatalogo), forzar: v.optional(v.boolean()) },
  handler: async (ctx, { departamentos, forzar }) => {
    if (departamentos.length !== 18 || new Set(departamentos.map((d) => d.deptId)).size !== 18)
      throw new Error('El catálogo debe tener los 18 departamentos sin repetir.');
    for (const { deptId, datos } of departamentos) {
      if (
        datos.departamento.id !== deptId ||
        datos.catalogo.id !== deptId ||
        datos.catalogo.juegos.some((j) => j.dept !== deptId || !j.id.startsWith(`${deptId}.`))
      )
        throw new Error('Departamento inconsistente.');
    }
    const actual = await leer(ctx);
    if (actual?.registro?.quien === 'panel' && !forzar)
      throw new Error('La última publicación vino del panel. Revisá los cambios y usá --forzar para reemplazarlos.');
    if (
      actual &&
      actual.departamentos.length === departamentos.length &&
      departamentos.every((d) =>
        actual.departamentos.some((a) => a.deptId === d.deptId && contenidoIgual(a.datos, d.datos)),
      )
    )
      return { version: actual.version, departamentos: departamentos.length };
    return publicar(ctx, departamentos, 'script', 'Carga del catálogo empaquetado', actual?.version ?? 0);
  },
});

export const ultima = query({
  args: {},
  returns: v.union(v.null(), v.object({ version: v.number(), departamentos: v.array(entradaCatalogo) })),
  handler: async (ctx) => {
    const actual = await leer(ctx);
    return actual ? { version: actual.version, departamentos: actual.departamentos } : null;
  },
});
