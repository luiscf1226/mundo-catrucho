// Cliente de Convex para la tienda, las partidas (MC-13, MC-14) y el avance: visitas, recuerdos, misiones, logros,
// viajes y clasificación (MC-15, MC-16, MC-17). Solo existe si la compilación trae
// VITE_CONVEX_URL; sin ella `SERVIDOR` es false y el juego no hace ninguna petición.
// Identidad: un secreto de invitado aleatorio en localStorage (Convex guarda solo su hash). Otro dispositivo entra a
// la misma cuenta con un código (MC-09) y, si la compilación trae Clerk (MC-07, `core/clerk.tsx`), cada llamada
// lleva también el token de la cuenta.
import { ConvexHttpClient } from 'convex/browser';
import {
  type FunctionArgs,
  type FunctionReference,
  type FunctionReturnType,
  makeFunctionReference,
} from 'convex/server';
import type { RecuerdoTuristico } from '../../../../docs/generador/turismo';
import type { AvatarConfig, Modo } from './types';

const URL_CONVEX = import.meta.env.VITE_CONVEX_URL;
/** ¿La tienda y los premios los decide Convex? */
export const SERVIDOR = !!URL_CONVEX;
/** Plazo de cada llamada (conexión y respuesta). Después se toma como sin conexión. */
const PLAZO_MS = 6000;
const LLAVE = 'mundo-catrucho-invitado';

export interface PerfilServidor {
  monedas: number;
  xp: number;
  nivel: number;
  avatar: AvatarConfig;
  comprados: string[];
  /** nombre guardado en la cuenta (solo lo trae `entrar`) */
  nombre?: string;
}
/** Lo que trajo la otra cuenta al juntarse con esta (MC-08). */
export interface ResumenFusion {
  monedas: number;
  descuento: number;
  reembolso: number;
  prendas: number;
  juegos: number;
  visitas: number;
}
export interface MiCuenta {
  nombre: string;
  conCuenta: boolean;
  dispositivos: number;
  codigoVence: number | null;
}
type AvanceLocal = {
  turismo?: RecuerdoTuristico[];
  visitados: string[];
  recuerdos: string[];
  juegos: { juegoId: string; etapa?: number; stars?: number[]; veces?: number }[];
};
type Quien = { invitado: string };
export interface Saldo {
  monedas: number;
  xp: number;
  nivel: number;
}
export interface MisionServidor {
  id: string;
  progreso: number;
  cobrada: boolean;
}
/** Lo que responde cada mutación que mueve el avance: saldo, logros que pagó y misiones de hoy. */
export interface Avance {
  saldo: Saldo;
  subidas: number;
  logros: { id: string; monedas: number }[];
  misiones: { fecha: string; misiones: MisionServidor[] };
}
export interface ProgresoJuegoServidor {
  juegoId: string;
  etapa: number;
  estrellas: number[];
  mejor: number;
  veces: number;
}
export interface EstadoServidor {
  turismo: RecuerdoTuristico[];
  visitas: string[];
  recuerdos: string[];
  logros: string[];
  misiones: Avance['misiones'];
  juegos: ProgresoJuegoServidor[];
  migrado: boolean;
}
export interface FilaClasificacion {
  nombre: string;
  juegoId: string;
  puntos: number;
  etapa: number;
  tu: boolean;
}
export interface Clasificacion {
  filas: FilaClasificacion[];
  tuya: FilaClasificacion | null;
}
type Fallo = {
  ok: false;
  motivo: string;
  motivos?: string[];
  reintentarMs?: number;
  perfil?: PerfilServidor;
  saldo?: Saldo;
} & Partial<Avance>;
export type Respuesta<T> = ({ ok: true } & T) | Fallo;
type Logros = { logros?: Avance['logros'] };

