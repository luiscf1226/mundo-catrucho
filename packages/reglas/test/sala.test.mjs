// Topes de la sala: posiciones, animaciones, nombres y ritmo de mensajes.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ANIMACIONES,
  acotarEje,
  animacionPermitida,
  cubetaNueva,
  emoteValido,
  limpiarNombre,
  permitirMensaje,
  SALA,
} from '../src/index.ts';

test('posiciones recortadas a los límites de siempre', () => {
  assert.equal(acotarEje('x', 1e9), 1000);
  assert.equal(acotarEje('z', -1e9), -1000);
  assert.equal(acotarEje('y', -80), -50);
  assert.equal(acotarEje('y', 600), 500);
  assert.equal(acotarEje('yaw', 3.2), 3.2);
  assert.equal(acotarEje('yaw', 99), 10);
  assert.equal(acotarEje('x', '5'), 0);
  assert.equal(acotarEje('x', Number.NaN), 0);
  assert.equal(acotarEje('x', undefined), 0);
});

test('animaciones: las 20 del kit; lo demás es idle', () => {
  assert.equal(ANIMACIONES.length, 20);
  assert.equal(animacionPermitida('run'), 'run');
  assert.equal(animacionPermitida('victoria'), 'victoria');
  assert.equal(animacionPermitida('volar'), 'idle');
  assert.equal(animacionPermitida(3), 'idle');
});

test('nombre y emote', () => {
  assert.equal(limpiarNombre('Ana <script>'), 'Ana script');
  assert.equal(limpiarNombre('ñáé_-😀 12345678901234567890'), 'ñáé_- 1234567890');
  assert.equal(limpiarNombre('!!!'), 'Catracho');
  assert.equal(limpiarNombre(null), 'Catracho');
  assert.ok(emoteValido('emote_punta'));
  assert.equal(emoteValido('x'.repeat(SALA.emoteMax + 1)), false);
  assert.equal(emoteValido(5), false);
  assert.equal(emoteValido('<script>'), false);
  assert.equal(emoteValido('emote_'), false);
});

test('ritmo: ráfaga permitida, luego solo lo sostenido', () => {
  const c = cubetaNueva(0);
  let ok = 0;
  for (let i = 0; i < 100; i++) if (permitirMensaje(c, 0)) ok++;
  assert.equal(ok, SALA.ritmo.rafaga);
  assert.equal(permitirMensaje(c, 10), false, '10 ms no recargan una ficha');
  // un segundo después hay fichas para `porSegundo` mensajes
  ok = 0;
  for (let i = 0; i < 100; i++) if (permitirMensaje(c, 1000)) ok++;
  assert.equal(ok, SALA.ritmo.porSegundo);
  // quien manda a 10 por segundo nunca se queda sin fichas
  const d = cubetaNueva(0);
  for (let t = 0; t < 60_000; t += 100) assert.ok(permitirMensaje(d, t));
  // el reloj hacia atrás no regala fichas
  const e = cubetaNueva(5000);
  for (let i = 0; i < SALA.ritmo.rafaga; i++) permitirMensaje(e, 5000);
  assert.equal(permitirMensaje(e, 0), false);
});
