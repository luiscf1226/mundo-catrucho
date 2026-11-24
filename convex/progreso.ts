// Avance fuera de las partidas (MC-15, MC-16): visitas, recuerdos, monedas sueltas, emotes, misiones del día,
// viajes y el avance que trae el navegador la primera vez (MC-08). Cada mutación valida con @mundo-catrucho/reglas
// y responde el saldo del servidor, los logros que pagó y las misiones de hoy.
import {
  decidirCobroMision,
  decidirLlegada,
  decidirMonedas,
  decidirSalida,
  emoteCuenta,
  esDepto,
  gastoValido,
  limpiarAvanceLocal,
  PREMIO_RECUERDO,
  topeBonoDia,
} from '@mundo-catrucho/reglas';
import {
  type DataModelFromSchemaDefinition,
  type GenericMutationCtx,
  internalMutationGeneric,
  type MutationBuilder,
  mutationGeneric,
  type QueryBuilder,
  queryGeneric,
} from 'convex/server';
import { type GenericId, v } from 'convex/values';
import { turismoById } from '../docs/generador/turismo';
import {
  asegurarContadores,
  avanzar,
  contadoresDe,
  guardarMisiones,
  logrosDe,
  misionesDeHoy,
  pagar,
  visitar as registrarVisita,
  revisarLogros,
  sesion,
  terminar,
} from './avance';
import { quien, usuarioActual, usuarioDe } from './identidad';
import { juegosDelCatalogo } from './partidas';
import type schema from './schema';

type Modelo = DataModelFromSchemaDefinition<typeof schema>;
const query: QueryBuilder<Modelo, 'public'> = queryGeneric;
const mutation: MutationBuilder<Modelo, 'public'> = mutationGeneric;
const internalMutation: MutationBuilder<Modelo, 'internal'> = internalMutationGeneric;
type Escritura = GenericMutationCtx<Modelo>;

/** Todo el avance de quien llama, o null si nunca entró. */
export const estado = query({
  args: quien,
  handler: async (ctx, args) => {
    const actual = await usuarioActual(ctx, args);
    if (!actual) return null;
    const usuarioId = actual.usuario._id;
    const visitas = await ctx.db
      .query('visitas')
      .withIndex('por_usuario', (q) => q.eq('usuarioId', usuarioId))
      .collect();
    const juegos = await ctx.db
      .query('progresoJuegos')
      .withIndex('por_usuario_juego', (q) => q.eq('usuarioId', usuarioId))
      .collect();
    const hoy = await misionesDeHoy(ctx, usuarioId, Date.now());
    return {
      visitas: visitas.map((x) => x.deptId),
      turismo: visitas.flatMap((x) => x.turismo ?? []),
      recuerdos: visitas.filter((x) => x.recuerdo).map((x) => x.deptId),
      logros: await logrosDe(ctx, usuarioId),
      misiones: { fecha: hoy.fecha, misiones: hoy.misiones },
      juegos: juegos.map((j) => ({
        juegoId: j.juegoId,
        etapa: j.etapa,
        estrellas: j.estrellas,
        mejor: j.mejor,
        veces: j.veces,
      })),
      migrado: (await contadoresDe(ctx, usuarioId))?.migrado ?? false,
    };
  },
});

/** Llegó a un departamento. La primera vez paga la visita. */
export const visitar = mutation({
  args: { ...quien, deptId: v.string() },
  handler: async (ctx, args) => {
    if (!esDepto(args.deptId)) return { ok: false as const, motivo: 'no' };
    const s = await sesion(ctx, args);
    const primera = await registrarVisita(s, args.deptId);
    return { ok: true as const, primera, ...(await terminar(s)) };
  },
});

