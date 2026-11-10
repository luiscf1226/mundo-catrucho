// Salas en vivo de Mundo Catrucho: un Durable Object por tramo de mapa, departamento o partida.
// Reparte posiciones y emotes entre quienes están en la misma sala. Usa WebSocket con hibernación:
// la sala no cobra tiempo mientras nadie manda nada.
//
// Falta (fase 3 del plan): exigir el pase firmado que emite Convex antes de aceptar la conexión,
// y avisar la ocupación a Convex cada 30 s. Hoy cualquiera puede entrar: sirve solo para desarrollo.
import { DurableObject } from 'cloudflare:workers';

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
const CUPO = 24,
  ANIMS = new Set([
    'idle',
    'walk',
    'run',
    'jump',
    'fall',
    'dance',
    'dance2',
    'celebrate',
    'wave',
    'clap',
    'kick',
    'throw',
    'carry',
    'drive',
    'sit',
  ]);
const num = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : 0;

export class Sala extends DurableObject<Env> {
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
    if (req.headers.get('Upgrade') !== 'websocket') return Response.json({ ocupacion: n, cupo: CUPO });
    if (n >= CUPO) return new Response('sala llena', { status: 409 });
    const nombre =
      (new URL(req.url).searchParams.get('nombre') ?? 'Catracho').replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 16) ||
      'Catracho';
    const yo: Jugador = { id: crypto.randomUUID().slice(0, 8), nombre, x: 0, y: 0, z: 0, yaw: 0, anim: 'idle' };
    const [cliente, servidor] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(servidor);
    servidor.serializeAttachment(yo);
    servidor.send(JSON.stringify({ t: 'hola', id: yo.id, jugadores: this.jugadores(servidor) }));
    this.difundir({ t: 'entra', id: yo.id, nombre }, servidor);
    return new Response(null, { status: 101, webSocket: cliente });
  }

  webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== 'string' || raw.length > 512) return;
    let m: Record<string, unknown>;
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    const yo = ws.deserializeAttachment() as Jugador;
    if (m.t === 'pos') {
      yo.x = num(m.x, -1000, 1000);
      yo.y = num(m.y, -50, 500);
      yo.z = num(m.z, -1000, 1000);
      yo.yaw = num(m.yaw, -10, 10);
      yo.anim = typeof m.anim === 'string' && ANIMS.has(m.anim) ? m.anim : 'idle';
      ws.serializeAttachment(yo);
      this.difundir({ t: 'pos', id: yo.id, x: yo.x, y: yo.y, z: yo.z, yaw: yo.yaw, anim: yo.anim }, ws);
    } else if (m.t === 'emote' && typeof m.id === 'string' && m.id.length <= 32) {
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
