// Partida entre amigos (MC-25): acta y recibo firmados, puntajes acotados y que un recibo pague una sola vez.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import {
  acotarPuntos,
  decidirRecibo,
  duracionPartida,
  filaDe,
  firmarActa,
  firmarDatos,
  firmarPase,
  firmarRecibo,
  leerActa,
  motorJuntos,
  PARTIDA,
  partirSalaCerrada,
  salaValida,
  verificarPase,
  verificarRecibo,
} from '../src/index.ts';

const secreto = randomBytes(32).toString('hex'),
  otro = randomBytes(32).toString('hex');
const motor = 'franciscomorazan.rosquilla',
  base = { motor, etapa: 0, etapas: 4 };
const dura = duracionPartida(motor, 0, 4);
const ahora = Date.now();
const recibo = (cambios = {}) => ({
  partidaId: 'p123456',
  ...base,
  duracion: dura,
  momento: ahora,
  resultados: [
    filaDe(base, { id: 'ana', nombre: 'Ana', puntos: 120, salio: false }),
    filaDe(base, { id: 'beto', nombre: 'Beto', puntos: 40, salio: true }),
  ],
  ...cambios,
});
const partida = (cambios = {}) => ({
  estado: 'abierta',
  ...base,
  inicio: ahora - (dura + 5) * 1000,
  jugadores: [
    { usuarioId: 'u-ana', idPublico: 'ana' },
    { usuarioId: 'u-beto', idPublico: 'beto' },
  ],
  ...cambios,
});

test('salas cerradas: juego y viaje con id, aparte de las de zona', () => {
  assert.deepEqual(partirSalaCerrada('juego:k57abc123'), { tipo: 'juego', id: 'k57abc123' });
  assert.deepEqual(partirSalaCerrada('viaje:Ab_9-xyz'), { tipo: 'viaje', id: 'Ab_9-xyz' });
  for (const n of ['juego:', 'juego:abc', 'juego:a/b/c/d/e', 'mapa:0', 'otra:abcdefg', `viaje:${'x'.repeat(41)}`])
    assert.equal(partirSalaCerrada(n), null, n);
  // el pase de zona sigue sin aceptar salas cerradas: esas las firma Convex con sus propias reglas
  assert.equal(salaValida('juego:k57abc123'), false);
});

test('el pase de una sala cerrada sirve solo para esa sala', async () => {
  const p = await firmarPase({ id: 'ana', nombre: 'Ana', sala: 'juego:p123456' }, secreto);
  assert.equal((await verificarPase(p, secreto, 'juego:p123456')).ok, true);
  assert.equal((await verificarPase(p, secreto, 'juego:p999999')).ok, false);
});

test('solo los motores del kit se juegan juntos, con su reloj', () => {
  assert.equal(motorJuntos(motor), true);
  assert.equal(motorJuntos('futbol'), false);
  assert.ok(dura >= 60 && dura <= 120, `duración ${dura}`);
});

test('acta: firmada, vigente y completa', async () => {
  const acta = { partidaId: 'p123456', ...base, semilla: 42, cupo: 2, vence: ahora + PARTIDA.actaMs };
  const t = await firmarActa(acta, secreto);
  assert.deepEqual(await leerActa(t, secreto), acta);
  assert.equal(await leerActa(t, otro), null, 'otro secreto');
  assert.equal(await leerActa(await firmarActa({ ...acta, vence: ahora - 1 }, secreto), secreto), null, 'vencida');
  assert.equal(await leerActa(await firmarActa({ ...acta, motor: 'futbol' }, secreto), secreto), null, 'sin kit');
  // un pase o un recibo no sirven como acta, aunque estén bien firmados
  assert.equal(await leerActa(await firmarDatos('recibo', acta, secreto), secreto), null);
  const pase = await firmarPase({ id: 'x', nombre: 'X', sala: 'juego:p123456' }, secreto);
  assert.equal(await leerActa(pase, secreto), null);
});