/** Recogió el recuerdo de un departamento: tiene que haberlo visitado y paga una sola vez. */
export const recoger = mutation({
  args: { ...quien, deptId: v.string() },
  handler: async (ctx, args) => {
    const s = await sesion(ctx, args);
    const visita = await ctx.db
      .query('visitas')
      .withIndex('por_usuario', (q) => q.eq('usuarioId', s.usuarioId).eq('deptId', args.deptId))
      .first();
    if (!visita) return { ok: false as const, motivo: 'sin-visita' };
    if (visita.recuerdo) return { ok: false as const, motivo: 'ya' };
    await ctx.db.patch(visita._id, { recuerdo: true });
    pagar(s, PREMIO_RECUERDO);
    await avanzar(s, [{ tipo: 'collect', cantidad: 1 }]);
    return { ok: true as const, ...(await terminar(s)) };
  },
});

/** Turismo no paga premios: valida el lugar, la visita y la secuencia; repetir converge al mismo recuerdo. */
export const turismo = mutation({
  args: { ...quien, lugarId: v.string(), completa: v.boolean() },
  handler: async (ctx, args) => {
    const lugar = turismoById(args.lugarId);
    if (!lugar) return { ok: false as const, motivo: 'lugar' };
    const s = await sesion(ctx, args);
    const visita = await ctx.db
      .query('visitas')
      .withIndex('por_usuario', (q) => q.eq('usuarioId', s.usuarioId).eq('deptId', lugar.dept))
      .first();
    if (!visita) return { ok: false as const, motivo: 'sin-visita' };
    const recuerdos = visita.turismo ?? [];
    const previo = recuerdos.find((x) => x.id === lugar.id);
    if (args.completa && !previo) return { ok: false as const, motivo: 'sin-descubrir' };
    const recuerdo = { id: lugar.id, completa: !!previo?.completa || args.completa };
    await ctx.db.patch(visita._id, { turismo: [...recuerdos.filter((x) => x.id !== lugar.id), recuerdo] });
    return { ok: true as const, recuerdo };
  },
});

/** Monedas sueltas del mundo, en tandas. Paga lo que quepa en el ritmo y en el tope del día. */
export const recogerMonedas = mutation({
  args: { ...quien, cantidad: v.number() },
  handler: async (ctx, args) => {
    const s = await sesion(ctx, args),
      c = await asegurarContadores(ctx, s.usuarioId);
    const r = decidirMonedas(c.monedas ?? null, { ahora: s.ahora, pedidas: args.cantidad });
    await ctx.db.patch(c._id, { monedas: r.estado });
    if (r.pagadas > 0) {
      pagar(s, { monedas: r.monedas, xp: 0 });
      await avanzar(s, [{ tipo: 'pickup', cantidad: r.pagadas }]);
    }
    return { ok: true as const, pagadas: r.pagadas, ...(await terminar(s)) };
  },
});

/** Usó un emote. Cuenta para logros y misiones con pausa entre uno y otro. */
export const registrarEmote = mutation({
  args: quien,
  handler: async (ctx, args) => {
    const s = await sesion(ctx, args),
      c = await asegurarContadores(ctx, s.usuarioId);
    const cuenta = emoteCuenta(c.ultimoEmote, s.ahora);
    if (cuenta) {
      await ctx.db.patch(c._id, { emotes: c.emotes + 1, ultimoEmote: s.ahora });
      await avanzar(s, [{ tipo: 'emote', cantidad: 1 }]);
    }
    return { ok: true as const, cuenta, ...(await terminar(s)) };
  },
});

/** Cobra una misión de hoy: tiene que estar completa y sin cobrar. */
export const cobrarMision = mutation({
  args: { ...quien, misionId: v.string() },
  handler: async (ctx, args) => {
    const s = await sesion(ctx, args),
      hoy = await misionesDeHoy(ctx, s.usuarioId, s.ahora);
    const c = decidirCobroMision(hoy.misiones, args.misionId);
    if (!c.ok) {
      s.misiones = { fecha: hoy.fecha, misiones: hoy.misiones };
      return { ok: false as const, motivo: c.motivo, ...(await terminar(s)) };
    }
    await guardarMisiones(s, c.misiones);
    pagar(s, c.premio);
    return { ok: true as const, premio: c.premio, ...(await terminar(s)) };
  },
});

