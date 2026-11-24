// Lo que comparten las mutaciones que mueven el avance (MC-15, MC-16): una «sesión» por llamada que junta lo que se
// paga, las misiones que avanzan y los logros que se ganan, y al final escribe el perfil una sola vez.
// Las cantidades salen de @mundo-catrucho/reglas; aquí solo se lee y se escribe.
import {
  avanzarMisiones,
  type EstadoLogros,
  type Evento,
  fechaHonduras,
  ganarXp,
  logrosNuevos,
  type MisionDia,
  misionesDelDia,
  misionesNuevas,
  PREMIO_PRIMERA_VISITA,
  type Premio,
  prendasTipicas,
} from '@mundo-catrucho/reglas';
import type { DataModelFromSchemaDefinition, GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import type { GenericId } from 'convex/values';
import { asegurarUsuario } from './identidad';
import type schema from './schema';

type Modelo = DataModelFromSchemaDefinition<typeof schema>;
export type Lectura = GenericQueryCtx<Modelo>;
export type Escritura = GenericMutationCtx<Modelo>;
type IdUsuario = GenericId<'usuarios'>;

export interface Saldo {
  monedas: number;
  xp: number;
  nivel: number;
}
export interface LogroPagado {
  id: string;
  monedas: number;
}
export interface Sesion {
  ctx: Escritura;
  usuarioId: IdUsuario;
  perfilId: GenericId<'perfiles'>;
  avatar: Record<string, unknown>;
  saldo: Saldo;
  /** niveles que subió en esta llamada */
  subidas: number;
  logros: LogroPagado[];
  misiones: { fecha: string; misiones: MisionDia[] } | null;
  ahora: number;
}

/** Abre la sesión de quien llama (lo crea si es nuevo). */
export async function sesion(
  ctx: Escritura,
  args: { invitado: string; nombre?: string; avatar?: Record<string, unknown> },
): Promise<Sesion> {
  const { usuario, perfil } = await asegurarUsuario(ctx, args);
  return {
    ctx,
    usuarioId: usuario._id,
    perfilId: perfil._id,
    avatar: perfil.avatar,
    saldo: { monedas: perfil.monedas, xp: perfil.xp, nivel: perfil.nivel },
    subidas: 0,
    logros: [],
    misiones: null,
    ahora: Date.now(),
  };
}

/** Suma un premio al saldo de la sesión; cada nivel nuevo paga su premio (`ganarXp`). */
export function pagar(s: Sesion, p: Premio) {
  const a = ganarXp({ nivel: s.saldo.nivel, xp: s.saldo.xp }, p.xp);
  s.saldo = { monedas: s.saldo.monedas + p.monedas + a.monedas, xp: a.xp, nivel: a.nivel };
  s.subidas += a.subidas;
}

// ------------------------------------------------------------------ contadores
export async function contadoresDe(ctx: Lectura, usuarioId: IdUsuario) {
  return ctx.db
    .query('contadores')
    .withIndex('por_usuario', (q) => q.eq('usuarioId', usuarioId))
    .unique();
}
/** Los contadores del jugador, creándolos la primera vez. */
export async function asegurarContadores(ctx: Escritura, usuarioId: IdUsuario) {
  const c = await contadoresDe(ctx, usuarioId);
  if (c) return c;
  const id = await ctx.db.insert('contadores', { usuarioId, entro: false, emotes: 0, migrado: false });
  const nuevo = await ctx.db.get(id);
  if (!nuevo) throw new Error('No se pudieron crear los contadores.');
  return nuevo;
}

// ------------------------------------------------------------------ misiones del día
/** Las misiones del día de Honduras: las del cron si ya corrió; si no, las mismas con la semilla de la fecha. */
export async function idsDelDia(ctx: Lectura, fecha: string) {
  const g = await ctx.db
    .query('misionesGlobales')
    .withIndex('por_fecha', (q) => q.eq('fecha', fecha))
    .first();
  return g?.ids ?? misionesDelDia(fecha);
}
/** Misiones de hoy del jugador (sin escribir nada si todavía no tiene fila). */
export async function misionesDeHoy(ctx: Lectura, usuarioId: IdUsuario, ahora: number) {
  const fecha = fechaHonduras(ahora);
  const fila = await ctx.db
    .query('misionesDia')
    .withIndex('por_usuario_fecha', (q) => q.eq('usuarioId', usuarioId).eq('fecha', fecha))
    .unique();
  return { fila, fecha, misiones: fila?.misiones ?? misionesNuevas(await idsDelDia(ctx, fecha)) };
}
/** Guarda las misiones de hoy (crea la fila del día la primera vez). */
export async function guardarMisiones(s: Sesion, misiones: MisionDia[]) {
  const hoy = await misionesDeHoy(s.ctx, s.usuarioId, s.ahora);
  if (hoy.fila) await s.ctx.db.patch(hoy.fila._id, { misiones });
  else await s.ctx.db.insert('misionesDia', { usuarioId: s.usuarioId, fecha: hoy.fecha, misiones });
  s.misiones = { fecha: hoy.fecha, misiones };
}
/** Avanza las misiones de hoy con lo que hizo el jugador. */
export async function avanzar(s: Sesion, eventos: Evento[]) {
  const hoy = s.misiones ?? (await misionesDeHoy(s.ctx, s.usuarioId, s.ahora));
  let misiones = hoy.misiones,
    cambio = false;
  for (const ev of eventos) {
    const r = avanzarMisiones(misiones, ev);
    misiones = r.misiones;
    cambio ||= r.cambio;
  }
  if (cambio) await guardarMisiones(s, misiones);
  else s.misiones = { fecha: hoy.fecha, misiones };
}

// ------------------------------------------------------------------ visitas
/** Registra la visita a un departamento. La primera paga `PREMIO_PRIMERA_VISITA` y cuenta para la misión. */
export async function visitar(s: Sesion, deptId: string) {
  const ya = await s.ctx.db
    .query('visitas')
    .withIndex('por_usuario', (q) => q.eq('usuarioId', s.usuarioId).eq('deptId', deptId))
    .first();
  if (ya) return false;
  await s.ctx.db.insert('visitas', { usuarioId: s.usuarioId, deptId, recuerdo: false });
  pagar(s, PREMIO_PRIMERA_VISITA);
  await avanzar(s, [{ tipo: 'visit', cantidad: 1 }]);
  return true;
}

// ------------------------------------------------------------------ logros
export async function logrosDe(ctx: Lectura, usuarioId: IdUsuario) {
  const filas = await ctx.db
    .query('logros')
    .withIndex('por_usuario', (q) => q.eq('usuarioId', usuarioId))
    .collect();
  return filas.map((f) => f.logroId);
}
async function estadoLogros(s: Sesion): Promise<EstadoLogros> {
  const { ctx, usuarioId } = s;
  const visitas = await ctx.db
    .query('visitas')
    .withIndex('por_usuario', (q) => q.eq('usuarioId', usuarioId))
    .collect();
  const compras = await ctx.db
    .query('inventario')
    .withIndex('por_usuario', (q) => q.eq('usuarioId', usuarioId))
    .collect();
  const c = await contadoresDe(ctx, usuarioId);
  return {
    entro: c?.entro ?? false,
    visitas: visitas.length,
    recuerdos: visitas.filter((v) => v.recuerdo).length,
    compras: compras.length,
    tipicas: prendasTipicas(s.avatar),
    nivel: s.saldo.nivel,
    emotes: c?.emotes ?? 0,
  };
}
/**
 * Da los logros que ya se cumplen (una sola vez cada uno). `pagar: false` los marca sin pagar: es para el avance
 * que sube del navegador, que no da premios.
 */
export async function revisarLogros(
  s: Sesion,
  { partida, pagarlos = true }: { partida?: Parameters<typeof logrosNuevos>[0]['partida']; pagarlos?: boolean } = {},
) {
  const ya = await logrosDe(s.ctx, s.usuarioId);
  for (const l of logrosNuevos({ ya, estado: await estadoLogros(s), partida })) {
    await s.ctx.db.insert('logros', { usuarioId: s.usuarioId, logroId: l.id, ...(pagarlos ? {} : { sinPago: true }) });
    if (!pagarlos) continue;
    pagar(s, { monedas: l.coins, xp: 0 });
    s.logros.push({ id: l.id, monedas: l.coins });
  }
}

/** Cierra la sesión: revisa logros, guarda el saldo y devuelve lo que el juego necesita mostrar. */
export async function terminar(s: Sesion, opciones: Parameters<typeof revisarLogros>[1] = {}) {
  await revisarLogros(s, opciones);
  await s.ctx.db.patch(s.perfilId, s.saldo);
  const misiones = s.misiones ?? (await misionesDeHoy(s.ctx, s.usuarioId, s.ahora));
  return {
    saldo: s.saldo,
    subidas: s.subidas,
    logros: s.logros,
    misiones: { fecha: misiones.fecha, misiones: misiones.misiones },
  };
}
