// Viaje compartido (MC-31): `viaje:<id>`. El primero que entra maneja: manda la ruta (vehículo, origen, destino y
// semilla de los eventos) y el estado del vehículo; la sala se lo reparte a los pasajeros. Si el chofer se va, el
// volante pasa al pasajero que lleva más tiempo. El pasaje y el bono los cobra Convex a cada uno.
import { type Pase, SALA, VIAJE } from '@mundo-catrucho/reglas';
import { abiertas, aceptar, difundir, quien, rechazar } from './comun';

interface Ruta {
  veh: string;
  de: string;
  a: string;
  semilla: number;
}
interface EstadoViaje {
  chofer: string | null;
  /** quiénes han entrado, en orden (para pasar el volante) */
  orden: string[];
  ruta: Ruta | null;
}
/** Último estado del vehículo por sala: si la sala hiberna se pierde, y el siguiente envío lo repone. */
const ultimo = new Map<string, Record<string, number>>();
const leer = async (ctx: DurableObjectState) =>
  (await ctx.storage.get<EstadoViaje>('viaje')) ?? { chofer: null, orden: [], ruta: null };
const guardar = (ctx: DurableObjectState, e: EstadoViaje) => ctx.storage.put('viaje', e);
const conectado = (ctx: DurableObjectState, id: string) => abiertas(ctx).some((w) => quien(w)?.id === id);
const num = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v * 100) / 100)) : min;
const ID = /^[a-z]{2,24}$/;

export async function entrarViaje(ctx: DurableObjectState, sala: string, pase: Pase) {
  const e = await leer(ctx);
  if (!e.orden.includes(pase.id) && abiertas(ctx).length >= VIAJE.cupo) return rechazar(SALA.cierre.llena, 'llena');
  const { cliente, servidor } = aceptar(
    ctx,
    { id: pase.id, nombre: pase.nombre, avatar: pase.avatar, tipo: 'viaje', sala },
    SALA.cierre.reemplazado,
  );
  if (!e.orden.includes(pase.id)) e.orden.push(pase.id);
  if (!e.chofer || !conectado(ctx, e.chofer)) e.chofer = pase.id;
  await guardar(ctx, e);
  const gente = abiertas(ctx)
    .filter((w) => w !== servidor)
    .map((w) => quien(w))
    .filter((p) => !!p)
    .map((p) => ({ id: p.id, nombre: p.nombre, avatar: p.avatar }));
  servidor.send(
    JSON.stringify({
      t: 'hola',
      id: pase.id,
      sala,
      chofer: e.chofer,
      ruta: e.ruta,
      auto: ultimo.get(sala) ?? null,
      jugadores: gente,
    }),
  );
  difundir(ctx, { t: 'entra', id: pase.id, nombre: pase.nombre, avatar: pase.avatar }, servidor);
  return new Response(null, { status: 101, webSocket: cliente });
}

export async function mensajeViaje(ctx: DurableObjectState, sala: string, ws: WebSocket, m: Record<string, unknown>) {
  const yo = quien(ws);
  if (!yo) return;
  const e = await leer(ctx);
  // solo el chofer manda la ruta y el vehículo
  if (e.chofer !== yo.id) return;
  if (m.t === 'ruta' && !e.ruta) {
    if (typeof m.veh !== 'string' || !ID.test(m.veh) || typeof m.de !== 'string' || !ID.test(m.de)) return;
    if (typeof m.a !== 'string' || !ID.test(m.a) || !Number.isInteger(m.semilla)) return;
    e.ruta = { veh: m.veh, de: m.de, a: m.a, semilla: Math.abs(Number(m.semilla)) % 1_000_000 };
    await guardar(ctx, e);
    difundir(ctx, { t: 'ruta', ...e.ruta }, ws);
  } else if (m.t === 'auto') {
    const auto = {
      x: num(m.x, -10, 10),
      v: num(m.v, 0, 80),
      d: num(m.d, 0, 1e6),
      e: num(m.e, 0, 3600),
      h: Math.round(num(m.h, 0, 999)),
    };
    ultimo.set(sala, auto);
    difundir(ctx, { t: 'auto', ...auto }, ws);
  }
}

/** Se fue alguien; si era el chofer, el volante pasa al que lleva más tiempo en el vehículo. */
export async function salirViaje(ctx: DurableObjectState, ws: WebSocket) {
  const yo = quien(ws);
  ws.serializeAttachment(null);
  if (!yo) return;
  difundir(ctx, { t: 'sale', id: yo.id });
  const e = await leer(ctx);
  if (e.chofer !== yo.id) return;
  e.chofer = e.orden.find((id) => id !== yo.id && conectado(ctx, id)) ?? null;
  await guardar(ctx, e);
  if (e.chofer) difundir(ctx, { t: 'chofer', id: e.chofer });
}
