// Avance en el servidor: etapas, misiones del día, logros, monedas sueltas, viajes y avance local (MC-15, MC-16).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  avanzarJuego,
  avanzarMisiones,
  DEPARTAMENTOS,
  decidirCobroMision,
  decidirLlegada,
  decidirMonedas,
  decidirSalida,
  deptoDeJuego,
  EMOTE_MIN_MS,
  emoteCuenta,
  etapaAbierta,
  eventosDePartida,
  fechaHonduras,
  gastoValido,
  LOGROS,
  limpiarAvanceLocal,
  logrosNuevos,
  MISIONES,
  MISIONES_DIARIAS,
  MONEDAS_SUELTAS,
  misionesDelDia,
  misionesNuevas,
  PASAJES,
  prendasTipicas,
  VIAJE_MIN_S,
} from '../src/index.ts';

const raiz = new URL('../../../', import.meta.url);

test('la fecha es la de Honduras (UTC−6): el día cambia a las 06:00 UTC', () => {
  assert.equal(fechaHonduras(Date.UTC(2026, 10, 12, 5, 59)), '2026-11-11');
  assert.equal(fechaHonduras(Date.UTC(2026, 10, 12, 6, 0)), '2026-11-12');
  assert.equal(fechaHonduras(Date.UTC(2026, 0, 1, 3, 0)), '2025-12-31');
});

test('las misiones del día son las mismas para todos ese día y no se repiten', () => {
  const a = misionesDelDia('2026-11-12');
  assert.deepEqual(a, misionesDelDia('2026-11-12'));
  assert.equal(a.length, MISIONES_DIARIAS);
  assert.equal(new Set(a).size, a.length);
  for (const id of a) assert(MISIONES.some((m) => m.id === id));
  const distintas = new Set(
    ['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'].map((f) => misionesDelDia(f).join()),
  );
  assert(distintas.size > 1, 'cambian de un día a otro');
});

test('una partida avanza las misiones de jugar, ganar, puntaje y goles', () => {
  const ms = misionesNuevas(['m_jugar2', 'm_ganar1', 'm_feria', 'm_goles', 'm_pulperia']);
  let r = ms;
  for (const ev of eventosDePartida({ motor: 'feria', puntos: 230, gano: true })) r = avanzarMisiones(r, ev).misiones;
  const p = Object.fromEntries(r.map((m) => [m.id, m.progreso]));
  assert.deepEqual(p, { m_jugar2: 1, m_ganar1: 1, m_feria: 200, m_goles: 0, m_pulperia: 0 });
  for (const ev of eventosDePartida({ motor: 'futbol', puntos: 3, gano: true })) r = avanzarMisiones(r, ev).misiones;
  const q = Object.fromEntries(r.map((m) => [m.id, m.progreso]));
  assert.equal(q.m_jugar2, 2);
  assert.equal(q.m_goles, 2, 'no pasa de la meta');
  assert.equal(q.m_pulperia, 0, 'la de La Pulpería solo con su motor');
  for (const ev of eventosDePartida({ motor: 'pulperia', puntos: 10, gano: false }))
    r = avanzarMisiones(r, ev).misiones;
  assert.equal(r.find((m) => m.id === 'm_pulperia').progreso, 1);
});

test('una misión se cobra completa y una sola vez', () => {
  const ms = misionesNuevas(['m_ganar1', 'm_jugar2']);
  assert.deepEqual(decidirCobroMision(ms, 'm_ganar1'), { ok: false, motivo: 'incompleta' });
  assert.deepEqual(decidirCobroMision(ms, 'm_feria'), { ok: false, motivo: 'no' });
  const listas = avanzarMisiones(ms, { tipo: 'win', cantidad: 1, objetivo: 'trivia' }).misiones;
  const c = decidirCobroMision(listas, 'm_ganar1');
  const m = MISIONES.find((x) => x.id === 'm_ganar1');
  assert(c.ok);
  assert.deepEqual(c.premio, { monedas: m.coins, xp: m.xp });
  assert.deepEqual(decidirCobroMision(c.misiones, 'm_ganar1'), { ok: false, motivo: 'cobrada' });
  // una cobrada ya no avanza
  assert.equal(avanzarMisiones(c.misiones, { tipo: 'win', cantidad: 1 }).cambio, false);
});

