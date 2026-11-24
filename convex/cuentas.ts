// Cuentas (MC-07, MC-08, MC-09). Una cuenta puede tener varias llaves (`vinculos`): el invitado de cada dispositivo
// que usó un código y, cuando haya llaves de Clerk, la cuenta de Clerk. Al juntar dos cuentas nada se pierde y ningún
// premio se paga dos veces (`fusionarCuentas` de @mundo-catrucho/reglas).
//
// - `crearCodigoDispositivo`: 8 letras, un solo uso, vence a los 10 min. Se guarda solo su hash.
// - `usarCodigoDispositivo`: el otro dispositivo entra a esta cuenta; lo que tenía (en Convex y en el navegador) se
//   junta con ella. Su secreto de invitado no cambia ni viaja: solo queda vinculado.
// - `vincularCuenta`: con Clerk (token en la llamada), la cuenta de Clerk se une al invitado de este dispositivo o,
//   si ya tenía cuenta, el invitado se junta con ella.
import {
  CODIGO_DISPOSITIVO,
  type CuentaFusion,
  codigoDispositivoDe,
  decidirFusion,
  fechaHonduras,
  fusionarCuentas,
  MONEDAS_INICIALES,
  mostrarCodigoDispositivo,
  normalizarCodigoDispositivo,
  puedeProbarCodigo,
  sumarFalloCodigo,
} from '@mundo-catrucho/reglas';
import {
  type DataModelFromSchemaDefinition,
  type GenericMutationCtx,
  type GenericQueryCtx,
  type MutationBuilder,
  mutationGeneric,
  type QueryBuilder,
  queryGeneric,
} from 'convex/server';
import { type GenericId, v } from 'convex/values';
import { asegurarContadores, contadoresDe, revisarLogros, type Sesion, sesion, terminar } from './avance';
import {
  asegurarUsuario,
  compradosDe,
  crearCuenta,
  quien,
  tokenCuenta,
  tokenDe,
  usuarioActual,
  usuarioDe,
  usuarioPorToken,
  vista,
} from './identidad';
import { avanceLocal, avanceLocalCabe, guardarAvanceLocal } from './progreso';
import type schema from './schema';

declare const crypto: {
  getRandomValues(b: Uint8Array): Uint8Array;
  subtle: { digest(algoritmo: string, datos: Uint8Array): Promise<ArrayBuffer> };
};
declare const TextEncoder: { new (): { encode(s: string): Uint8Array } };

type Modelo = DataModelFromSchemaDefinition<typeof schema>;
type Lectura = GenericQueryCtx<Modelo>;
type Escritura = GenericMutationCtx<Modelo>;
type IdUsuario = GenericId<'usuarios'>;
const mutation: MutationBuilder<Modelo, 'public'> = mutationGeneric;
const query: QueryBuilder<Modelo, 'public'> = queryGeneric;

const hashCodigo = async (codigo: string) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`dispositivo:${codigo}`)))]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');

// ------------------------------------------------------------------ fusión
const porUsuario = async (ctx: Lectura, usuarioId: IdUsuario) => ({
  perfil: await ctx.db
    .query('perfiles')
    .withIndex('por_usuario', (q) => q.eq('usuarioId', usuarioId))
    .unique(),
  visitas: await ctx.db
    .query('visitas')
    .withIndex('por_usuario', (q) => q.eq('usuarioId', usuarioId))
    .collect(),
  logros: await ctx.db
    .query('logros')
    .withIndex('por_usuario', (q) => q.eq('usuarioId', usuarioId))
    .collect(),
  inventario: await ctx.db
    .query('inventario')
    .withIndex('por_usuario', (q) => q.eq('usuarioId', usuarioId))
    .collect(),
  misiones: await ctx.db
    .query('misionesDia')
    .withIndex('por_usuario_fecha', (q) => q.eq('usuarioId', usuarioId))
    .collect(),
  contadores: await ctx.db
    .query('contadores')
    .withIndex('por_usuario', (q) => q.eq('usuarioId', usuarioId))
    .unique(),
  juegos: await ctx.db
    .query('progresoJuegos')
    .withIndex('por_usuario_juego', (q) => q.eq('usuarioId', usuarioId))
    .collect(),
  marcas: await ctx.db
    .query('marcas')
    .withIndex('por_usuario_juego', (q) => q.eq('usuarioId', usuarioId))
    .collect(),
});
type Datos = Awaited<ReturnType<typeof porUsuario>>;
/** Lo que la cuenta cobró de verdad: lo que subió del navegador sin premio no cuenta como pagado. */
const cuentaDe = (d: Datos): CuentaFusion => ({
  monedas: d.perfil?.monedas ?? MONEDAS_INICIALES,
  xp: d.perfil?.xp ?? 0,
  nivel: d.perfil?.nivel ?? 1,
  visitas: d.visitas.filter((x) => !x.visitaLocal).map((x) => x.deptId),
  recuerdos: d.visitas.filter((x) => x.recuerdo && !x.recuerdoLocal).map((x) => x.deptId),
  logros: d.logros.filter((x) => !x.sinPago).map((x) => x.logroId),
  comprados: d.inventario.map((x) => x.itemId),
  misiones: d.misiones.map((m) => ({ fecha: m.fecha, cobradas: m.misiones.filter((x) => x.cobrada).map((x) => x.id) })),
  sueltas: d.contadores?.monedas ? { fecha: d.contadores.monedas.fecha, hoy: d.contadores.monedas.hoy } : null,
  juegos: d.juegos.map((j) => ({
    juegoId: j.juegoId,
    etapa: j.etapa,
    estrellas: j.estrellas,
    mejor: j.mejor,
    veces: j.veces,
  })),
});

