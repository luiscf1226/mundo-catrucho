// Pase firmado de sala (MC-18): firma, vencimiento, sala exacta y avatar limpio.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import {
  firmarPase,
  idPublico,
  nombreSala,
  partirSala,
  SALA,
  salaValida,
  verificarPase,
  zonaValida,
} from '../src/index.ts';

const secreto = randomBytes(32).toString('hex'),
  otro = randomBytes(32).toString('hex');
const datos = { id: 'abc123', nombre: 'Ana <b>', sala: 'mapa:0', avatar: { skin: '#c98f5f', hat: 'gorra', mal: 'x' } };

test('un pase bueno pasa y trae lo limpio', async () => {
  const p = await firmarPase(datos, secreto, 1000);
  const r = await verificarPase(p, secreto, 'mapa:0', 2000);
  assert.equal(r.ok, true);
  assert.equal(r.pase.nombre, 'Ana b');
  assert.equal(r.pase.vence, 1000 + SALA.paseMs);
  assert.deepEqual(r.pase.avatar, { skin: '#c98f5f', hat: 'gorra' });
});

test('sin pase, vencido, de otra sala o con otro secreto: rechazado', async () => {
  const p = await firmarPase(datos, secreto, 1000);
  assert.deepEqual(await verificarPase(null, secreto, 'mapa:0'), { ok: false, motivo: 'sin-pase' });
  assert.deepEqual(await verificarPase('', secreto, 'mapa:0'), { ok: false, motivo: 'sin-pase' });
  assert.deepEqual(await verificarPase(p, secreto, 'mapa:0', 1000 + SALA.paseMs + 1), { ok: false, motivo: 'vencido' });
  assert.deepEqual(await verificarPase(p, secreto, 'mapa:1', 2000), { ok: false, motivo: 'otra-sala' });
  assert.deepEqual(await verificarPase(p, otro, 'mapa:0', 2000), { ok: false, motivo: 'firma' });
  assert.deepEqual(await verificarPase('basura', secreto, 'mapa:0'), { ok: false, motivo: 'roto' });
  assert.deepEqual(await verificarPase(`${p}.x`, secreto, 'mapa:0'), { ok: false, motivo: 'roto' });
});

test('cambiar los datos rompe la firma', async () => {
  const p = await firmarPase(datos, secreto, 1000);
  const [cuerpo, firma] = p.split('.');
  const json = JSON.parse(Buffer.from(cuerpo, 'base64url').toString());
  json.vence = 9e15;
  json.sala = 'mapa:5';
  const falso = `${Buffer.from(JSON.stringify(json)).toString('base64url')}.${firma}`;
  assert.deepEqual(await verificarPase(falso, secreto, 'mapa:5', 2000), { ok: false, motivo: 'firma' });
});

test('base64url igual al de Node', async () => {
  for (let n = 1; n < 40; n++) {
    const nombre = 'ñ'.repeat(n % 7) + 'x'.repeat(n);
    const p = await firmarPase({ ...datos, nombre }, secreto, 1000);
    const [cuerpo] = p.split('.');
    assert.equal(JSON.parse(Buffer.from(cuerpo, 'base64url').toString()).nombre, nombre.slice(0, SALA.nombreMax));
    assert.equal((await verificarPase(p, secreto, 'mapa:0', 2000)).ok, true);
  }
});

test('secreto corto o sala inválida: error', async () => {
  await assert.rejects(firmarPase(datos, 'corto'));
  await assert.rejects(verificarPase('a.b', 'corto', 'mapa:0'));
  await assert.rejects(firmarPase({ ...datos, sala: 'juego:x' }, secreto));
});

test('id público estable, distinto por cuenta y por secreto', async () => {
  const a = await idPublico('usuario1', secreto);
  assert.equal(a, await idPublico('usuario1', secreto));
  assert.equal(a.length, 12);
  assert.notEqual(a, await idPublico('usuario2', secreto));
  assert.notEqual(a, await idPublico('usuario1', otro));
});

test('nombres de sala y tramos', () => {
  assert.deepEqual(partirSala('mapa:0'), { zona: 'mapa', tramo: 0 });
  assert.deepEqual(partirSala('dept:olancho:3'), { zona: 'dept:olancho', tramo: 3 });
  assert.equal(salaValida(`mapa:${SALA.tramosMax}`), false);
  assert.equal(salaValida('mapa:01'), false);
  assert.equal(salaValida('dept:Olancho:0'), false);
  assert.equal(salaValida('juego:abc'), false);
  assert.equal(salaValida(3), false);
  assert.ok(zonaValida('dept:islasdelabahia'));
  assert.equal(zonaValida('dept:'), false);
  assert.equal(nombreSala('mapa', 2), 'mapa:2');
});
