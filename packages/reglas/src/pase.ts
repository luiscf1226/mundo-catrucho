// Pase firmado de sala (MC-18): Convex lo firma y la sala lo verifica antes de aceptar la conexión.
// HMAC-SHA256 con un secreto compartido (`SALA_SECRETO`) que vive solo en los entornos de Convex y Cloudflare.
// Usa Web Crypto: corre igual en Convex, en el Worker y en Node.
//
// Formato: `<datos>.<firma>`, los dos en base64url. `datos` es el JSON de `Pase`.

import { limpiarNombre, partirSalaCerrada, SALA, salaValida } from './sala.ts';

interface Llave {
  readonly type: string;
}
declare const crypto: {
  subtle: {
    importKey(
      f: 'raw',
      k: Uint8Array,
      a: { name: 'HMAC'; hash: 'SHA-256' },
      ext: boolean,
      usos: ('sign' | 'verify')[],
    ): Promise<Llave>;
    sign(a: 'HMAC', k: Llave, d: Uint8Array): Promise<ArrayBuffer>;
    verify(a: 'HMAC', k: Llave, firma: Uint8Array, d: Uint8Array): Promise<boolean>;
  };
};
declare const TextEncoder: new () => { encode(s: string): Uint8Array };
declare const TextDecoder: new () => { decode(b: Uint8Array): string };

/** Lo que la sala sabe de quien entra. Nada de esto es secreto: el pase viaja en la URL. */
export interface Pase {
  /** id público del jugador (derivado con el secreto; no revela su cuenta) */
  id: string;
  nombre: string;
  /** sala exacta para la que vale, p. ej. `mapa:0` o `dept:olancho:1` */
  sala: string;
  /** milisegundos Unix */
  vence: number;
  /** cómo se ve: piezas y colores del avatar, tal como los guarda Convex */
  avatar: Record<string, string>;
  /** ids públicos que bloqueó (MC-22): la sala no le pasa sus mensajes ni le pasa los suyos */
  bloqueados?: string[];
}
export type MotivoPase = 'sin-pase' | 'roto' | 'firma' | 'vencido' | 'otra-sala';
export type Verificacion = { ok: true; pase: Pase } | { ok: false; motivo: MotivoPase };

/** Ids públicos bloqueados: cortos y sin repetir. Convex impone el límite por cuenta; acá nunca se trunca. */
export function bloqueadosDePase(b: unknown): string[] {
  if (!Array.isArray(b)) return [];
  return [...new Set(b.filter((x): x is string => typeof x === 'string' && /^[\w-]{1,24}$/.test(x)))];
}

/** El secreto tiene que ser largo; uno corto se adivina. */
export const SECRETO_MIN = 32;
const CAMPOS_AVATAR = [
  'body',
  'skin',
  'hair',
  'hairColor',
  'face',
  'shirt',
  'shirtColor',
  'pants',
  'pantsColor',
  'hat',
  'hatColor',
  'acc',
  'accColor',
] as const;
const PIEZA = /^[#\w-]{1,32}$/;
/** Solo las piezas conocidas del avatar, cada una un id o color corto. */
export function avatarDePase(a: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!a || typeof a !== 'object') return out;
  for (const k of CAMPOS_AVATAR) {
    const v = (a as Record<string, unknown>)[k];
    if (typeof v === 'string' && PIEZA.test(v)) out[k] = v;
  }
  return out;
}