/** Cambia `de` por `a` en lo social (amistades, bloqueos, reportes, directos); lo repetido o consigo mismo se va. */
async function moverSocial(ctx: Escritura, de: IdUsuario, a: IdUsuario) {
  const amistadesDe = async (u: IdUsuario) => [
    ...(await ctx.db
      .query('amistades')
      .withIndex('por_a', (q) => q.eq('a', u))
      .collect()),
    ...(await ctx.db
      .query('amistades')
      .withIndex('por_b', (q) => q.eq('b', u))
      .collect()),
  ];
  const borrarAmistad = async (id: GenericId<'amistades'>) => {
    for (const d of await ctx.db
      .query('directos')
      .withIndex('por_amistad', (q) => q.eq('amistad', id))
      .collect())
      await ctx.db.delete(d._id);
    await ctx.db.delete(id);
  };
  const deA = new Map((await amistadesDe(a)).map((x) => [x.a === a ? x.b : x.a, x] as const));
  for (const am of await amistadesDe(de)) {
    const otro = am.a === de ? am.b : am.a,
      ya = deA.get(otro);
    if (otro === a) {
      await borrarAmistad(am._id);
      continue;
    }
    // si las dos tenían algo con la misma persona, queda la amistad aceptada (con sus mensajes)
    if (ya && !(ya.estado === 'pedida' && am.estado === 'aceptada')) {
      await borrarAmistad(am._id);
      continue;
    }
    if (ya) await borrarAmistad(ya._id);
    deA.set(otro, am);
    await ctx.db.patch(am._id, am.a === de ? { a } : { b: a });
  }
  const bloqueosDeA = await ctx.db
    .query('bloqueos')
    .withIndex('por_de', (q) => q.eq('de', a))
    .collect();
  const bloqueadosPorA = await ctx.db
    .query('bloqueos')
    .withIndex('por_a', (q) => q.eq('a', a))
    .collect();
  for (const b of await ctx.db
    .query('bloqueos')
    .withIndex('por_de', (q) => q.eq('de', de))
    .collect()) {
    if (b.a === a || bloqueosDeA.some((x) => x.a === b.a)) await ctx.db.delete(b._id);
    else await ctx.db.patch(b._id, { de: a });
  }
  for (const b of await ctx.db
    .query('bloqueos')
    .withIndex('por_a', (q) => q.eq('a', de))
    .collect()) {
    if (b.de === a || bloqueadosPorA.some((x) => x.de === b.de)) await ctx.db.delete(b._id);
    else await ctx.db.patch(b._id, { a });
  }
  for (const d of await ctx.db
    .query('directos')
    .withIndex('por_de', (q) => q.eq('de', de))
    .collect())
    await ctx.db.patch(d._id, { de: a });
  // los reportes siguen a la cuenta: juntarse con otra no borra lo que se reportó
  for (const r of await ctx.db
    .query('reportes')
    .withIndex('por_de', (q) => q.eq('de', de))
    .collect())
    await ctx.db.patch(r._id, { de: a });
  for (const r of await ctx.db
    .query('reportes')
    .withIndex('por_a', (q) => q.eq('a', de))
    .collect())
    await ctx.db.patch(r._id, { a });
}

