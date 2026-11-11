import {
  type DataModelFromSchemaDefinition,
  type MutationBuilder,
  mutationGeneric,
  type QueryBuilder,
  queryGeneric,
} from 'convex/server';
import { v } from 'convex/values';
import { leer, publicar, REGISTRO } from './catalogoHistorial';
import { entradaCatalogo } from './catalogoModelo';
import { validarEdicion } from './catalogoPanelModelo';
import type schema from './schema';

declare const process: { env: { PANEL_LLAVE?: string } };

type Modelo = DataModelFromSchemaDefinition<typeof schema>;
const mutation: MutationBuilder<Modelo, 'public'> = mutationGeneric;
const query: QueryBuilder<Modelo, 'public'> = queryGeneric;
function autorizar(llave: string) {
  if (!process.env.PANEL_LLAVE || llave !== process.env.PANEL_LLAVE)
    throw new Error('Llave de administrador incorrecta.');
}
export const entrar = query({
  args: { llave: v.string() },
  handler: async (_ctx, { llave }) => {
    autorizar(llave);
    return true;
  },
});
export const estado = query({
  args: {},
  handler: async (ctx) => {
    const actual = await leer(ctx);
    return actual ? { version: actual.version, registro: actual.registro ?? null } : null;
  },
});
export const guardar = mutation({
  args: { llave: v.string(), version: v.number(), departamento: entradaCatalogo },
  handler: async (ctx, { llave, version, departamento }) => {
    autorizar(llave);
    const actual = await leer(ctx);
    if (!actual || actual.version !== version) throw new Error('El catálogo cambió. Recargá antes de publicar.');
    const base = actual.departamentos.find((d) => d.deptId === departamento.deptId);
    if (!base) throw new Error('Departamento desconocido.');
    validarEdicion(
      base,
      departamento,
      actual.departamentos.map((d) => d.deptId),
    );
    return publicar(
      ctx,
      actual.departamentos.map((d) => (d.deptId === departamento.deptId ? departamento : d)),
      'panel',
      `Edición de ${departamento.deptId}`,
      version,
    );
  },
});
export const deshacer = mutation({
  args: { llave: v.string(), version: v.number() },
  handler: async (ctx, { llave, version }) => {
    autorizar(llave);
    const actual = await leer(ctx);
    if (!actual || actual.version !== version) throw new Error('El catálogo cambió. Recargá antes de deshacer.');
    const anterior = actual.registro?.anterior;
    if (!anterior) throw new Error('No hay publicación anterior disponible.');
    const filas = await ctx.db
      .query('catalogo')
      .withIndex('por_version', (q) => q.eq('version', anterior))
      .collect();
    const departamentos = filas.filter((d) => d.deptId !== REGISTRO).map(({ deptId, datos }) => ({ deptId, datos }));
    if (departamentos.length !== 18) throw new Error('La versión anterior no está completa.');
    // la restauración hereda el «anterior» de la versión restaurada: deshacer otra vez retrocede, no rehace
    const registroRestaurado = filas.find((d) => d.deptId === REGISTRO)?.datos as { anterior?: number } | undefined;
    return publicar(ctx, departamentos, 'panel', `Restauración de v${anterior}`, version, registroRestaurado?.anterior);
  },
});