test('cerrar una partida desbloquea la etapa siguiente y guarda estrellas, mejor y veces', () => {
  const a = avanzarJuego(null, { etapa: 0, etapas: 4, puntos: 480, estrellas: 1, gano: true });
  assert.deepEqual(a, { etapa: 1, estrellas: [1], mejor: 480, veces: 1, avance: true });
  const b = avanzarJuego(a, { etapa: 1, etapas: 4, puntos: 100, estrellas: 0, gano: false });
  assert.deepEqual(b, { etapa: 1, estrellas: [1], mejor: 480, veces: 2, avance: false });
  const c = avanzarJuego(b, { etapa: 0, etapas: 4, puntos: 700, estrellas: 3, gano: true });
  assert.deepEqual(c, { etapa: 1, estrellas: [3], mejor: 700, veces: 3, avance: false });
  const fin = avanzarJuego(
    { etapa: 3, estrellas: [1, 1, 1], mejor: 0, veces: 3 },
    { etapa: 3, etapas: 4, puntos: 1, estrellas: 2, gano: true },
  );
  assert.equal(fin.etapa, 4);
  assert.equal(etapaAbierta(fin, 4), 3, 'después de la última se repite la última');
  assert.equal(etapaAbierta(null, 4), 0);
});

test('el departamento sale del id del juego; los sueltos son del lobby', () => {
  assert.equal(deptoDeJuego('lapaz.catacion'), 'lapaz');
  assert.equal(deptoDeJuego('trivia'), 'lobby');
  assert.equal(deptoDeJuego('marte.algo'), 'lobby');
  assert.equal(DEPARTAMENTOS.length, 18);
});

test('logros: por estado y por partida, cada uno una sola vez', () => {
  const estado = { entro: true, visitas: 5, recuerdos: 0, compras: 0, tipicas: 0, nivel: 1, emotes: 0 };
  assert.deepEqual(
    logrosNuevos({ ya: [], estado }).map((l) => l.id),
    ['primer_paso', 'viajero'],
  );
  assert.deepEqual(
    logrosNuevos({ ya: ['primer_paso'], estado }).map((l) => l.id),
    ['viajero'],
  );
  const feria = { motor: 'feria', puntos: 420, estrellas: 3, gano: true };
  assert.deepEqual(
    logrosNuevos({ ya: [], partida: feria }).map((l) => l.id),
    ['primera_victoria', 'punteria'],
  );
  assert.deepEqual(logrosNuevos({ ya: ['primera_victoria', 'punteria'], partida: feria }), []);
  assert.deepEqual(
    logrosNuevos({ ya: [], partida: { motor: 'futbol', puntos: 3, estrellas: 3, gano: true } }).map((l) => l.id),
    ['primera_victoria', 'goleador'],
  );
  const todo = { entro: true, visitas: 18, recuerdos: 9, compras: 5, tipicas: 3, nivel: 5, emotes: 10 };
  const porEstado = logrosNuevos({ ya: [], estado: todo }).map((l) => l.id);
  assert.equal(porEstado.length, 8);
  for (const l of LOGROS) assert(l.coins > 0);
});

test('prendas típicas: cuenta las que tienen `trad` en shop.json', () => {
  const shop = JSON.parse(readFileSync(new URL('apps/web/shared/data/shop.json', raiz), 'utf8'));
  const trad = shop.items.filter((i) => i.trad);
  assert(trad.length >= 3);
  const avatar = { shirt: 'x', pants: 'x', hat: 'x', acc: 'x' };
  for (const i of trad) {
    const ranura = { camisa: 'shirt', pantalon: 'pants', sombrero: 'hat', accesorio: 'acc' }[i.cat];
    if (ranura) avatar[ranura] = i.id;
  }
  assert(prendasTipicas(avatar) >= 1);
  assert.equal(prendasTipicas({ shirt: 'nada' }), 0);
});

test('monedas sueltas: tope de ritmo y tope por día', () => {
  const t0 = Date.UTC(2026, 10, 12, 18);
  let r = decidirMonedas(null, { ahora: t0, pedidas: 100 });
  assert.equal(r.pagadas, MONEDAS_SUELTAS.cubeta, 'de golpe solo lo que cabe en la cubeta');
  r = decidirMonedas(r.estado, { ahora: t0 + 100, pedidas: 5 });
  assert.equal(r.pagadas, 0, 'sin recarga no paga');
  r = decidirMonedas(r.estado, { ahora: t0 + MONEDAS_SUELTAS.recargaMs * 3, pedidas: 5 });
  assert.equal(r.pagadas, 3);
  assert.equal(decidirMonedas(null, { ahora: t0, pedidas: -4 }).pagadas, 0);
  assert.equal(decidirMonedas(null, { ahora: t0, pedidas: 2.5 }).pagadas, 0);
  // todo un día pidiendo sin parar no pasa del tope
  let e = null,
    total = 0;
  for (let t = t0; t < t0 + 4 * 3600_000; t += 10_000) {
    const x = decidirMonedas(e, { ahora: t, pedidas: 50 });
    total += x.pagadas;
    e = x.estado;
  }
  assert.equal(total, MONEDAS_SUELTAS.porDia);
  // al otro día de Honduras vuelve a pagar
  assert(decidirMonedas(e, { ahora: t0 + 24 * 3600_000, pedidas: 1 }).pagadas === 1);
});