/**
 * Junta la cuenta `origen` en `destino` y borra `origen`. Saldo, nivel y XP salen de `fusionarCuentas`; visitas,
 * recuerdos, logros, ropa, etapas, estrellas, marcas y misiones de hoy se juntan sin repetir; las llaves de
 * `origen` (y con `vincularOrigen`, la suya propia) pasan a `destino`. Quien llama revisa antes `reservarFusion`.
 */
export async function fusionar(
  ctx: Escritura,
  origen: IdUsuario,
  destino: IdUsuario,
  { vincularOrigen }: { vincularOrigen: boolean },
) {
  const uo = await ctx.db.get(origen),
    ud = await ctx.db.get(destino);
  if (!uo || !ud || origen === destino) throw new Error('Cuentas inválidas.');
  const o = await porUsuario(ctx, origen),
    d = await porUsuario(ctx, destino);
  if (!d.perfil) throw new Error('La cuenta no tiene perfil.');
  const f = fusionarCuentas(cuentaDe(d), cuentaDe(o));
  await ctx.db.patch(d.perfil._id, { monedas: f.monedas, xp: f.xp, nivel: f.nivel });

  // visitas, recuerdos y turismo: queda pagado lo que alguna de las dos cobró
  for (const vo of o.visitas) {
    const vd = d.visitas.find((x) => x.deptId === vo.deptId);
    if (!vd) {
      await ctx.db.patch(vo._id, { usuarioId: destino });
      continue;
    }
    const recuerdo = vd.recuerdo || vo.recuerdo;
    const pagado = (x: typeof vo) => x.recuerdo && !x.recuerdoLocal;
    const turismo = [...(vd.turismo ?? [])];
    for (const t of vo.turismo ?? []) {
      const i = turismo.findIndex((x) => x.id === t.id);
      if (i < 0) turismo.push(t);
      else turismo[i] = { id: t.id, completa: turismo[i].completa || t.completa };
    }
    await ctx.db.patch(vd._id, {
      recuerdo,
      turismo,
      visitaLocal: vd.visitaLocal && vo.visitaLocal ? true : undefined,
      recuerdoLocal: recuerdo && !pagado(vd) && !pagado(vo) ? true : undefined,
    });
    await ctx.db.delete(vo._id);
  }
  for (const lo of o.logros) {
    const ld = d.logros.find((x) => x.logroId === lo.logroId);
    if (!ld) await ctx.db.patch(lo._id, { usuarioId: destino });
    else {
      if (ld.sinPago && !lo.sinPago) await ctx.db.patch(ld._id, { sinPago: undefined });
      await ctx.db.delete(lo._id);
    }
  }
  for (const io of o.inventario) {
    if (f.devueltas.includes(io.itemId) || d.inventario.some((x) => x.itemId === io.itemId))
      await ctx.db.delete(io._id);
    else await ctx.db.patch(io._id, { usuarioId: destino });
  }
  for (const jo of o.juegos) {
    const jd = d.juegos.find((x) => x.juegoId === jo.juegoId),
      j = f.juegos.find((x) => x.juegoId === jo.juegoId);
    if (!jd || !j) await ctx.db.patch(jo._id, { usuarioId: destino });
    else {
      await ctx.db.patch(jd._id, { etapa: j.etapa, estrellas: j.estrellas, mejor: j.mejor, veces: j.veces });
      await ctx.db.delete(jo._id);
    }
  }
  for (const mo of o.marcas) {
    const md = d.marcas.find((x) => x.juegoId === mo.juegoId);
    if (!md) await ctx.db.patch(mo._id, { usuarioId: destino });
    else {
      if (mo.puntos > md.puntos) await ctx.db.patch(md._id, { puntos: mo.puntos, etapa: mo.etapa, deptId: mo.deptId });
      await ctx.db.delete(mo._id);
    }
  }
  for (const mo of o.misiones) {
    const md = d.misiones.find((x) => x.fecha === mo.fecha);
    if (!md) {
      await ctx.db.patch(mo._id, { usuarioId: destino });
      continue;
    }
    const misiones = md.misiones.map((x) => {
      const y = mo.misiones.find((z) => z.id === x.id);
      return y ? { id: x.id, progreso: Math.max(x.progreso, y.progreso), cobrada: x.cobrada || y.cobrada } : x;
    });
    await ctx.db.patch(md._id, { misiones });
    await ctx.db.delete(mo._id);
  }
  const cd = await asegurarContadores(ctx, destino),
    co = o.contadores;
  if (co) {
    const base = cd.monedas?.fecha === f.sueltas?.fecha ? cd.monedas : co.monedas;
    await ctx.db.patch(cd._id, {
      entro: cd.entro || co.entro,
      emotes: cd.emotes + co.emotes,
      migrado: cd.migrado || co.migrado,
      monedas: base && f.sueltas ? { ...base, hoy: f.sueltas.hoy } : cd.monedas,
    });
    await ctx.db.delete(co._id);
  }

  await moverSocial(ctx, origen, destino);
  // lo que no se junta: códigos de amigo, id público (sale de la cuenta), turnos de partida y viajes en camino
  const sueltos = [
    ...(await ctx.db
      .query('invitaciones')
      .withIndex('por_de', (q) => q.eq('de', origen))
      .collect()),
    ...(await ctx.db
      .query('publicos')
      .withIndex('por_usuario', (q) => q.eq('usuarioId', origen))
      .collect()),
    ...(await ctx.db
      .query('aperturas')
      .withIndex('por_usuario', (q) => q.eq('usuarioId', origen))
      .collect()),
    ...(await ctx.db
      .query('viajes')
      .withIndex('por_usuario_estado', (q) => q.eq('usuarioId', origen))
      .collect()),
    ...(await ctx.db
      .query('codigosDispositivo')
      .withIndex('por_usuario', (q) => q.eq('usuarioId', origen))
      .collect()),
  ];
  for (const x of sueltos) await ctx.db.delete(x._id);
  for (const p of await ctx.db
    .query('partidas')
    .withIndex('por_dueno_estado', (q) => q.eq('dueno', origen).eq('estado', 'abierta'))
    .collect())
    await ctx.db.patch(p._id, { estado: 'abandonada' });
  for (const viaje of await ctx.db.query('viajesCompartidos').collect())
    if (viaje.jugadores.includes(origen)) {
      const jugadores = [...new Set(viaje.jugadores.map((j) => (j === origen ? destino : j)))];
      await ctx.db.patch(viaje._id, { jugadores });
    }

  // llaves: las de otros dispositivos de `origen` entran ahora a `destino`
  for (const vin of await ctx.db
    .query('vinculos')
    .withIndex('por_usuario', (q) => q.eq('usuarioId', origen))
    .collect())
    await ctx.db.patch(vin._id, { usuarioId: destino });
  if (vincularOrigen && uo.tokenIdentifier)
    await ctx.db.insert('vinculos', { token: uo.tokenIdentifier, usuarioId: destino });
  if (ud.esInvitado && !uo.esInvitado) await ctx.db.patch(destino, { esInvitado: false });
  if (o.perfil) await ctx.db.delete(o.perfil._id);
  await ctx.db.delete(origen);
  // los logros que solo cumple la suma de las dos se marcan sin pagar: ninguna de las dos los ganó sola
  const s: Sesion = {
    ctx,
    usuarioId: destino,
    perfilId: d.perfil._id,
    avatar: d.perfil.avatar,
    saldo: { monedas: f.monedas, xp: f.xp, nivel: f.nivel },
    subidas: 0,
    logros: [],
    misiones: null,
    ahora: Date.now(),
  };
  await revisarLogros(s, { pagarlos: false });
  return f.resumen;
}

