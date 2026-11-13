import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHAT, SALA } from '@mundo-catrucho/reglas';
import { iniciarBloqueos, recibirChat } from '../src/chat.ts';
import { RitmoSala } from '../src/ritmo.ts';

test('cubetas en memoria por jugador: reconectar no recarga; borrar o despertar sí', () => {
  const ritmo = new RitmoSala();
  for (const [tipo, n] of [
    ['chat', CHAT.ritmo.rafaga],
    ['general', SALA.ritmo.rafaga],
  ]) {
    for (let i = 0; i < n; i++) assert.equal(ritmo.gastar('ana', tipo, 100), true);
    assert.equal(ritmo.gastar('ana', tipo, 100), false);
    assert.equal(ritmo.gastar('beto', tipo, 100), true);
    assert.equal(new RitmoSala().gastar('ana', tipo, 100), true);
  }
  ritmo.borrar('ana');
  assert(ritmo.gastar('ana', 'chat', 100));
  assert(ritmo.gastar('ana', 'general', 100));
});

test('el pase viejo no borra el bloqueo del socket ni restaura uno que ya quitaste', async () => {
  const datos = new Map();
  const storage = {
    get: async (k) => datos.get(k),
    put: async (k, v) => datos.set(k, v),
    transaction: async (f) => f(storage),
  };
  const ctx = { storage };
  const yo = { id: 'eli', nombre: 'Eli', sala: 'mapa:0' };
  const ritmo = new RitmoSala();
  await iniciarBloqueos(ctx, yo.id, []);
  await recibirChat(ctx, [], {}, yo, { t: 'bloquear', id: 'carla' }, '', ritmo);
  await iniciarBloqueos(ctx, yo.id, []);
  assert.deepEqual(datos.get('bloqueos:eli'), ['carla']);
  await recibirChat(ctx, [], {}, yo, { t: 'bloquear', id: 'carla', si: false }, '', ritmo);
  await iniciarBloqueos(ctx, yo.id, ['carla']);
  assert.deepEqual(datos.get('bloqueos:eli'), []);
  await iniciarBloqueos(ctx, yo.id, ['carla'], Date.now() + 1);
  assert.deepEqual(datos.get('bloqueos:eli'), ['carla'], 'el pase nuevo sí actualiza');
});