test('los emotes cuentan con pausa', () => {
  assert(emoteCuenta(undefined, 0));
  assert(!emoteCuenta(1000, 1000 + EMOTE_MIN_MS - 1));
  assert(emoteCuenta(1000, 1000 + EMOTE_MIN_MS));
});

test('pasaje: precio del servidor, sin saldo no se sale', () => {
  assert.deepEqual(decidirSalida({ veh: 'bus', de: 'cortes', a: 'atlantida', saldo: 10 }), {
    ok: true,
    precio: 2,
    saldo: 8,
  });
  assert.deepEqual(decidirSalida({ veh: 'taxi', de: 'cortes', a: 'atlantida', saldo: 5 }), {
    ok: false,
    motivo: 'caro',
    falta: 7,
  });
  assert.equal(decidirSalida({ veh: 'cohete', de: 'cortes', a: 'atlantida', saldo: 99 }).ok, false);
  assert.equal(decidirSalida({ veh: 'bus', de: 'cortes', a: 'marte', saldo: 99 }).ok, false);
});

test('los pasajes copian los precios del juego', () => {
  const data = readFileSync(new URL('apps/web/src/core/data.ts', raiz), 'utf8');
  const opciones = readFileSync(new URL('apps/web/src/game/viaje/opciones.ts', raiz), 'utf8');
  const juego = {};
  for (const fuente of [data, opciones])
    for (const m of fuente.matchAll(/id: '([a-z]+)',\s*name: '[^']*',\s*precio: (\d+)/g)) juego[m[1]] = Number(m[2]);
  assert.deepEqual(juego, { ...PASAJES });
});

test('bono de viaje: solo si duró lo mínimo, con tope', () => {
  const inicio = 1_000_000;
  assert.deepEqual(decidirLlegada({ inicio, ahora: inicio + 5_000, bono: 30, bonoMax: 30 }), {
    bono: 0,
    motivo: 'llegó antes de tiempo',
  });
  assert.deepEqual(decidirLlegada({ inicio, ahora: inicio + VIAJE_MIN_S * 1000, bono: 99, bonoMax: 30 }), { bono: 30 });
  assert.deepEqual(decidirLlegada({ inicio, ahora: inicio + VIAJE_MIN_S * 1000, bono: 12.4, bonoMax: 30 }), {
    bono: 12,
  });
  assert.equal(decidirLlegada({ inicio, ahora: inicio + 3_600_000, bono: 30, bonoMax: 30 }).bono, 0);
});

test('gastos del viaje: enteros, chicos y con saldo', () => {
  assert(gastoValido(2, 10));
  assert(!gastoValido(2, 1));
  assert(!gastoValido(-5, 10));
  assert(!gastoValido(1.5, 10));
  assert(!gastoValido(500, 1000));
});

test('avance local: se acepta lo posible y nada más', () => {
  const etapas = (id) => ({ 'lapaz.catacion': 4, 'cortes.pollo-chuco-en-equilibrio': 3 })[id] ?? null;
  const limpio = limpiarAvanceLocal(
    {
      visitados: ['lapaz', 'lapaz', 'marte', 7, 'cortes'],
      recuerdos: ['lapaz', 'olancho'],
      juegos: {
        'lapaz.catacion': { etapa: 99, stars: [3, 9, -1, 2, 3, 3], veces: 1e9, best: 1e9 },
        'cortes.pollo-chuco-en-equilibrio': { etapa: 1, stars: [2], veces: 'x' },
        'inventado.juego': { etapa: 3, stars: [3, 3, 3] },
        'lapaz.otro': 'basura',
      },
    },
    etapas,
  );
  assert.deepEqual(limpio.visitas, ['lapaz', 'cortes']);
  assert.deepEqual(limpio.recuerdos, ['lapaz'], 'sin recuerdo de un departamento no visitado');
  assert.deepEqual(limpio.juegos, [
    { juegoId: 'lapaz.catacion', etapa: 4, estrellas: [3, 3, 0, 2], veces: 500 },
    { juegoId: 'cortes.pollo-chuco-en-equilibrio', etapa: 1, estrellas: [2], veces: 1 },
  ]);
  assert.deepEqual(limpiarAvanceLocal({ visitados: 'x', juegos: null }, etapas), {
    visitas: [],
    recuerdos: [],
    juegos: [],
  });
});