/** Cuenta una fusión más para `destino` hoy; false si ya absorbió `FUSIONES_POR_DIA` cuentas. */
async function reservarFusion(ctx: Escritura, destino: IdUsuario) {
  const c = await asegurarContadores(ctx, destino),
    r = decidirFusion(c.fusiones, fechaHonduras(Date.now()));
  if (!r) return false;
  await ctx.db.patch(c._id, { fusiones: r });
  return true;
}

// ------------------------------------------------------------------ código para otro dispositivo (MC-09)
/** Crea el código para seguir en otro dispositivo. Uno por cuenta: pedir otro borra el anterior. */
export const crearCodigoDispositivo = mutation({
  args: quien,
  handler: async (ctx, args) => {
    const { usuario } = await asegurarUsuario(ctx, args);
    for (const c of await ctx.db
      .query('codigosDispositivo')
      .withIndex('por_usuario', (q) => q.eq('usuarioId', usuario._id))
      .collect())
      await ctx.db.delete(c._id);
    const vence = Date.now() + CODIGO_DISPOSITIVO.vigenciaMs;
    for (let intento = 0; intento < 8; intento++) {
      const codigo = codigoDispositivoDe(crypto.getRandomValues(new Uint8Array(CODIGO_DISPOSITIVO.largo)));
      const hash = await hashCodigo(codigo);
      const choca = await ctx.db
        .query('codigosDispositivo')
        .withIndex('por_hash', (q) => q.eq('hash', hash))
        .first();
      if (choca) continue;
      await ctx.db.insert('codigosDispositivo', { hash, usuarioId: usuario._id, vence });
      return { ok: true as const, codigo: mostrarCodigoDispositivo(codigo), vence };
    }
    return { ok: false as const, motivo: 'ocupado' };
  },
});

