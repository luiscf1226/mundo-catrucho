// Abrir y cerrar partidas: duración medida por el servidor, puntajes imposibles, cerrar dos veces, partidas ajenas.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DURACION_MAX_S, decidirApertura, decidirCierre, PREMIOS, xpParaNivel } from '../src/index.ts';

const SUELTOS = ['carrera', 'futbol', 'trivia'];
const T0 = 1_700_000_000_000;
// cortes.chuco en la etapa 0 de 3: reloj de 70 s y metas 100 / 300 / 500
const abierta = (extra = {}) => ({
  estado: 'abierta',
  jugadores: ['u1'],
  motor: 'cortes.chuco',
  etapa: 0,
  etapas: 3,
  inicio: T0,
  ...extra,
});
const cerrar = ({
  segundos = 75,
  partida = abierta(),
  usuarioId = 'u1',
  avance = { nivel: 1, xp: 0 },
  ...cierre
} = {}) =>
  decidirCierre({
    partida,
    usuarioId,
    ahora: T0 + segundos * 1000,
    cierre: { puntos: 320, estrellas: 2, gano: true, ...cierre },
    avance,
  });

test('abrir: el motor y las etapas salen del catálogo, no del navegador', () => {
  const juego = { motor: 'cortes.chuco', etapas: 3 };
  assert.deepEqual(decidirApertura({ motor: 'cortes.chuco', etapa: 2, juego, motoresSueltos: SUELTOS }), {
    ok: true,
    motor: 'cortes.chuco',
    etapa: 2,
    etapas: 3,
  });
  assert.equal(decidirApertura({ motor: 'trivia', etapa: 0, juego, motoresSueltos: SUELTOS }).ok, false);
  assert.equal(decidirApertura({ motor: 'cortes.chuco', etapa: 3, juego, motoresSueltos: SUELTOS }).ok, false);
  assert.equal(decidirApertura({ motor: 'cortes.chuco', etapa: -1, juego, motoresSueltos: SUELTOS }).ok, false);
  assert.equal(decidirApertura({ motor: 'cortes.chuco', etapa: 0.5, juego, motoresSueltos: SUELTOS }).ok, false);
});

test('abrir un minijuego suelto: motor conocido y una sola etapa', () => {
  assert.deepEqual(decidirApertura({ motor: 'trivia', etapa: 0, juego: null, motoresSueltos: SUELTOS }), {
    ok: true,
    motor: 'trivia',
    etapa: 0,
    etapas: 1,
  });
  assert.equal(decidirApertura({ motor: 'inventado', etapa: 0, juego: null, motoresSueltos: SUELTOS }).ok, false);
  assert.equal(decidirApertura({ motor: 'trivia', etapa: 1, juego: null, motoresSueltos: SUELTOS }).ok, false);
});

test('cerrar una partida posible paga premioPartida y sube de nivel con ganarXp', () => {
  const R = PREMIOS.minigame,
    d = cerrar();
  assert.equal(d.tipo, 'pagada');
  const xp = R.win.xp + 2 * R.perStar.xp;
  assert.equal(d.xp, xp);
  assert.equal(xp >= xpParaNivel(1), true, 'el ejemplo debe subir de nivel');
  assert.equal(d.monedas, R.win.coins + 2 * R.perStar.coins);
  assert.equal(d.bono, PREMIOS.levelUp.coins);
  assert.deepEqual(d.avance, { nivel: 2, xp: xp - xpParaNivel(1), subidas: 1 });
  assert.equal(d.duracion, 75);
});

test('perder paga el consuelo', () => {
  const d = cerrar({ puntos: 40, estrellas: 0, gano: false, avance: { nivel: 3, xp: 0 } });
  assert.equal(d.tipo, 'pagada');
  assert.equal(d.monedas, PREMIOS.minigame.lose.coins);
  assert.equal(d.xp, PREMIOS.minigame.lose.xp);
  assert.equal(d.bono, 0);
});

test('un puntaje imposible se rechaza y no paga', () => {
  const d = cerrar({ puntos: 50_000, estrellas: 3 });
  assert.equal(d.tipo, 'rechazada');
  assert.ok(d.motivos.some((m) => m.includes('no caben')));
  assert.equal('monedas' in d, false);
  assert.equal(cerrar({ puntos: 120, estrellas: 3 }).tipo, 'rechazada', 'tres estrellas con 120 pts');
  assert.equal(cerrar({ puntos: -5, estrellas: 0, gano: false }).tipo, 'rechazada');
});

test('la duración es la del servidor: terminar antes del reloj del motor se rechaza', () => {
  const corta = cerrar({ segundos: 10 });
  assert.equal(corta.tipo, 'rechazada');
  assert.equal(corta.duracion, 10);
  assert.ok(corta.motivos.some((m) => m.includes('no se puede en menos')));
  // con la holgura de latencia (2 s) por debajo del reloj de 70 s todavía se acepta
  assert.equal(cerrar({ segundos: 68.5 }).tipo, 'pagada');
  assert.equal(cerrar({ segundos: 67 }).tipo, 'rechazada');
});

test('una partida abierta de más se vence sin pagar', () => {
  const d = cerrar({ segundos: DURACION_MAX_S + 1 });
  assert.equal(d.tipo, 'vencida');
});

test('no se cierra dos veces', () => {
  for (const estado of ['cerrada', 'rechazada', 'vencida'])
    assert.deepEqual(cerrar({ partida: abierta({ estado }) }), { tipo: 'error', motivo: 'cerrada' });
});

test('una partida ajena no se toca', () => {
  assert.deepEqual(cerrar({ usuarioId: 'u2' }), { tipo: 'error', motivo: 'ajena' });
  // ajena gana sobre cerrada: no se le dice a otro jugador en qué estado está
  assert.deepEqual(cerrar({ usuarioId: 'u2', partida: abierta({ estado: 'cerrada' }) }), {
    tipo: 'error',
    motivo: 'ajena',
  });
});
