// Acciones HTTP. `POST /salas/ocupacion` (MC-23): cada sala de zona avisa cuánta gente tiene, firmado con
// `SALA_SECRETO` (`firmarDatos('ocupacion', …)` de @mundo-catrucho/reglas). Sin firma buena no se escribe nada.
import { leerFirmado, SECRETO_MIN } from '@mundo-catrucho/reglas';
import { type FunctionReference, httpActionGeneric, httpRouter, makeFunctionReference } from 'convex/server';

declare const process: { env: { SALA_SECRETO?: string } };
// el tsconfig de convex no trae los tipos del navegador
declare class Response {
  constructor(cuerpo: string | null, init: { status: number });
}
type Aviso = { sala: string; ocupacion: number; momento: number };
const reportar = makeFunctionReference<'mutation', Aviso>('salas:reportar') as unknown as FunctionReference<
  'mutation',
  'internal',
  Aviso
>;
/** Un aviso más viejo (o adelantado) que esto no se acepta: así no sirve repetir uno viejo. */
const AVISO_MAX_MS = 75_000;

const http = httpRouter();
http.route({
  path: '/salas/ocupacion',
  method: 'POST',
  handler: httpActionGeneric(async (ctx, req) => {
    const secreto = process.env.SALA_SECRETO;
    if (!secreto || secreto.length < SECRETO_MIN) return new Response('sin salas', { status: 503 });
    const d = (await leerFirmado('ocupacion', await req.text(), secreto, 1024)) as Partial<Aviso> | null;
    if (!d || typeof d.sala !== 'string' || typeof d.ocupacion !== 'number' || typeof d.momento !== 'number')
      return new Response('firma', { status: 401 });
    if (
      !Number.isFinite(d.momento) ||
      !Number.isFinite(d.ocupacion) ||
      Date.now() - d.momento > AVISO_MAX_MS ||
      d.momento > Date.now() + 5000
    )
      return new Response('vencido', { status: 401 });
    await ctx.runMutation(reportar, { sala: d.sala, ocupacion: d.ocupacion, momento: d.momento });
    return new Response(null, { status: 204 });
  }),
});
export default http;
