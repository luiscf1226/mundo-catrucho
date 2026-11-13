// Sala de partida (MC-25): `juego:<partidaId>`. Entra quien trae pase y acta de Convex para esa partida. Cuando
// están todos (`acta.cupo`) la sala reparte el reloj (cuenta, inicio y fin) y la semilla; junta los puntajes que
// manda cada uno, acotados con `acotarPuntos`; y al terminar firma el recibo que Convex paga una sola vez.
// El estado vive en el almacenamiento del objeto: la partida sigue aunque la sala hiberne o alguien se vaya.
import {
  type Acta,
  acotarPuntos,
  duracionPartida,
  type FilaRecibo,
  filaDe,
  firmarRecibo,
  leerActa,
  PARTIDA,
  type Pase,
  SALA,
} from '@mundo-catrucho/reglas';
import { abiertas, aceptar, difundir, quien, rechazar } from './comun';

interface EnJuego {
  nombre: string;
  puntos: number;
  salio: boolean;
}
export interface EstadoPartida {
  acta: Acta;
  fase: 'espera' | 'juego' | 'fin' | 'cancelada';
  creada: number;
  /** milisegundos Unix: arranca el reloj (después de la cuenta) y se acaba */
  inicio?: number;
  fin?: number;
  jugadores: Record<string, EnJuego>;
  recibo?: string;
  resultados?: FilaRecibo[];
}
const leer = (ctx: DurableObjectState) => ctx.storage.get<EstadoPartida>('partida');
const guardar = (ctx: DurableObjectState, e: EstadoPartida) => ctx.storage.put('partida', e);
/** Lo que ve cada jugador de la partida (sin nada secreto). */
const vista = (e: EstadoPartida) => ({
  partidaId: e.acta.partidaId,
  motor: e.acta.motor,
  etapa: e.acta.etapa,
  etapas: e.acta.etapas,
  semilla: e.acta.semilla,
  cupo: e.acta.cupo,
  fase: e.fase,
  inicio: e.inicio ?? null,
  fin: e.fin ?? null,
  jugadores: Object.entries(e.jugadores).map(([id, j]) => ({ id, nombre: j.nombre, puntos: j.puntos, salio: j.salio })),
  recibo: e.recibo ?? null,
  resultados: e.resultados ?? [],
});

export async function entrarPartida(
  ctx: DurableObjectState,
  secreto: string,
  sala: string,
  id: string,
  pase: Pase,
  actaToken: string | null,
  /** solo pruebas: segundos de reloj en vez de los del motor (el recibo lo dice y Convex no lo pagaría) */
  segundosPrueba?: number,
): Promise<Response> {
  const acta = await leerActa(actaToken, secreto);
  if (!acta || acta.partidaId !== id) return rechazar(SALA.cierre.pase, 'acta');
  const ahora = Date.now();
  let e = await leer(ctx);
  if (!e) e = { acta, fase: 'espera', creada: ahora, jugadores: {} };
  const ya = e.jugadores[pase.id];
  if (!ya && (e.fase !== 'espera' || Object.keys(e.jugadores).length >= e.acta.cupo))
    return rechazar(SALA.cierre.llena, e.fase === 'espera' ? 'llena' : 'empezada');
  if (e.fase === 'cancelada') return rechazar(SALA.cierre.llena, 'cancelada');
  e.jugadores[pase.id] = { nombre: pase.nombre, puntos: ya?.puntos ?? 0, salio: false };
  const { cliente, servidor } = aceptar(
    ctx,
    { id: pase.id, nombre: pase.nombre, avatar: pase.avatar, tipo: 'juego', sala },
    SALA.cierre.reemplazado,
  );
  if (e.fase === 'espera' && abiertas(ctx).length >= e.acta.cupo) {
    // están todos: arranca la cuenta y el reloj de la sala manda
    e.fase = 'juego';
    e.inicio = ahora + PARTIDA.cuentaMs;
    e.fin = e.inicio + (segundosPrueba || duracionPartida(e.acta.motor, e.acta.etapa, e.acta.etapas)) * 1000;
    await ctx.storage.setAlarm(e.fin + PARTIDA.graciaMs);
  } else if (e.fase === 'espera' && !ya) await ctx.storage.setAlarm(e.creada + PARTIDA.esperaMaxMs);
  await guardar(ctx, e);
  servidor.send(JSON.stringify({ t: 'hola', id: pase.id, sala, ahora, partida: vista(e) }));
  difundir(ctx, { t: 'entra', id: pase.id, nombre: pase.nombre, avatar: pase.avatar }, servidor);
  if (e.fase === 'juego') difundir(ctx, { t: 'reloj', ahora, inicio: e.inicio, fin: e.fin, semilla: e.acta.semilla });
  return new Response(null, { status: 101, webSocket: cliente });
}

export async function mensajePartida(ctx: DurableObjectState, ws: WebSocket, m: Record<string, unknown>) {
  const yo = quien(ws);
  if (!yo || m.t !== 'puntos') return;
  const e = await leer(ctx),
    ahora = Date.now();
  const j = e?.jugadores[yo.id];
  if (!e || !j || e.fase !== 'juego' || e.inicio === undefined || e.fin === undefined) return;
  if (ahora < e.inicio || ahora > e.fin + PARTIDA.graciaMs) return;
  j.puntos = acotarPuntos({
    motor: e.acta.motor,
    etapa: e.acta.etapa,
    etapas: e.acta.etapas,
    puntos: m.puntos,
    segundos: (Math.min(ahora, e.fin) - e.inicio) / 1000,
  });
  await guardar(ctx, e);
  difundir(ctx, { t: 'marcador', id: yo.id, puntos: j.puntos });
}

/** Alguien se fue: su puntaje se queda como iba y la partida sigue. */
export async function salirPartida(ctx: DurableObjectState, ws: WebSocket) {
  const yo = quien(ws);
  ws.serializeAttachment(null);
  if (!yo) return;
  const e = await leer(ctx);
  const j = e?.jugadores[yo.id];
  if (e && j && e.fase !== 'fin') {
    if (e.fase === 'espera') delete e.jugadores[yo.id];
    else j.salio = true;
    await guardar(ctx, e);
  }
  difundir(ctx, { t: 'sale', id: yo.id });
}

/** Fin del reloj (o de la espera): firma el recibo, o cancela si nunca estuvieron todos. */
export async function alarmaPartida(ctx: DurableObjectState, secreto: string) {
  const e = await leer(ctx),
    ahora = Date.now();
  if (!e) return;
  if (e.fase === 'espera') {
    if (ahora < e.creada + PARTIDA.esperaMaxMs) return;
    e.fase = 'cancelada';
    await guardar(ctx, e);
    difundir(ctx, { t: 'cancelada' });
    return;
  }
  if (e.fase !== 'juego' || e.inicio === undefined || e.fin === undefined) return;
  if (ahora < e.fin) return void (await ctx.storage.setAlarm(e.fin + PARTIDA.graciaMs));
  const resultados = Object.entries(e.jugadores).map(([id, j]) => filaDe(e.acta, { id, ...j }));
  e.recibo = await firmarRecibo(
    {
      partidaId: e.acta.partidaId,
      motor: e.acta.motor,
      etapa: e.acta.etapa,
      etapas: e.acta.etapas,
      resultados,
      duracion: (e.fin - e.inicio) / 1000,
      momento: ahora,
    },
    secreto,
  );
  e.resultados = resultados;
  e.fase = 'fin';
  await guardar(ctx, e);
  difundir(ctx, { t: 'fin', recibo: e.recibo, resultados });
}
