import type { DataModelFromSchemaDefinition, GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import type { Entrada } from './catalogoPanelModelo';
import type schema from './schema';

type Modelo = DataModelFromSchemaDefinition<typeof schema>;
export type Lectura = GenericQueryCtx<Modelo>;
export type Escritura = GenericMutationCtx<Modelo>;
// Fila reservada en la tabla existente: conserva el esquema compartido con los otros tickets.
export const REGISTRO = '__publicacion';
export async function leer(ctx: Lectura) {
  const ultima = await ctx.db.query('catalogo').withIndex('por_version').order('desc').first();
  if (!ultima) return null;
  const filas = await ctx.db
    .query('catalogo')
    .withIndex('por_version', (q) => q.eq('version', ultima.version))
    .collect();
  const registro = filas.find((f) => f.deptId === REGISTRO)?.datos;
  return {
    version: ultima.version,
    departamentos: filas.filter((f) => f.deptId !== REGISTRO).map((f) => ({ deptId: f.deptId, datos: f.datos })),
    registro,
  };
}
export async function publicar(
  ctx: Escritura,
  departamentos: Entrada[],
  quien: 'panel' | 'script',
  que: string,
  anterior: number,
  /** a qué versión vuelve el próximo «Deshacer»; por omisión, a la que esta reemplaza */
  deshaceA: number = anterior,
) {
  const version = anterior + 1;
  for (const d of departamentos) await ctx.db.insert('catalogo', { version, ...d });
  await ctx.db.insert('catalogo', {
    version,
    deptId: REGISTRO,
    datos: { quien, que, cuando: Date.now(), anterior: deshaceA },
  });
  return { version, departamentos: departamentos.length };
}