const fn = {
  turismo: makeFunctionReference<
    'mutation',
    Quien & { lugarId: string; completa: boolean },
    Respuesta<{ recuerdo: RecuerdoTuristico }>
  >('progreso:turismo'),
  entrar: makeFunctionReference<
    'mutation',
    Quien & { nombre?: string; avatar?: Record<string, string>; creado?: boolean },
    PerfilServidor & Logros
  >('tienda:entrar'),
  comprar: makeFunctionReference<
    'mutation',
    Quien & { itemId: string; equipar?: boolean },
    Respuesta<{ perfil: PerfilServidor } & Logros>
  >('tienda:comprar'),
  equipar: makeFunctionReference<
    'mutation',
    Quien & { itemId: string },
    Respuesta<{ perfil: PerfilServidor } & Logros>
  >('tienda:equipar'),
  vestir: makeFunctionReference<
    'mutation',
    Quien & { avatar: Record<string, string> },
    Respuesta<{ perfil: PerfilServidor } & Logros>
  >('tienda:vestir'),
  abrir: makeFunctionReference<
    'mutation',
    Quien & { motor: string; etapa: number; juegoId?: string; modo?: Modo },
    Respuesta<{ id: string }>
  >('partidas:abrirPartida'),
  cerrar: makeFunctionReference<
    'mutation',
    Quien & { partidaId: string; puntos: number; estrellas: number; gano: boolean },
    Respuesta<
      { monedas: number; bono: number; xp: number; progreso: ProgresoJuegoServidor & { avance: boolean } } & Avance
    >
  >('partidas:cerrarPartida'),
  visitar: makeFunctionReference<'mutation', Quien & { deptId: string }, Respuesta<{ primera: boolean } & Avance>>(
    'progreso:visitar',
  ),
  recoger: makeFunctionReference<'mutation', Quien & { deptId: string }, Respuesta<Avance>>('progreso:recoger'),
  monedas: makeFunctionReference<'mutation', Quien & { cantidad: number }, Respuesta<{ pagadas: number } & Avance>>(
    'progreso:recogerMonedas',
  ),
  emote: makeFunctionReference<'mutation', Quien, Respuesta<{ cuenta: boolean } & Avance>>('progreso:registrarEmote'),
  cobrarMision: makeFunctionReference<
    'mutation',
    Quien & { misionId: string },
    Respuesta<{ premio: { monedas: number; xp: number } } & Avance>
  >('progreso:cobrarMision'),
  salir: makeFunctionReference<
    'mutation',
    Quien & { veh: string; de: string; a: string },
    Respuesta<{ viajeId: string; precio: number } & Avance>
  >('progreso:salirDeViaje'),
  llegar: makeFunctionReference<
    'mutation',
    Quien & { viajeId: string; bono: number },
    Respuesta<{ bono: number; motivo?: string } & Avance>
  >('progreso:llegarViaje'),
  gastar: makeFunctionReference<'mutation', Quien & { monto: number; concepto: string }, Respuesta<Avance>>(
    'progreso:gastar',
  ),
  subirAvance: makeFunctionReference<
    'mutation',
    Quien & AvanceLocal,
    Respuesta<{ visitas: number; recuerdos: number; juegos: number }>
  >('progreso:subirAvanceLocal'),
  crearCodigo: makeFunctionReference<'mutation', Quien, Respuesta<{ codigo: string; vence: number }>>(
    'cuentas:crearCodigoDispositivo',
  ),
  usarCodigo: makeFunctionReference<
    'mutation',
    Quien & { codigo: string; local?: AvanceLocal },
    Respuesta<{ nombre: string; resumen: ResumenFusion; perfil: PerfilServidor } & Avance>
  >('cuentas:usarCodigoDispositivo'),
  vincular: makeFunctionReference<'mutation', Quien, Respuesta<{ nueva: boolean; resumen: ResumenFusion | null }>>(
    'cuentas:vincularCuenta',
  ),
};
const consultas = {
  estado: makeFunctionReference<'query', Quien, EstadoServidor | null>('progreso:estado'),
  porJuego: makeFunctionReference<'query', Quien & { juegoId: string }, Clasificacion>('clasificacion:porJuego'),
  porDepto: makeFunctionReference<'query', Quien & { deptId: string }, Clasificacion>('clasificacion:porDepto'),
  miCuenta: makeFunctionReference<'query', Quien, MiCuenta | null>('cuentas:miCuenta'),
};

