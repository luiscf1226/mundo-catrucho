// Salas en vivo de Mundo Catrucho: un Durable Object por tramo de mapa o de departamento (`mapa:0`, `dept:olancho:1`).
// Reparte posiciones y emotes entre quienes están en la misma sala. Usa WebSocket con hibernación:
// la sala no cobra tiempo mientras nadie manda nada.
//
// Para entrar hace falta el pase firmado que da Convex (`salas:pase`, MC-18) para esa sala exacta. Cada tramo
// tiene cupo de `SALA.cupo`; `GET /libre/<zona>` dice cuál es el primer tramo con espacio (MC-20).
// Los rechazos se avisan cerrando el WebSocket con un código propio: el navegador no deja leer el estado HTTP.
//
// Falta: avisar la ocupación a Convex cada 30 s (para mostrar salas en el menú sin preguntarle a la sala).

import { DurableObject } from 'cloudflare:workers';
import {
  acotarEje,
  animacionPermitida,
  type Cubeta,
  cubetaNueva,
  emoteValido,
  nombreSala,
  permitirMensaje,
  SALA,
  SECRETO_MIN,
  salaValida,
  verificarPase,
  zonaValida,
} from '@mundo-catrucho/reglas';

export interface Env {
  SALAS: DurableObjectNamespace<Sala>;
  /** secreto compartido con Convex para verificar pases; va en `wrangler secret put` o en `.dev.vars` */
  SALA_SECRETO: string;
}
const CIERRE = SALA.cierre;
interface Jugador {
  id: string;
  nombre: string;
  avatar: Record<string, string>;
  x: number;
  y: number;
  z: number;
  yaw: number;
  anim: string;
}
const CORS = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };
/** Acepta el WebSocket solo para cerrarlo con un motivo que el navegador sí puede leer. */
function rechazar(codigo: number, motivo: string) {
  const [cliente, servidor] = Object.values(new WebSocketPair());
  servidor.accept();
  servidor.close(codigo, motivo);
  return new Response(null, { status: 101, webSocket: cliente });
}

export class Sala extends DurableObject<Env> {
  /** ritmo de mensajes por conexión; si la sala hiberna se vuelve a llenar, que es lo justo */
  private ritmo = new WeakMap<WebSocket, Cubeta>();
  private conectados() {
    return this.ctx.getWebSockets().filter((w) => w.readyState === WebSocket.OPEN);
  }
  private jugadores(menos?: WebSocket): Jugador[] {
    return this.conectados()
      .filter((w) => w !== menos)
      .map((w) => w.deserializeAttachment() as Jugador);
  }
  private difundir(msg: unknown, menos?: WebSocket) {
    const s = JSON.stringify(msg);
    for (const w of this.conectados())
      if (w !== menos) {
        try {
          w.send(s);
        } catch {
          /* se cerró */
        }
      }
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url),
      sala = decodeURIComponent(url.pathname.slice('/sala/'.length));
    if (req.headers.get('Upgrade') !== 'websocket')
      return Response.json({ sala, ocupacion: this.conectados().length, cupo: SALA.cupo }, { headers: CORS });
    if ((this.env.SALA_SECRETO ?? '').length < SECRETO_MIN) {
      console.error('Falta SALA_SECRETO: nadie puede entrar (wrangler secret put SALA_SECRETO o .dev.vars).');
      return rechazar(CIERRE.pase, 'sin-secreto');
    }
    const v = await verificarPase(url.searchParams.get('pase'), this.env.SALA_SECRETO, sala);
    if (!v.ok) return rechazar(v.motivo === 'otra-sala' ? CIERRE.otraSala : CIERRE.pase, v.motivo);
    // el mismo jugador entrando otra vez (otra pestaña o reconexión): se va la conexión vieja
    for (const w of this.conectados())
      if ((w.deserializeAttachment() as Jugador | null)?.id === v.pase.id) {
        w.close(CIERRE.reemplazado, 'reemplazado');
        this.difundir({ t: 'sale', id: v.pase.id }, w);
        w.serializeAttachment(null);
      }
    if (this.conectados().filter((w) => w.deserializeAttachment()).length >= SALA.cupo)
      return rechazar(CIERRE.llena, 'llena');
    const { id, nombre, avatar } = v.pase;
    const yo: Jugador = { id, nombre, avatar, x: 0, y: 0, z: 0, yaw: 0, anim: 'idle' };
    const [cliente, servidor] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(servidor);
    servidor.serializeAttachment(yo);
    servidor.send(JSON.stringify({ t: 'hola', id, sala, jugadores: this.jugadores(servidor).filter(Boolean) }));
    this.difundir({ t: 'entra', id, nombre, avatar }, servidor);
    return new Response(null, { status: 101, webSocket: cliente });
  }

  webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== 'string' || raw.length > SALA.mensajeMax) return;
    const yo = ws.deserializeAttachment() as Jugador | null;
    if (!yo) return;
    let cubeta = this.ritmo.get(ws);
    if (!cubeta) this.ritmo.set(ws, (cubeta = cubetaNueva(Date.now())));
    if (!permitirMensaje(cubeta, Date.now())) return;
    let m: Record<string, unknown>;
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
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
    ws.serializeAttachment(null);
  }
  webSocketError(ws: WebSocket) {
    this.webSocketClose(ws);
  }
}

const sala = (env: Env, nombre: string) => env.SALAS.get(env.SALAS.idFromName(nombre));

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    // /sala/mapa:0   /sala/dept:olancho:0   (GET = ocupación; WebSocket = entrar con ?pase=)
    const m = pathname.match(/^\/sala\/([^/]{1,64})$/);
    if (m) {
      const nombre = decodeURIComponent(m[1]);
      if (!salaValida(nombre)) return new Response('sala inválida', { status: 404, headers: CORS });
      return sala(env, nombre).fetch(req);
    }
    // /libre/mapa   /libre/dept:olancho   → primer tramo con espacio
    const z = pathname.match(/^\/libre\/([^/]{1,64})$/);
    if (z) {
      const zona = decodeURIComponent(z[1]),
        desde = Math.max(0, Math.min(SALA.tramosMax - 1, Number(new URL(req.url).searchParams.get('desde')) || 0));
      if (!zonaValida(zona)) return new Response('zona inválida', { status: 404, headers: CORS });
      for (let t = desde; t < SALA.tramosMax; t++) {
        const nombre = nombreSala(zona, t);
        const r = (await (await sala(env, nombre).fetch(`https://sala/sala/${nombre}`)).json()) as {
          ocupacion: number;
        };
        if (r.ocupacion < SALA.cupo)
          return Response.json({ sala: nombre, ocupacion: r.ocupacion, cupo: SALA.cupo }, { headers: CORS });
      }
      return Response.json({ sala: null, cupo: SALA.cupo }, { status: 409, headers: CORS });
    }
    return new Response('Mundo Catrucho · salas en vivo', { status: 200, headers: CORS });
  },
} satisfies ExportedHandler<Env>;