test('recibo: verifica, y alterado o con otra llave no', async () => {
  const r = recibo(),
    t = await firmarRecibo(r, secreto);
  assert.deepEqual(await verificarRecibo(t, secreto), r);
  assert.equal(await verificarRecibo(t, otro), null, 'otra llave');
  // cambiar los puntos dentro del cuerpo (sin volver a firmar) rompe la firma
  const [cuerpo, firma] = t.split('.');
  const json = JSON.parse(Buffer.from(cuerpo, 'base64url').toString());
  json.resultados[1].puntos = 9999;
  const falso = `${Buffer.from(JSON.stringify(json)).toString('base64url')}.${firma}`;
  assert.equal(await verificarRecibo(falso, secreto), null, 'puntos alterados');
  assert.equal(await verificarRecibo(`${cuerpo}.${firma.slice(0, -2)}AA`, secreto), null, 'firma alterada');
  assert.equal(await verificarRecibo(`${t}.x`, secreto), null);
  assert.equal(await verificarRecibo(null, secreto), null);
  // un acta firmada con los mismos datos no es un recibo
  assert.equal(await verificarRecibo(await firmarDatos('acta', r, secreto), secreto), null);
});

test('decidirRecibo paga a cada jugador una vez', () => {
  const d = decidirRecibo({ partidaId: 'p123456', recibo: recibo(), partida: partida(), ahora });
  assert.equal(d.tipo, 'pagar');
  const [ana, beto] = d.pagos;
  assert.equal(ana.usuarioId, 'u-ana');
  assert.ok(ana.gano && ana.premio && ana.premio.monedas > 0, JSON.stringify(ana));
  // Beto se fue a medias: cobra el consuelo con lo que llevaba
  assert.equal(beto.gano, false);
  assert.ok(beto.premio && beto.premio.monedas > 0);
});

test('un recibo repetido, de otra partida, vencido o adelantado no paga', () => {
  const r = recibo();
  assert.deepEqual(decidirRecibo({ partidaId: 'p123456', recibo: r, partida: partida({ estado: 'cerrada' }), ahora }), {
    tipo: 'error',
    motivo: 'cerrada',
  });
  assert.equal(decidirRecibo({ partidaId: 'otra000', recibo: r, partida: partida(), ahora }).motivo, 'otra-partida');
  assert.equal(
    decidirRecibo({ partidaId: 'p123456', recibo: recibo({ etapa: 3 }), partida: partida(), ahora }).motivo,
    'otra-partida',
  );
  assert.equal(
    decidirRecibo({ partidaId: 'p123456', recibo: r, partida: partida(), ahora: ahora + PARTIDA.reciboMaxMs + 1 })
      .motivo,
    'vencido',
  );
  // la partida se abrió hace 10 s: no pudo durar el reloj completo
  assert.equal(
    decidirRecibo({ partidaId: 'p123456', recibo: r, partida: partida({ inicio: ahora - 10_000 }), ahora }).motivo,
    'muy-pronto',
  );
});

test('filas de extraños se ignoran; un puntaje imposible no cobra', () => {
  const r = recibo({
    resultados: [
      { id: 'colado', nombre: 'Colado', puntos: 100, estrellas: 1, gano: true, salio: false },
      { id: 'ana', nombre: 'Ana', puntos: 99999, estrellas: 3, gano: true, salio: false },
      { id: 'ana', nombre: 'Ana', puntos: 120, estrellas: 1, gano: true, salio: false },
    ],
  });
  const d = decidirRecibo({ partidaId: 'p123456', recibo: r, partida: partida(), ahora });
  assert.equal(d.tipo, 'pagar');
  assert.equal(d.pagos.length, 1);
  assert.equal(d.pagos[0].premio, null);
  assert.ok(d.pagos[0].motivos.length > 0);
  const vacio = recibo({
    resultados: [{ id: 'colado', nombre: 'C', puntos: 1, estrellas: 0, gano: false, salio: false }],
  });
  assert.equal(decidirRecibo({ partidaId: 'p123456', recibo: vacio, partida: partida(), ahora }).motivo, 'vacio');
});

test('acotarPuntos: nada negativo, nada que no quepa en el tiempo jugado', () => {
  const a = (puntos, segundos) => acotarPuntos({ ...base, puntos, segundos });
  assert.equal(a(-50, 30), 0);
  assert.equal(a('mucho', 30), 0);
  assert.equal(a(Number.NaN, 30), 0);
  assert.equal(a(150, 30), 150);
  // 20 pts/s del kit: en 10 s no se hacen 100 000
  assert.ok(a(100_000, 10) <= 20 * 12, `${a(100_000, 10)}`);
  // el puntaje acotado al final siempre pasa validarResultado
  const max = a(1e9, dura);
  const fila = filaDe(base, { id: 'ana', nombre: 'Ana', puntos: max, salio: false });
  const d = decidirRecibo({ partidaId: 'p123456', recibo: recibo({ resultados: [fila] }), partida: partida(), ahora });
  assert.ok(d.pagos[0].premio, d.pagos[0].motivos.join(', '));
});