/** Busca un código vigente (sin escribir nada). */
async function filaDeCodigo(ctx: Lectura, entrada: string) {
  const codigo = normalizarCodigoDispositivo(entrada);
  if (!codigo) return { motivo: 'codigo' as const };
  const hash = await hashCodigo(codigo);
  const fila = await ctx.db
    .query('codigosDispositivo')
    .withIndex('por_hash', (q) => q.eq('hash', hash))
    .first();
  if (!fila) return { motivo: 'codigo' as const };
  const cuenta = await ctx.db.get(fila.usuarioId);
  if (fila.vence <= Date.now() || !cuenta) return { motivo: 'vencido' as const, fila };
  return { fila, cuenta };
}

/** Antes de entrar con un código: de quién es la cuenta (para confirmarlo). No cambia nada. */
export const verCodigoDispositivo = query({
  args: { ...quien, codigo: v.string() },
  handler: async (ctx, args) => {
    const r = await filaDeCodigo(ctx, args.codigo);
    if (!('cuenta' in r) || !r.cuenta) return { ok: false as const, motivo: r.motivo };
    const yo = await usuarioDe(ctx, args);
    if (yo?._id === r.cuenta._id) return { ok: false as const, motivo: 'propio' };
    const perfil = await ctx.db
      .query('perfiles')
      .withIndex('por_usuario', (q) => q.eq('usuarioId', r.cuenta._id))
      .unique();
    return { ok: true as const, nombre: r.cuenta.nombre, nivel: perfil?.nivel ?? 1 };
  },
});

/**
 * Este dispositivo entra a la cuenta del código. Lo que tenía en Convex se junta con esa cuenta (`fusionar`, sin
 * premios repetidos) y lo que trae el navegador sube sin premios, como `subirAvanceLocal`. Motivos: `codigo`,
 * `vencido`, `propio` (ya es tu cuenta), `espera` (demasiados intentos), `tope` (esa cuenta ya juntó
 * `FUSIONES_POR_DIA` hoy) y `con-cuenta` (con Clerk se usa la cuenta, y una cuenta de Clerk no se junta por código).
 * El código se revisa antes de crear nada: probar códigos no llena tablas.
 */