// ------------------------------------------------------------------ viajes
/** Sale de viaje: cobra el pasaje de `PASAJES` y guarda la hora de salida. Un viaje anterior queda abandonado. */
export const salirDeViaje = mutation({
  args: { ...quien, veh: v.string(), de: v.string(), a: v.string() },
  handler: async (ctx, args) => {
    const s = await sesion(ctx, args);
    const d = decidirSalida({ veh: args.veh, de: args.de, a: args.a, saldo: s.saldo.monedas });
    if (!d.ok) return { ok: false as const, motivo: d.motivo, falta: d.falta, saldo: s.saldo };
    const abiertos = await ctx.db
      .query('viajes')
      .withIndex('por_usuario_estado', (q) => q.eq('usuarioId', s.usuarioId).eq('estado', 'en-camino'))
      .collect();
    for (const x of abiertos) await ctx.db.patch(x._id, { estado: 'abandonado' });
    const id = await ctx.db.insert('viajes', {
      usuarioId: s.usuarioId,
      veh: args.veh,
      de: args.de,
      a: args.a,
      precio: d.precio,
      inicio: s.ahora,
      estado: 'en-camino',
    });
    s.saldo = { ...s.saldo, monedas: d.saldo };
    return { ok: true as const, viajeId: id, precio: d.precio, ...(await terminar(s)) };
  },
});

/** Llega del viaje y cierra el viaje. El bono no se paga hasta que la sala del viaje firme lo que pasó. */
export const llegarViaje = mutation({
  args: { ...quien, viajeId: v.id('viajes'), bono: v.number() },
  handler: async (ctx, args) => {
    const s = await sesion(ctx, args),
      viaje = await ctx.db.get(args.viajeId);
    if (!viaje || viaje.usuarioId !== s.usuarioId) return { ok: false as const, motivo: 'ajeno' };
    if (viaje.estado !== 'en-camino') return { ok: false as const, motivo: 'cerrado' };
    const d = decidirLlegada({ inicio: viaje.inicio, ahora: s.ahora });
    let bono = d.bono,
      motivo = d.motivo;
    if (bono > 0) {
      const c = await asegurarContadores(ctx, s.usuarioId),
        tope = topeBonoDia(c.bonosViaje ?? null, { ahora: s.ahora, bono });
      if (tope.bono < bono) motivo = 'tope del día';
      bono = tope.bono;
      await ctx.db.patch(c._id, { bonosViaje: tope.estado });
    }
    await ctx.db.patch(viaje._id, { estado: 'llego', llegada: s.ahora, bono });
    if (bono > 0) pagar(s, { monedas: bono, xp: 0 });
    return { ok: true as const, bono, motivo, ...(await terminar(s)) };
  },
});

/** Gastos sueltos del camino (comida, peaje). Gastar nunca da nada. */
export const gastar = mutation({
  args: { ...quien, monto: v.number(), concepto: v.string() },
  handler: async (ctx, args) => {
    const s = await sesion(ctx, args);
    if (!gastoValido(args.monto, s.saldo.monedas)) return { ok: false as const, motivo: 'no', saldo: s.saldo };
    s.saldo = { ...s.saldo, monedas: s.saldo.monedas - args.monto };
    return { ok: true as const, ...(await terminar(s)) };
  },
});

