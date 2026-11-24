// Cuentas (MC-07, MC-08, MC-09): código de otro dispositivo y fusión de dos cuentas sin perder nada ni pagar dos
// veces el mismo premio.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ALFABETO_CODIGO,
  CODIGO_DISPOSITIVO,
  codigoDispositivoDe,
  fusionarCuentas,
  ganarXp,
  LOGROS,
  MISIONES,
  MONEDAS_INICIALES,
  MONEDAS_SUELTAS,
  mostrarCodigoDispositivo,
  normalizarCodigoDispositivo,
  PREMIO_PRIMERA_VISITA,
  PREMIO_RECUERDO,
  PREMIOS,
  xpParaNivel,
  xpTotal,
} from '../src/index.ts';

const cuenta = (c = {}) => ({
  monedas: MONEDAS_INICIALES,
  xp: 0,
  nivel: 1,
  visitas: [],
  recuerdos: [],
  logros: [],
  comprados: [],
  misiones: [],
  sueltas: null,
  juegos: [],
  ...c,
});
const coins = (id) => LOGROS.find((l) => l.id === id).coins;

test('el código de dispositivo: 8 letras sin confusas, se escribe con guion y se lee como venga', () => {
  const c = codigoDispositivoDe([0, 1, 2, 3, 31, 32, 255, 100]);
  assert.equal(c.length, CODIGO_DISPOSITIVO.largo);
  for (const ch of c) assert(ALFABETO_CODIGO.includes(ch));
  assert.equal(c[5], ALFABETO_CODIGO[0], '32 da la vuelta al alfabeto');
  assert.equal(mostrarCodigoDispositivo('ABCDEFGH'), 'ABCD-EFGH');
  assert.equal(normalizarCodigoDispositivo(' abcd-efgh '), 'ABCDEFGH');
  assert.equal(normalizarCodigoDispositivo('ABCD EFGH'), 'ABCDEFGH');
  assert.equal(normalizarCodigoDispositivo('ABCDEFG'), null, 'corto');
  assert.equal(normalizarCodigoDispositivo('ABCDEFGI'), null, 'la I no existe');
  assert.equal(normalizarCodigoDispositivo('ABCDEFG0'), null, 'el 0 no existe');
  assert.equal(normalizarCodigoDispositivo(12345678), null);
  assert(CODIGO_DISPOSITIVO.vigenciaMs <= 15 * 60_000, 'vence pronto');
});

test('xpTotal es la inversa de ganarXp', () => {
  for (const total of [0, 99, 100, 101, 250, 1234, 9999]) {
    const a = ganarXp({ nivel: 1, xp: 0 }, total);
    assert.equal(xpTotal(a.nivel, a.xp), total);
  }
  assert.equal(xpTotal(3, 10), xpParaNivel(1) + xpParaNivel(2) + 10);
});

test('dos cuentas recién creadas: la bienvenida de la otra no se suma', () => {
  const f = fusionarCuentas(cuenta(), cuenta());
  assert.equal(f.monedas, MONEDAS_INICIALES);
  assert.equal(f.nivel, 1);
  assert.equal(f.resumen.monedas, 0);
});

test('nada se pierde: monedas ganadas, ropa, visitas, recuerdos, logros, etapas y marcas', () => {
  const queda = cuenta({
    monedas: 300,
    visitas: ['olancho'],
    logros: ['primer_paso'],
    comprados: ['at_campesina'],
    juegos: [{ juegoId: 'yoro.tres-pruebas-del-54', etapa: 1, estrellas: [2], mejor: 300, veces: 2 }],
  });
  const otra = cuenta({
    monedas: 450,
    visitas: ['copan'],
    recuerdos: ['copan'],
    logros: ['primer_paso', 'primera_victoria'],
    comprados: ['at_lenca'],
    juegos: [
      { juegoId: 'yoro.tres-pruebas-del-54', etapa: 2, estrellas: [1, 3], mejor: 280, veces: 3 },
      { juegoId: 'cortes.chuco', etapa: 1, estrellas: [1], mejor: 50, veces: 1 },
    ],
  });
  const f = fusionarCuentas(queda, otra);
  // trae 450 menos la bienvenida (100) y «Primeros pasos», que ya tenía
  assert.equal(f.monedas, 300 + 450 - MONEDAS_INICIALES - coins('primer_paso'));
  assert.deepEqual(f.comprados.sort(), ['at_campesina', 'at_lenca']);
  assert.deepEqual(f.visitas.sort(), ['copan', 'olancho']);
  assert.deepEqual(f.recuerdos, ['copan']);
  assert.deepEqual(f.logros.sort(), ['primer_paso', 'primera_victoria']);
  const yoro = f.juegos.find((j) => j.juegoId === 'yoro.tres-pruebas-del-54');
  assert.deepEqual(yoro, { juegoId: 'yoro.tres-pruebas-del-54', etapa: 2, estrellas: [2, 3], mejor: 300, veces: 5 });
  assert(f.juegos.some((j) => j.juegoId === 'cortes.chuco'));
  assert.equal(f.resumen.prendas, 1);
  assert.equal(f.resumen.visitas, 1);
});