let memoria = '';
/** Secreto de invitado (32 bytes en hexadecimal). Si no hay localStorage dura lo que dure la pestaña. */
export function secretoInvitado() {
  try {
    const guardado = localStorage.getItem(LLAVE);
    if (guardado && /^[0-9a-f]{64}$/.test(guardado)) return guardado;
  } catch {
    /* sin almacenamiento */
  }
  if (!memoria) {
    const b = new Uint8Array(32);
    crypto.getRandomValues(b);
    memoria = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  try {
    localStorage.setItem(LLAVE, memoria);
  } catch {
    /* sin almacenamiento */
  }
  return memoria;
}

/**
 * Token de la cuenta de Clerk (MC-07). Lo pone `core/clerk.tsx` solo si la compilación trae
 * VITE_CLERK_PUBLISHABLE_KEY; sin eso es null y las llamadas van solo con el secreto de invitado.
 */
export const autenticacion: { token: (() => Promise<string | null>) | null } = { token: null };
async function conToken(c: ConvexHttpClient) {
  if (!autenticacion.token) return;
  const t = await autenticacion.token().catch(() => null);
  if (t) c.setAuth(t);
  else c.clearAuth();
}

const SIN_CONEXION: Fallo = { ok: false, motivo: 'sin-conexion' };
/** Espera tras un plazo vencido antes de volver a leer el perfil: la llamada vencida pudo aplicarse después. */
const RELEER_MS = 2500;
let cliente: ConvexHttpClient | null = null;
let releyendo = false;
/**
 * Qué hacer cuando una llamada vence: el store vuelve a leer el perfil (`entrar`) para que el saldo que se ve sea
 * el del servidor aunque la compra o el pago sí se hayan aplicado.
 */
export const alVencer: { releer: (() => Promise<unknown>) | null } = { releer: null };
function releerDespues() {
  if (releyendo || !alVencer.releer) return;
  releyendo = true;
  setTimeout(() => {
    void (alVencer.releer?.() ?? Promise.resolve()).finally(() => {
      releyendo = false;
    });
  }, RELEER_MS);
}
let cola: Promise<unknown> = Promise.resolve();
type Ref = (typeof fn)[keyof typeof fn];
/**
 * Llama una mutación en orden (una compra no se adelanta a la anterior) con plazo. Si no hay respuesta a
 * tiempo devuelve `null`: quien llama decide qué es seguro hacer (nunca inventar saldo).
 */
function llamar<F extends Ref>(ref: F, args: Omit<FunctionArgs<F>, 'invitado'>): Promise<FunctionReturnType<F> | null> {
  if (!URL_CONVEX) return Promise.resolve(null);
  cliente ??= new ConvexHttpClient(URL_CONVEX, { logger: false });
  const c = cliente;
  const turno = cola.then(async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await conToken(c);
      const r = await Promise.race([
        c.mutation(ref as FunctionReference<'mutation'>, { ...args, invitado: secretoInvitado() }, { skipQueue: true }),
        new Promise<null>((resolve) => {
          timer = setTimeout(() => resolve(null), PLAZO_MS);
        }),
      ]);
      // venció el plazo: la mutación pudo llegar igual; se relee el perfil (sin encadenar relecturas)
      if (r === null && ref !== fn.entrar) releerDespues();
      return r;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  });
  cola = turno;
  return turno as Promise<FunctionReturnType<F> | null>;
}
const conFallo = <T>(r: T | null): T | Fallo => r ?? SIN_CONEXION;
type RefConsulta = (typeof consultas)[keyof typeof consultas];
/** Una consulta con plazo, fuera de la cola de mutaciones. `null` si no hubo respuesta. */
async function consultar<F extends RefConsulta>(
  ref: F,
  args: Omit<FunctionArgs<F>, 'invitado'>,
): Promise<FunctionReturnType<F> | null> {
  if (!URL_CONVEX) return null;
  cliente ??= new ConvexHttpClient(URL_CONVEX, { logger: false });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await conToken(cliente);
    return await Promise.race([
      cliente.query(ref as FunctionReference<'query'>, { ...args, invitado: secretoInvitado() }),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), PLAZO_MS);
      }),
    ]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const servidor = {
  turismo: async (lugarId: string, completa: boolean) => conFallo(await llamar(fn.turismo, { lugarId, completa })),
  /** null si no hubo respuesta */
  entrar: (nombre: string | undefined, avatar: AvatarConfig, creado: boolean) =>
    llamar(fn.entrar, { ...(nombre === undefined ? {} : { nombre }), avatar: avatarTexto(avatar), creado }),
  comprar: async (itemId: string) => conFallo(await llamar(fn.comprar, { itemId, equipar: true })),
  equipar: async (itemId: string) => conFallo(await llamar(fn.equipar, { itemId })),
  vestir: async (avatar: Partial<AvatarConfig>) => conFallo(await llamar(fn.vestir, { avatar: avatarTexto(avatar) })),
  abrir: async (a: { motor: string; etapa: number; juegoId?: string; modo: Modo }) => {
    let r = conFallo(await llamar(fn.abrir, a));
    if (!r.ok && r.motivo === 'muy seguido') {
      const espera = (r.reintentarMs ?? 1000) + 50;
      await new Promise((resolve) => setTimeout(resolve, espera));
      r = conFallo(await llamar(fn.abrir, a));
    }
    return r;
  },
  cerrar: async (c: { partidaId: string; puntos: number; estrellas: number; gano: boolean }) =>
    conFallo(await llamar(fn.cerrar, c)),
  visitar: async (deptId: string) => conFallo(await llamar(fn.visitar, { deptId })),
  recoger: async (deptId: string) => conFallo(await llamar(fn.recoger, { deptId })),
  monedas: async (cantidad: number) => conFallo(await llamar(fn.monedas, { cantidad })),
  emote: async () => conFallo(await llamar(fn.emote, {})),
  cobrarMision: async (misionId: string) => conFallo(await llamar(fn.cobrarMision, { misionId })),
  salir: async (v: { veh: string; de: string; a: string }) => conFallo(await llamar(fn.salir, v)),
  llegar: async (v: { viajeId: string; bono: number }) => conFallo(await llamar(fn.llegar, v)),
  gastar: async (monto: number, concepto: string) => conFallo(await llamar(fn.gastar, { monto, concepto })),
  subirAvance: async (a: AvanceLocal) => conFallo(await llamar(fn.subirAvance, a)),
  /** MC-09: código de 8 letras para seguir en otro dispositivo */
  crearCodigo: async () => conFallo(await llamar(fn.crearCodigo, {})),
  /** MC-08, MC-09: este dispositivo entra a la cuenta del código; lo suyo se junta con ella */
  usarCodigo: async (codigo: string, local: AvanceLocal) => conFallo(await llamar(fn.usarCodigo, { codigo, local })),
  /** MC-07: une la cuenta de Clerk con el invitado de este dispositivo */
  vincular: async () => conFallo(await llamar(fn.vincular, {})),
  miCuenta: () => consultar(consultas.miCuenta, {}),
  /** null si no hubo respuesta; con respuesta `null` el invitado todavía no existe */
  estado: () => consultar(consultas.estado, {}),
  porJuego: (juegoId: string) => consultar(consultas.porJuego, { juegoId }),
  porDepto: (deptId: string) => consultar(consultas.porDepto, { deptId }),
};
/** El avatar sin campos vacíos, como lo acepta Convex (`Record<string, string>`). */
function avatarTexto(a: Partial<AvatarConfig>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(a)) if (typeof v === 'string') out[k] = v;
  return out;
}
