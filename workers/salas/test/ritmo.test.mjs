import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHAT, SALA } from '@mundo-catrucho/reglas';
import { gastarRitmo } from '../src/ritmo.ts';

test('chat y ritmo general sobreviven a otra conexión y a otra instancia', async () => {
  const datos = new Map();
  const storage = {
    get: async (k) => structuredClone(datos.get(k)),
    put: async (k, v) => datos.set(k, structuredClone(v)),
    transaction: async (f) => f(storage),
  };
  for (const [tipo, n] of [
    ['chat', CHAT.ritmo.rafaga],
    ['general', SALA.ritmo.rafaga],
  ]) {
    for (let i = 0; i < n; i++) assert.equal(await gastarRitmo({ storage }, 'ana', tipo), true);
    assert.equal(await gastarRitmo({ storage }, 'ana', tipo), false);
    assert.equal(await gastarRitmo({ storage: { ...storage } }, 'ana', tipo), false);
    assert.equal(await gastarRitmo({ storage }, 'beto', tipo), true);
  }
});