// ------------------------------------------------------------------ avance del navegador (MC-08)
const juegoLocal = v.object({
  juegoId: v.string(),
  etapa: v.optional(v.number()),
  stars: v.optional(v.array(v.number())),
  veces: v.optional(v.number()),
});
/** Lo que manda el navegador de su avance guardado (MC-08). */
export const avanceLocal = {
  visitados: v.array(v.string()),
  recuerdos: v.array(v.string()),
  juegos: v.array(juegoLocal),
  turismo: v.optional(v.array(v.object({ id: v.string(), completa: v.boolean() }))),
};
type AvanceLocal = {
  visitados: string[];
  recuerdos: string[];
  juegos: { juegoId: string; etapa?: number; stars?: number[]; veces?: number }[];
  turismo?: { id: string; completa: boolean }[];
};
/** ¿Cabe en lo que se acepta? (el navegador no puede mandar listas enormes) */
export const avanceLocalCabe = (a: AvanceLocal) =>
  a.visitados.length <= 100 && a.recuerdos.length <= 100 && a.juegos.length <= 2000 && (a.turismo?.length ?? 0) <= 200;

/**
 * Junta el avance del navegador con el de la cuenta, sin pagar nada: visitas, recuerdos y turismo de departamentos
 * que existen y cuántas veces jugó cada juego del catálogo (las etapas no: solo una partida validada desbloquea).
 * Lo que ya tenía la cuenta no baja. Lo usan `subirAvanceLocal` y el código de otro dispositivo (`cuentas.ts`).
 */
export async function guardarAvanceLocal(ctx: Escritura, usuarioId: GenericId<'usuarios'>, args: AvanceLocal) {
  const catalogo = await juegosDelCatalogo(ctx);
  const limpio = limpiarAvanceLocal(
    {
      visitados: args.visitados,
      recuerdos: args.recuerdos,
      juegos: Object.fromEntries(args.juegos.map((j) => [j.juegoId, j])),
    },
    (id) => catalogo.get(id)?.etapas ?? null,
  );
  for (const deptId of limpio.visitas) {
    const recuerdo = limpio.recuerdos.includes(deptId);
    const ya = await ctx.db
      .query('visitas')
      .withIndex('por_usuario', (q) => q.eq('usuarioId', usuarioId).eq('deptId', deptId))
      .first();
    if (!ya)
      await ctx.db.insert('visitas', {
        usuarioId,
        deptId,
        recuerdo,
        visitaLocal: true,
        ...(recuerdo ? { recuerdoLocal: true } : {}),
      });
    else if (recuerdo && !ya.recuerdo) await ctx.db.patch(ya._id, { recuerdo: true, recuerdoLocal: true });
  }
  for (const recuerdo of args.turismo ?? []) {
    const lugar = turismoById(recuerdo.id);
    if (!lugar || !limpio.visitas.includes(lugar.dept)) continue;
    const visita = await ctx.db
      .query('visitas')
      .withIndex('por_usuario', (q) => q.eq('usuarioId', usuarioId).eq('deptId', lugar.dept))
      .first();
    if (!visita) continue;
    const previos = visita.turismo ?? [],
      anterior = previos.find((x) => x.id === lugar.id);
    await ctx.db.patch(visita._id, {
      turismo: [
        ...previos.filter((x) => x.id !== lugar.id),
        { id: lugar.id, completa: recuerdo.completa || !!anterior?.completa },
      ],
    });
  }
  for (const j of limpio.juegos) {
    const prev = await ctx.db
      .query('progresoJuegos')
      .withIndex('por_usuario_juego', (q) => q.eq('usuarioId', usuarioId).eq('juegoId', j.juegoId))
      .unique();
    if (!prev) {
      await ctx.db.insert('progresoJuegos', { usuarioId, ...j, mejor: 0 });
      continue;
    }
    const n = Math.max(prev.estrellas.length, j.estrellas.length);
    await ctx.db.patch(prev._id, {
      etapa: Math.max(prev.etapa, j.etapa),
      estrellas: Array.from({ length: n }, (_, i) => Math.max(prev.estrellas[i] ?? 0, j.estrellas[i] ?? 0)),
      veces: Math.max(prev.veces, j.veces),
    });
  }
  return limpio;
}

/**
 * La primera vez que un invitado entra con avance guardado en el navegador, sube visitas, recuerdos y cuántas
 * veces jugó cada juego (las etapas no: solo una partida validada desbloquea). No paga nada: los logros que ya
 * cumpla quedan marcados sin pagar, y las marcas no suben (la clasificación es solo de partidas validadas). Una
 * sola vez por jugador.
 */
