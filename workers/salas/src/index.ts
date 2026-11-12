// Salas en vivo de Mundo Catrucho: un Durable Object por tramo de mapa, departamento o partida.
// Reparte posiciones y emotes entre quienes están en la misma sala. Usa WebSocket con hibernación:
// la sala no cobra tiempo mientras nadie manda nada.
//
// Falta (fase 3 del plan): exigir el pase firmado que emite Convex antes de aceptar la conexión,
// y avisar la ocupación a Convex cada 30 s. Hoy cualquiera puede entrar: sirve solo para desarrollo.

import { DurableObject } from 'cloudflare:workers';
import {
  acotarEje,
  animacionPermitida,
  type Cubeta,
  cubetaNueva,
  emoteValido,
  limpiarNombre,
  permitirMensaje,
  SALA,
} from '@mundo-catrucho/reglas';

export interface Env {
  SALAS: DurableObjectNamespace<Sala>;
}
interface Jugador {
  id: string;
  nombre: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  anim: string;
}
export class Sala extends DurableObject<Env> {
  /** ritmo de mensajes por conexión; si la sala hiberna se vuelve a llenar, que es lo justo */
  private ritmo = new WeakMap<WebSocket, Cubeta>();
  private jugadores(menos?: WebSocket): Jugador[] {
    return this.ctx
      .getWebSockets()
      .filter((w) => w !== menos)
      .map((w) => w.deserializeAttachment() as Jugador);
  }
  private difundir(msg: unknown, menos?: WebSocket) {
    const s = JSON.stringify(msg);
    for (const w of this.ctx.getWebSockets())
      if (w !== menos) {
        try {
          w.send(s);
        } catch {
          /* se cerró */
        }
      }
  }

  async fetch(req: Request): Promise<Response> {
    const n = this.ctx.getWebSockets().length;
    if (req.headers.get('Upgrade') !== 'websocket') return Response.json({ ocupacion: n, cupo: SALA.cupo });
    if (n >= SALA.cupo) return new Response('sala llena', { status: 409 });
    const nombre = limpiarNombre(new URL(req.url).searchParams.get('nombre'));
    const yo: Jugador = { id: crypto.randomUUID().slice(0, 8), nombre, x: 0, y: 0, z: 0, yaw: 0, anim: 'idle' };
    const [cliente, servidor] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(servidor);
    servidor.serializeAttachment(yo);
    servidor.send(JSON.stringify({ t: 'hola', id: yo.id, jugadores: this.jugadores(servidor) }));
    this.difundir({ t: 'entra', id: yo.id, nombre }, servidor);
    return new Response(null, { status: 101, webSocket: cliente });
  }

  webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== 'string' || raw.length > SALA.mensajeMax) return;
    let cubeta = this.ritmo.get(ws);
    if (!cubeta) this.ritmo.set(ws, (cubeta = cubetaNueva(Date.now())));
    if (!permitirMensaje(cubeta, Date.now())) return;
    let m: Record<string, unknown>;
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    const yo = ws.deserializeAttachment() as Jugador;
    if (m.t === 'pos') {
      yo.x = acotarEje('x', m.x);
      yo.y = acotarEje('y', m.y);
      yo.z = acotarEje('z', m.z);
      yo.yaw = acotarEje('yaw', m.yaw);
      yo.anim = animacionPermitida(m.anim);
      ws.serializeAttachment(yo);
      this.difundir({ t: 'pos', id: yo.id, x: yo.x, y: yo.y, z: yo.z, yaw: yo.yaw, anim: yo.anim }, ws);
    } else if (m.t === 'emote' && emoteValido(m.id)) {
      this.difundir({ t: 'emote', id: yo.id, emote: m.id }, ws);
    }
  }
  webSocketClose(ws: WebSocket) {
    const yo = ws.deserializeAttachment() as Jugador | null;
    if (yo) this.difundir({ t: 'sale', id: yo.id }, ws);
  }
  webSocketError(ws: WebSocket) {
    this.webSocketClose(ws);
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    // /sala/mapa:0   /sala/dept:olancho:0   /sala/juego:<partida>
    const m = new URL(req.url).pathname.match(/^\/sala\/([\w:.-]{1,64})$/);
    if (!m) return new Response('Mundo Catrucho · salas en vivo', { status: 200 });
    return env.SALAS.get(env.SALAS.idFromName(m[1])).fetch(req);
  },
} satisfies ExportedHandler<Env>;
