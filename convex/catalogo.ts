import {
  type DataModelFromSchemaDefinition,
  internalMutationGeneric,
  type MutationBuilder,
  type QueryBuilder,
  queryGeneric,
} from 'convex/server';
import { v } from 'convex/values';
import { entradaCatalogo } from './catalogoModelo';
import type schema from './schema';

type Modelo = DataModelFromSchemaDefinition<typeof schema>;
const internalMutation: MutationBuilder<Modelo, 'internal'> = internalMutationGeneric;
const query: QueryBuilder<Modelo, 'public'> = queryGeneric;

export const reemplazar = internalMutation({
  args: { departamentos: v.array(entradaCatalogo) },
  handler: async (ctx, { departamentos }) => {
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
    const anteriores = await ctx.db.query('catalogo').collect();
    // Comparar el contenido evita duplicados y versiones nuevas en reintentos idénticos.
    if (
      anteriores.length === departamentos.length &&
      departamentos.every((d) =>
        anteriores.some((a) => a.deptId === d.deptId && JSON.stringify(a.datos) === JSON.stringify(d.datos)),
      )
    )
      return { version: anteriores[0].version, departamentos: departamentos.length };
    const version = Math.max(0, ...anteriores.map((d) => d.version)) + 1;
    for (const anterior of anteriores) await ctx.db.delete(anterior._id);
    for (const d of departamentos) await ctx.db.insert('catalogo', { version, ...d });
    return { version, departamentos: departamentos.length };
  },
});

export const ultima = query({
  args: {},
  returns: v.union(v.null(), v.object({ version: v.number(), departamentos: v.array(entradaCatalogo) })),
  handler: async (ctx) => {
    const ultimo = await ctx.db.query('catalogo').withIndex('por_version').order('desc').first();
    if (!ultimo) return null;
    const filas = await ctx.db
      .query('catalogo')
      .withIndex('por_version', (q) => q.eq('version', ultimo.version))
      .collect();
    return { version: ultimo.version, departamentos: filas.map(({ deptId, datos }) => ({ deptId, datos })) };
  },
});
