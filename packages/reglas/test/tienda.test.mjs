// La pulpería del servidor: precios de shop.json, nada de comprar sin saldo, equipar solo lo que tenés.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ARTICULOS,
  articuloPorId,
  cambiosDe,
  decidirCompra,
  decidirEquipar,
  GRATIS,
  limpiarAvatar,
  MONEDAS_INICIALES,
  poseidos,
} from '../src/index.ts';

test('el perfil nuevo empieza con 100 Lempiritas, como el juego local', () => {
  assert.equal(MONEDAS_INICIALES, 100);
});

test('comprar descuenta el precio de shop.json', () => {
  const gorra = articuloPorId('gorra');
  assert.equal(gorra.price, 50);
  assert.deepEqual(decidirCompra({ saldo: 120, comprados: [], itemId: 'gorra' }), { ok: true, precio: 50, saldo: 70 });
  assert.deepEqual(decidirCompra({ saldo: 50, comprados: [], itemId: 'gorra' }), { ok: true, precio: 50, saldo: 0 });
});

test('no se puede comprar sin Lempiritas suficientes', () => {
  assert.deepEqual(decidirCompra({ saldo: 49, comprados: [], itemId: 'gorra' }), {
    ok: false,
    motivo: 'caro',
    falta: 1,
  });
  assert.equal(decidirCompra({ saldo: 0, comprados: [], itemId: 'corona_carnaval' }).motivo, 'caro');
  assert.equal(decidirCompra({ saldo: Number.NaN, comprados: [], itemId: 'gorra' }).motivo, 'caro');
});

test('un artículo que no existe o que solo viene en un atuendo no se vende', () => {
  assert.equal(decidirCompra({ saldo: 9999, comprados: [], itemId: 'yate_de_oro' }).motivo, 'no');
  assert.equal(decidirCompra({ saldo: 9999, comprados: [], itemId: 'camisa_olimpia' }).motivo, 'no');
});

test('lo que ya tenés no se vuelve a cobrar: comprado, gratis o pieza de un atuendo', () => {
  assert.equal(decidirCompra({ saldo: 999, comprados: ['gorra'], itemId: 'gorra' }).motivo, 'ya');
  assert.equal(decidirCompra({ saldo: 999, comprados: [], itemId: 'jeans' }).motivo, 'ya');
  // el atuendo gratis «De la cancha» se pone entero, pero su gorra se compra aparte (como en el juego local)
  assert.ok(GRATIS.includes('at_cancha'));
  assert.equal(poseidos([]).has('gorra'), false);
  assert.equal(decidirCompra({ saldo: 999, comprados: ['at_cancha'], itemId: 'gorra' }).motivo, 'ya');
  // y el campesino trae su sombrero de junco (que solo se vende por 100)
  assert.equal(decidirCompra({ saldo: 999, comprados: ['at_campesino'], itemId: 'sombrero_junco' }).motivo, 'ya');
});

test('equipar rechaza lo que no tenés, lo que no existe y los emotes', () => {
  assert.deepEqual(decidirEquipar({ comprados: [], itemId: 'corona_carnaval' }), { ok: false, motivo: 'no-tenes' });
  assert.deepEqual(decidirEquipar({ comprados: [], itemId: 'nada' }), { ok: false, motivo: 'no' });
  assert.deepEqual(decidirEquipar({ comprados: ['emote_gol'], itemId: 'emote_gol' }), { ok: false, motivo: 'no' });
  assert.deepEqual(decidirEquipar({ comprados: ['corona_carnaval'], itemId: 'corona_carnaval' }), {
    ok: true,
    cambios: { hat: 'corona_carnaval' },
  });
});

test('equipar un atuendo pone todo su set menos cuerpo y piel', () => {
  const r = decidirEquipar({ comprados: ['at_lenca'], itemId: 'at_lenca' });
  assert.ok(r.ok);
  assert.deepEqual(r.cambios, articuloPorId('at_lenca').set);
  const pieza = decidirEquipar({ comprados: ['at_lenca'], itemId: 'vestido_lenca' });
  assert.deepEqual(pieza, { ok: true, cambios: { shirt: 'vestido_lenca' } });
});

test('limpiarAvatar deja colores, cuerpo y piezas propias en su ranura', () => {
  const limpio = limpiarAvatar(
    {
      body: 'm',
      skin: '#4f2f1c',
      hatColor: '#FFFFFF',
      shirtColor: 'rojo',
      hat: 'corona_carnaval',
      shirt: 'jeans',
      hair: 'pelo_largo',
      monedas: '9999',
      body2: 'x',
    },
    [],
  );
  assert.deepEqual(limpio, { body: 'm', skin: '#4f2f1c', hatColor: '#FFFFFF', hair: 'pelo_largo' });
  assert.deepEqual(limpiarAvatar({ hat: 'corona_carnaval' }, ['corona_carnaval']), { hat: 'corona_carnaval' });
});

test('todos los atuendos traen piezas que existen', () => {
  for (const a of ARTICULOS.filter((i) => i.cat === 'atuendo'))
    for (const [k, id] of Object.entries(a.set ?? {}))
      if (!k.endsWith('Color')) assert.ok(articuloPorId(id), `${a.id}: ${id} no existe`);
});

test('cambiosDe no revisa si lo tenés; decidirEquipar sí', () => {
  assert.deepEqual(cambiosDe('gorra'), { hat: 'gorra' });
  assert.equal(cambiosDe('emote_gol'), null);
  assert.equal(cambiosDe('nada'), null);
  // los atuendos gratis no regalan sus piezas con precio: la gorra de «De la cancha» no se pone suelta
  assert.deepEqual(decidirEquipar({ comprados: [], itemId: 'gorra' }), { ok: false, motivo: 'no-tenes' });
});