test('la misma visita, el mismo recuerdo, el mismo logro y la misma misión del día se pagan una sola vez', () => {
  const mision = MISIONES[0];
  const comun = {
    visitas: ['olancho', 'copan'],
    recuerdos: ['olancho'],
    logros: ['primer_paso'],
    misiones: [{ fecha: '2026-11-24', cobradas: [mision.id] }],
  };
  const queda = cuenta({ monedas: 1000, ...comun });
  const otra = cuenta({
    monedas: 1000,
    ...comun,
    misiones: [...comun.misiones, { fecha: '2026-11-23', cobradas: [mision.id] }],
  });
  const f = fusionarCuentas(queda, otra);
  const repetido =
    MONEDAS_INICIALES +
    2 * PREMIO_PRIMERA_VISITA.monedas +
    PREMIO_RECUERDO.monedas +
    coins('primer_paso') +
    mision.coins; // la del 23 solo la cobró una
  assert.equal(f.resumen.descuento, repetido);
  assert.equal(f.monedas, 2000 - repetido);
});

test('la XP se suma sin la de premios repetidos y los premios por subir de nivel no se duplican', () => {
  // cada una llegó a nivel 2 por su cuenta (y cobró su premio por subir); juntas tienen la XP del nivel 3
  const xp2 = xpParaNivel(1);
  const queda = cuenta({ monedas: 500, nivel: 2, xp: 80 });
  const otra = cuenta({ monedas: 500, nivel: 2, xp: 80 });
  const f = fusionarCuentas(queda, otra);
  const nuevo = ganarXp({ nivel: 1, xp: 0 }, 2 * (xp2 + 80));
  assert.equal(f.nivel, nuevo.nivel);
  assert.equal(f.xp, nuevo.xp);
  // pagaron 2 subidas en total; el nivel que resulta paga (nivel - 1)
  const ajuste = (nuevo.nivel - 1 - 2) * PREMIOS.levelUp.coins;
  assert.equal(f.monedas, 1000 - MONEDAS_INICIALES + ajuste);
  // las visitas repetidas descuentan también su XP
  const g = fusionarCuentas(cuenta({ visitas: ['olancho'], xp: 30 }), cuenta({ visitas: ['olancho'], xp: 30 }));
  assert.equal(xpTotal(g.nivel, g.xp), 30);
});

test('una prenda comprada en las dos se devuelve; las monedas sueltas del mismo día respetan el tope', () => {
  const f = fusionarCuentas(
    cuenta({ monedas: 0, comprados: ['at_lenca'] }),
    cuenta({ monedas: 0, comprados: ['at_lenca'] }),
  );
  assert.equal(f.resumen.reembolso, 260);
  assert.equal(f.monedas, 260 - MONEDAS_INICIALES);
  assert.deepEqual(f.comprados, ['at_lenca']);
  const s = fusionarCuentas(
    cuenta({ monedas: 500, sueltas: { fecha: '2026-11-24', hoy: 250 } }),
    cuenta({ monedas: 500, sueltas: { fecha: '2026-11-24', hoy: 200 } }),
  );
  const exceso = 250 + 200 - MONEDAS_SUELTAS.porDia;
  assert.equal(s.monedas, 1000 - MONEDAS_INICIALES - exceso * PREMIOS.world.coinPickup);
  assert.deepEqual(s.sueltas, { fecha: '2026-11-24', hoy: MONEDAS_SUELTAS.porDia });
  const otroDia = fusionarCuentas(
    cuenta({ sueltas: { fecha: '2026-11-23', hoy: 300 } }),
    cuenta({ sueltas: { fecha: '2026-11-24', hoy: 10 } }),
  );
  assert.deepEqual(otroDia.sueltas, { fecha: '2026-11-24', hoy: 10 });
});

test('el saldo nunca queda negativo y juntar cuentas vacías no fabrica monedas', () => {
  const f = fusionarCuentas(cuenta({ monedas: 0 }), cuenta({ monedas: 0, logros: [] }));
  assert.equal(f.monedas, 0);
  // diez cuentas nuevas juntadas una por una no suman nada
  let queda = cuenta();
  for (let i = 0; i < 10; i++) {
    const f2 = fusionarCuentas(queda, cuenta({ logros: ['primer_paso'], monedas: 100 + coins('primer_paso') }));
    queda = cuenta({ monedas: f2.monedas, logros: f2.logros });
  }
  assert.equal(queda.monedas, MONEDAS_INICIALES + coins('primer_paso'));
});
