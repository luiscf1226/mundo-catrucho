import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import type { Infer } from 'convex/values';
import type { entradaCatalogo } from '../../../../convex/catalogoModelo';

const ultima = makeFunctionReference<
  'query',
  Record<string, never>,
  { version: number; departamentos: Infer<typeof entradaCatalogo>[] } | null
>('catalogo:ultima');

/** Solo se consulta cuando la compilación lo habilita. El plazo incluye conexión y respuesta. */
export async function cargarCatalogoRemoto() {
  const url = import.meta.env.VITE_CONVEX_URL;
  if (!url) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const cliente = new ConvexHttpClient(url, { logger: false });
    const resultado = await Promise.race([
      cliente.query(ultima),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), 3000);
      }),
    ]);
    return resultado?.departamentos.length === 18 ? resultado : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