const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function a64(b: Uint8Array) {
  let s = '';
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    s += ABC[(n >> 18) & 63] + ABC[(n >> 12) & 63];
    if (i + 1 < b.length) s += ABC[(n >> 6) & 63];
    if (i + 2 < b.length) s += ABC[n & 63];
  }
  return s;
}
function de64(s: string): Uint8Array | null {
  if (!/^[\w-]*$/.test(s) || s.length % 4 === 1) return null;
  const out = new Uint8Array(Math.floor((s.length * 3) / 4));
  let n = 0,
    bits = 0,
    j = 0;
  for (const c of s) {
    n = (n << 6) | ABC.indexOf(c);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[j++] = (n >> bits) & 255;
    }
  }
  return out;
}
const texto = (s: string) => new TextEncoder().encode(s);
function llave(secreto: string, usos: ('sign' | 'verify')[]) {
  if (typeof secreto !== 'string' || secreto.length < SECRETO_MIN)
    throw new Error(`SALA_SECRETO falta o es corto (mínimo ${SECRETO_MIN} caracteres).`);
  return crypto.subtle.importKey('raw', texto(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, usos);
}

/** Id público y estable de un usuario para las salas: HMAC del id de la cuenta, 12 caracteres. */
export async function idPublico(usuarioId: string, secreto: string) {
  const firma = await crypto.subtle.sign('HMAC', await llave(secreto, ['sign']), texto(`jugador:${usuarioId}`));
  return a64(new Uint8Array(firma)).slice(0, 12);
}

/** Firma un pase para una sala. Vence en `SALA.paseMs`. Lo usa Convex (y las pruebas). */
export async function firmarPase(
  datos: { id: string; nombre: string; sala: string; avatar?: unknown; bloqueados?: unknown },
  secreto: string,
  ahora = Date.now(),
) {
  if (!salaValida(datos.sala) && !partirSalaCerrada(datos.sala)) throw new Error(`Sala inválida: ${datos.sala}`);
  const pase: Pase = {
    id: datos.id,
    nombre: limpiarNombre(datos.nombre),
    sala: datos.sala,
    vence: ahora + SALA.paseMs,
    avatar: avatarDePase(datos.avatar),
  };
  const bloqueados = bloqueadosDePase(datos.bloqueados);
  if (bloqueados.length) pase.bloqueados = bloqueados;
  const cuerpo = a64(texto(JSON.stringify(pase)));
  const firma = await crypto.subtle.sign('HMAC', await llave(secreto, ['sign']), texto(cuerpo));
  return `${cuerpo}.${a64(new Uint8Array(firma))}`;
}

/** Revisa firma, vencimiento y sala. La comparación de la firma la hace Web Crypto en tiempo constante. */
export async function verificarPase(
  pase: string | null | undefined,
  secreto: string,
  sala: string,
  ahora = Date.now(),
): Promise<Verificacion> {
  const k = await llave(secreto, ['verify']);
  if (!pase) return { ok: false, motivo: 'sin-pase' };
  const [cuerpo, firma, sobra] = pase.split('.');
  const bytesFirma = firma ? de64(firma) : null;
  if (!cuerpo || !bytesFirma || sobra !== undefined || pase.length > 12000) return { ok: false, motivo: 'roto' };
  if (!(await crypto.subtle.verify('HMAC', k, bytesFirma, texto(cuerpo)))) return { ok: false, motivo: 'firma' };
  let datos: Pase;
  try {
    const bytes = de64(cuerpo);
    if (!bytes) return { ok: false, motivo: 'roto' };
    datos = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return { ok: false, motivo: 'roto' };
  }
  if (typeof datos?.vence !== 'number' || typeof datos.id !== 'string') return { ok: false, motivo: 'roto' };
  if (datos.vence < ahora) return { ok: false, motivo: 'vencido' };
  if (datos.sala !== sala) return { ok: false, motivo: 'otra-sala' };
  return {
    ok: true,
    pase: {
      id: datos.id.slice(0, 24),
      nombre: limpiarNombre(datos.nombre),
      sala: datos.sala,
      vence: datos.vence,
      avatar: avatarDePase(datos.avatar),
      bloqueados: bloqueadosDePase(datos.bloqueados),
    },
  };
}

// ------------------------------------------------------------------ otros datos firmados
/**
 * Firma cualquier JSON con el mismo secreto (acta y recibo de partida, ocupación de sala). `uso` va dentro de lo
 * firmado: un pase no sirve como recibo ni un recibo como acta.
 */
export async function firmarDatos(uso: string, datos: unknown, secreto: string) {
  const cuerpo = a64(texto(JSON.stringify(datos)));
  const firma = await crypto.subtle.sign('HMAC', await llave(secreto, ['sign']), texto(`${uso}.${cuerpo}`));
  return `${cuerpo}.${a64(new Uint8Array(firma))}`;
}
/** Lo que firmó `firmarDatos` con ese mismo `uso`, o null si está roto, es muy largo o la firma no cuadra. */
export async function leerFirmado(uso: string, token: unknown, secreto: string, largoMax = 8192): Promise<unknown> {
  const k = await llave(secreto, ['verify']);
  if (typeof token !== 'string' || token.length > largoMax) return null;
  const [cuerpo, firma, sobra] = token.split('.');
  const bytesFirma = firma ? de64(firma) : null;
  if (!cuerpo || !bytesFirma || sobra !== undefined) return null;
  if (!(await crypto.subtle.verify('HMAC', k, bytesFirma, texto(`${uso}.${cuerpo}`)))) return null;
  const bytes = de64(cuerpo);
  if (!bytes) return null;
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}
