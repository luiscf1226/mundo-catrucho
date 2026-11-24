// Cuentas (MC-07, MC-08, MC-09): código para seguir en otro dispositivo y la fusión de dos cuentas sin perder nada
// ni pagar dos veces el mismo premio. Convex aplica `fusionarCuentas` al usar un código o al entrar con Clerk.
import { ALFABETO_CODIGO } from './chat.ts';
import { ganarXp, PREMIO_PRIMERA_VISITA, PREMIO_RECUERDO, PREMIOS, xpParaNivel } from './premios.ts';
import { logroPorId, MISIONES, MONEDAS_SUELTAS } from './progreso.ts';
import { articuloPorId, MONEDAS_INICIALES } from './tienda.ts';

// ------------------------------------------------------------------ código de dispositivo
export const CODIGO_DISPOSITIVO = {
  /** 8 letras de 32: más de un billón de códigos, para que adivinar uno no salga a cuenta */
  largo: 8,
  /** cuánto vale (y se usa una sola vez) */
  vigenciaMs: 10 * 60_000,
} as const;
/** Código nuevo a partir de bytes aleatorios (cada byte da una letra sin sesgo: 256 es múltiplo de 32). */
export function codigoDispositivoDe(bytes: ArrayLike<number>): string {
  let s = '';
  for (let i = 0; i < CODIGO_DISPOSITIVO.largo; i++) s += ALFABETO_CODIGO[(bytes[i] ?? 0) % ALFABETO_CODIGO.length];
  return s;
}
/** Código en mayúsculas, sin espacios ni guiones, o null si no puede ser un código de dispositivo. */
export function normalizarCodigoDispositivo(c: unknown): string | null {
  if (typeof c !== 'string' || c.length > 40) return null;
  const k = c.replace(/[\s-]/g, '').toUpperCase();
  if (k.length !== CODIGO_DISPOSITIVO.largo) return null;
  for (const ch of k) if (!ALFABETO_CODIGO.includes(ch)) return null;
  return k;
}
/** Para leerlo en voz alta o copiarlo: `ABCD-EFGH`. */
export const mostrarCodigoDispositivo = (c: string) => `${c.slice(0, 4)}-${c.slice(4)}`;

/**
 * Cuentas que una cuenta puede absorber por día de Honduras. Los topes del día (monedas sueltas, misiones, ritmo de
 * partidas) son por cuenta: sin este límite, muchos invitados juntados en una multiplicarían esos topes.
 */
export const FUSIONES_POR_DIA = 2;
export interface EstadoFusiones {
  fecha: string;
  n: number;
}
/** ¿Puede absorber otra cuenta hoy? Devuelve el estado nuevo si sí. */
export function decidirFusion(prev: EstadoFusiones | undefined, fecha: string): EstadoFusiones | null {
  const n = prev && prev.fecha === fecha ? prev.n : 0;
  return n < FUSIONES_POR_DIA ? { fecha, n: n + 1 } : null;
}

// ------------------------------------------------------------------ fusión de cuentas
export interface JuegoCuenta {
  juegoId: string;
  etapa: number;
  estrellas: number[];
  mejor: number;
  veces: number;
}
/** Lo que el servidor sabe de una cuenta, ya validado (no viene del navegador). */
export interface CuentaFusion {
  monedas: number;
  xp: number;
  nivel: number;
  /** departamentos visitados (la primera visita pagó) */
  visitas: readonly string[];
  /** recuerdos recogidos (cada uno pagó) */
  recuerdos: readonly string[];
  logros: readonly string[];
  /** lo comprado (sin lo gratis) */
  comprados: readonly string[];
  /** misiones cobradas por día de Honduras */
  misiones: readonly { fecha: string; cobradas: readonly string[] }[];
  /** monedas sueltas pagadas en el día de Honduras guardado */
  sueltas: { fecha: string; hoy: number } | null;
  juegos: readonly JuegoCuenta[];
}
export interface Fusion {
  monedas: number;
  xp: number;
  nivel: number;
  visitas: string[];
  recuerdos: string[];
  logros: string[];
  comprados: string[];
  /** prendas de la otra cuenta que se devuelven (a su precio) porque se pagaron con premios repetidos */
  devueltas: string[];
  juegos: JuegoCuenta[];
  sueltas: { fecha: string; hoy: number } | null;
  /** lo que trae la otra cuenta y lo que se descuenta por premios repetidos (para mostrarlo) */
  resumen: {
    /** monedas que suma la fusión al saldo de la cuenta que se queda (puede ser negativo) */
    monedas: number;
    descuento: number;
    reembolso: number;
    devueltas: number;
    prendas: number;
    juegos: number;
    visitas: number;
  };
}

/** XP juntada desde el nivel 1 (la de los niveles ya pasados más la del nivel actual). */
export function xpTotal(nivel: number, xp: number): number {
  let t = Math.max(0, xp);
  for (let n = 1; n < nivel; n++) t += xpParaNivel(n);
  return t;
}
const mejorJuego = (a: JuegoCuenta | undefined, b: JuegoCuenta): JuegoCuenta => {
  if (!a) return { ...b, estrellas: [...b.estrellas] };
  const n = Math.max(a.estrellas.length, b.estrellas.length);
  return {
    juegoId: a.juegoId,
    etapa: Math.max(a.etapa, b.etapa),
    estrellas: Array.from({ length: n }, (_, i) => Math.max(a.estrellas[i] ?? 0, b.estrellas[i] ?? 0)),
    mejor: Math.max(a.mejor, b.mejor),
    veces: a.veces + b.veces,
  };
};