export const subirAvanceLocal = mutation({
  args: { ...quien, ...avanceLocal },
  handler: async (ctx, args) => {
    const s = await sesion(ctx, args),
      c = await asegurarContadores(ctx, s.usuarioId);
    if (c.migrado) return { ok: false as const, motivo: 'ya' };
    if (!avanceLocalCabe(args)) return { ok: false as const, motivo: 'demasiado' };
    const limpio = await guardarAvanceLocal(ctx, s.usuarioId, args);
    await ctx.db.patch(c._id, { migrado: true });
    await revisarLogros(s, { pagarlos: false });
    return {
      ok: true as const,
      visitas: limpio.visitas.length,
      recuerdos: limpio.recuerdos.length,
      juegos: limpio.juegos.length,
    };
  },
});

// ------------------------------------------------------------------ administración
/**
 * Borra a un invitado y todo lo suyo (con las llaves de sus otros dispositivos). Solo con permisos de administrador (`npx convex run`); lo usan las pruebas
 * para no llenar la clasificación de desarrollo.
 */
export const olvidarInvitado = internalMutation({
  args: quien,
  handler: async (ctx, args) => {
    const usuario = await usuarioDe(ctx, args);
    if (!usuario) return 0;
    const id = usuario._id;
    const viajesCompartidos = await ctx.db.query('viajesCompartidos').collect();
    for (const viaje of viajesCompartidos)
      if (viaje.jugadores.includes(id)) {
        const jugadores = viaje.jugadores.filter((j) => j !== id);
        if (jugadores.length) await ctx.db.patch(viaje._id, { jugadores });
        else await ctx.db.delete(viaje._id);
      }
    const filas = [
      ...(await ctx.db
        .query('aperturas')
        .withIndex('por_usuario', (q) => q.eq('usuarioId', id))
        .collect()),
      ...(await ctx.db
        .query('perfiles')
        .withIndex('por_usuario', (q) => q.eq('usuarioId', id))
        .collect()),
      ...(await ctx.db
        .query('inventario')
        .withIndex('por_usuario', (q) => q.eq('usuarioId', id))
        .collect()),
      ...(await ctx.db
        .query('progresoJuegos')
        .withIndex('por_usuario_juego', (q) => q.eq('usuarioId', id))
        .collect()),
      ...(await ctx.db
        .query('visitas')
        .withIndex('por_usuario', (q) => q.eq('usuarioId', id))
        .collect()),
      ...(await ctx.db
        .query('misionesDia')
        .withIndex('por_usuario_fecha', (q) => q.eq('usuarioId', id))
        .collect()),
      ...(await ctx.db
        .query('logros')
        .withIndex('por_usuario', (q) => q.eq('usuarioId', id))
        .collect()),
      ...(await ctx.db
        .query('marcas')
        .withIndex('por_usuario_juego', (q) => q.eq('usuarioId', id))
        .collect()),
      ...(await ctx.db
        .query('contadores')
        .withIndex('por_usuario', (q) => q.eq('usuarioId', id))
        .collect()),
      ...(await ctx.db
        .query('viajes')
        .withIndex('por_usuario_estado', (q) => q.eq('usuarioId', id))
        .collect()),
      ...(await ctx.db
        .query('partidas')
        .withIndex('por_dueno_estado', (q) => q.eq('dueno', id))
        .collect()),
      ...(await ctx.db
        .query('vinculos')
        .withIndex('por_usuario', (q) => q.eq('usuarioId', id))
        .collect()),
      ...(await ctx.db
        .query('codigosDispositivo')
        .withIndex('por_usuario', (q) => q.eq('usuarioId', id))
        .collect()),
    ];
    for (const f of filas) await ctx.db.delete(f._id);
    await ctx.db.delete(id);
    return filas.length + 1;
  },
});