export const usarCodigoDispositivo = mutation({
  args: { ...quien, codigo: v.string(), local: v.optional(v.object(avanceLocal)) },
  handler: async (ctx, args) => {
    if (await tokenCuenta(ctx)) return { ok: false as const, motivo: 'con-cuenta' };
    const yo = await usuarioDe(ctx, { invitado: args.invitado });
    if (yo && !yo.esInvitado) return { ok: false as const, motivo: 'con-cuenta' };
    const ahora = Date.now(),
      c = yo ? await contadoresDe(ctx, yo._id) : null;
    if (c && !puedeProbarCodigo(c.fallosCodigo, ahora)) return { ok: false as const, motivo: 'espera' };
    const r = await filaDeCodigo(ctx, args.codigo);
    if (!('cuenta' in r) || !r.cuenta) {
      if (c) await ctx.db.patch(c._id, { fallosCodigo: sumarFalloCodigo(c.fallosCodigo, ahora) });
      if (r.fila) await ctx.db.delete(r.fila._id);
      return { ok: false as const, motivo: r.motivo };
    }
    const destino = r.cuenta._id;
    if (yo?._id === destino) return { ok: false as const, motivo: 'propio' };
    let resumen = null;
    if (yo) {
      if (!(await reservarFusion(ctx, destino))) return { ok: false as const, motivo: 'tope' };
      await ctx.db.delete(r.fila._id);
      resumen = await fusionar(ctx, yo._id, destino, { vincularOrigen: true });
    } else {
      await ctx.db.delete(r.fila._id);
      await ctx.db.insert('vinculos', { token: await tokenDe(args), usuarioId: destino });
    }
    // desde aquí el secreto de este dispositivo ya entra a la cuenta del código
    const s = await sesion(ctx, { invitado: args.invitado });
    if (args.local && avanceLocalCabe(args.local)) await guardarAvanceLocal(ctx, s.usuarioId, args.local);
    const avance = await terminar(s, { pagarlos: false });
    const cuenta = await ctx.db.get(s.usuarioId),
      perfil = await ctx.db.get(s.perfilId);
    if (!cuenta || !perfil) throw new Error('Sin perfil.');
    return {
      ok: true as const,
      nombre: cuenta.nombre,
      resumen,
      perfil: vista(perfil, await compradosDe(ctx, s.usuarioId)),
      ...avance,
    };
  },
});

/** Cuántos dispositivos entran a esta cuenta, si ya tiene cuenta de Clerk y si hay un código vigente. */
export const miCuenta = query({
  args: quien,
  handler: async (ctx, args) => {
    const actual = await usuarioActual(ctx, args);
    if (!actual) return null;
    const id = actual.usuario._id;
    const vinculos = await ctx.db
      .query('vinculos')
      .withIndex('por_usuario', (q) => q.eq('usuarioId', id))
      .collect();
    const codigo = await ctx.db
      .query('codigosDispositivo')
      .withIndex('por_usuario', (q) => q.eq('usuarioId', id))
      .first();
    return {
      nombre: actual.usuario.nombre,
      conCuenta: !actual.usuario.esInvitado,
      dispositivos: 1 + vinculos.filter((x) => x.token.startsWith('invitado:')).length,
      codigoVence: codigo && codigo.vence > Date.now() ? codigo.vence : null,
    };
  },
});

// ------------------------------------------------------------------ Clerk (MC-07)
/**
 * Une la llave de una cuenta (el `tokenIdentifier` de Clerk) con el invitado de este dispositivo. Si la llave
 * todavía no tiene cuenta, el invitado pasa a ser esa cuenta; si ya la tenía (entró en otro dispositivo), el invitado
 * se junta con ella sin premios repetidos y su secreto ya no entra a la cuenta. Una cuenta que ya es de Clerk nunca se
 * adopta ni se junta con otra: si el invitado de este dispositivo es de otra cuenta de Clerk, la llave nueva arranca
 * su propia cuenta. Al salir de Clerk el juego cambia el secreto del dispositivo (`core/clerk.tsx`). Repetirla no hace
 * nada.
 */
export async function vincularLlave(ctx: Escritura, llave: string, args: { invitado: string }) {
  const dueno = await usuarioPorToken(ctx, llave);
  const invitado = await usuarioPorToken(ctx, await tokenDe(args));
  if (!dueno) {
    if (invitado?.esInvitado) {
      await ctx.db.insert('vinculos', { token: llave, usuarioId: invitado._id });
      await ctx.db.patch(invitado._id, { esInvitado: false });
      return { ok: true as const, nueva: false, resumen: null };
    }
    await crearCuenta(ctx, { token: llave, esInvitado: false });
    return { ok: true as const, nueva: true, resumen: null };
  }
  if (!invitado || invitado._id === dueno._id || !invitado.esInvitado)
    return { ok: true as const, nueva: false, resumen: null };
  if (!(await reservarFusion(ctx, dueno._id))) return { ok: false as const, motivo: 'tope' };
  const resumen = await fusionar(ctx, invitado._id, dueno._id, { vincularOrigen: false });
  return { ok: true as const, nueva: false, resumen };
}

/** Lo llama el juego al entrar con Clerk. Sin sesión de Clerk responde `sin-cuenta`. */
export const vincularCuenta = mutation({
  args: quien,
  handler: async (ctx, args) => {
    const llave = await tokenCuenta(ctx);
    if (!llave) return { ok: false as const, motivo: 'sin-cuenta' };
    return vincularLlave(ctx, llave, args);
  },
});