/**
 * Junta la cuenta `otra` en la cuenta `queda`. Nada se pierde: monedas, ropa comprada, etapas, estrellas, marcas,
 * visitas, recuerdos y logros pasan a la que queda. Pero un premio que las dos cobraron se paga una sola vez: la
 * bienvenida de la otra, la primera visita y el recuerdo de un mismo departamento, el mismo logro, la misma misión
 * del mismo día y las monedas sueltas que pasen del tope del día. La XP se suma y el nivel sale de la suma; los
 * premios por subir de nivel se ajustan a ese nivel. Una prenda comprada en las dos se devuelve (se pagó dos veces).
 * Si lo repetido ya se gastó y el saldo quedaría negativo, se devuelven prendas que solo tenía la otra (las más caras
 * primero) hasta cubrirlo: lo comprado con premios repetidos no se queda gratis. Solo si no hay qué devolver (se gastó
 * en pasajes o comida) el saldo queda en 0.
 */
export function fusionarCuentas(queda: CuentaFusion, otra: CuentaFusion): Fusion {
  const enAmbas = <T>(a: readonly T[], b: readonly T[]) => [...new Set(b)].filter((x) => a.includes(x));
  const union = <T>(a: readonly T[], b: readonly T[]) => [...new Set([...a, ...b])];
  // premios que las dos cuentas cobraron: se descuentan de lo que trae la otra
  let descuento = MONEDAS_INICIALES,
    descuentoXp = 0;
  const visitasRep = enAmbas(queda.visitas, otra.visitas);
  descuento += visitasRep.length * PREMIO_PRIMERA_VISITA.monedas;
  descuentoXp += visitasRep.length * PREMIO_PRIMERA_VISITA.xp;
  const recuerdosRep = enAmbas(queda.recuerdos, otra.recuerdos);
  descuento += recuerdosRep.length * PREMIO_RECUERDO.monedas;
  descuentoXp += recuerdosRep.length * PREMIO_RECUERDO.xp;
  for (const id of enAmbas(queda.logros, otra.logros)) descuento += logroPorId(id)?.coins ?? 0;
  for (const dia of otra.misiones) {
    const mio = queda.misiones.find((m) => m.fecha === dia.fecha);
    if (!mio) continue;
    for (const id of enAmbas(mio.cobradas, dia.cobradas)) {
      const m = MISIONES.find((x) => x.id === id);
      descuento += m?.coins ?? 0;
      descuentoXp += m?.xp ?? 0;
    }
  }
  let sueltas = queda.sueltas ?? otra.sueltas;
  if (queda.sueltas && otra.sueltas && queda.sueltas.fecha === otra.sueltas.fecha) {
    const suma = queda.sueltas.hoy + otra.sueltas.hoy;
    descuento += Math.max(0, suma - MONEDAS_SUELTAS.porDia) * PREMIOS.world.coinPickup;
    sueltas = { fecha: queda.sueltas.fecha, hoy: Math.min(MONEDAS_SUELTAS.porDia, suma) };
  } else if (queda.sueltas && otra.sueltas && otra.sueltas.fecha > queda.sueltas.fecha) sueltas = otra.sueltas;
  const reembolso = enAmbas(queda.comprados, otra.comprados).reduce((s, id) => s + (articuloPorId(id)?.price ?? 0), 0);

  // niveles: la XP de las dos (menos la de premios repetidos) decide el nivel; los premios por subir que ya se
  // pagaron en las dos se ajustan a los que da ese nivel
  const total = Math.max(0, xpTotal(queda.nivel, queda.xp) + xpTotal(otra.nivel, otra.xp) - descuentoXp);
  const nuevo = ganarXp({ nivel: 1, xp: 0 }, total);
  const ajusteNiveles = (nuevo.nivel - 1 - (queda.nivel - 1) - (otra.nivel - 1)) * PREMIOS.levelUp.coins;

  const trae = otra.monedas - descuento + reembolso + ajusteNiveles;
  let saldo = queda.monedas + trae;
  const devueltas: string[] = [];
  const devolvibles = [...new Set(otra.comprados)]
    .filter((id) => !queda.comprados.includes(id))
    .sort((a, b) => (articuloPorId(b)?.price ?? 0) - (articuloPorId(a)?.price ?? 0));
  for (const id of devolvibles) {
    if (saldo >= 0) break;
    devueltas.push(id);
    saldo += articuloPorId(id)?.price ?? 0;
  }
  saldo = Math.max(0, saldo);

  const juegos = new Map(queda.juegos.map((j) => [j.juegoId, j] as const));
  for (const j of otra.juegos) juegos.set(j.juegoId, mejorJuego(juegos.get(j.juegoId), j));
  const comprados = union(queda.comprados, otra.comprados).filter((id) => !devueltas.includes(id));
  const visitas = union(queda.visitas, otra.visitas);
  return {
    monedas: saldo,
    xp: nuevo.xp,
    nivel: nuevo.nivel,
    visitas,
    recuerdos: union(queda.recuerdos, otra.recuerdos),
    logros: union(queda.logros, otra.logros),
    comprados,
    devueltas,
    juegos: [...juegos.values()],
    sueltas,
    resumen: {
      monedas: saldo - queda.monedas,
      descuento,
      reembolso,
      devueltas: devueltas.length,
      prendas: comprados.length - queda.comprados.length,
      juegos: otra.juegos.length,
      visitas: visitas.length - queda.visitas.length,
    },
  };
}
