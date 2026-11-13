import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { ayudaEnPaso, MODOS_PREDETERMINADOS, validarModos } from '../src/game/minigames/kit/modos.ts';
import { run } from './harness.mjs';

assert.equal(MODOS_PREDETERMINADOS.duo.tipo, 'apoyo');
assert.equal(MODOS_PREDETERMINADOS.abierto.tipo, 'ambiente');
assert.equal(ayudaEnPaso(3.99, 0.05, 4), false);
assert.equal(ayudaEnPaso(4.01, 0.05, 4), true);
assert.equal(ayudaEnPaso(2.01, 0.05, 6, 4), true);
assert.throws(() => validarModos({ ...MODOS_PREDETERMINADOS, duo: { tipo: 'compartido', cada: 0 } }));
const capturas = fileURLToPath(new URL('../../../capturas/mc-26/', import.meta.url));
const file = process.argv[2] ?? 'apps/web/dist/mundo-catrucho-hd.html';
const ok = await run('modos-motor', file, { hash: '#test', width: 1280, height: 800 }, async (t) => {
  await t.waitFor("!!document.querySelector('[data-testid=menu]')", 60000, 'El menú terminó de cargar');
  await t.click('btn-jugar');
  await t.click('ed-done');
  await t.waitFor('window.__mc.store.getState().profile.created && !window.__mc.store.getState().panel');
  const estado = () => t.ev('window.__mcTest.motor.estado()');
  async function abrir(id, modo) {
    await t.ev(`window.__mc.store.getState().setModo('${modo}'); window.__mc.store.getState().startMinigame('${id}')`);
    await t.waitFor(
      `window.__mcTest?.motor?.estado().id === '${id}' && window.__mc.store.getState().mg.phase === 'intro'`,
    );
    await t.click('mg-start');
    await t.waitFor("window.__mc.store.getState().mg.phase === 'playing'");
  }
  for (const id of ['intibuca.papas', 'cortes.gruas']) {
    await abrir(id, 'solo');
    await t.ev('window.__mcTest.motor.avanzar(43)');
    const solo = await estado();
    assert.equal(solo.ayudas, 0);
    assert.equal(solo.puntos, 0, 'La inacción en solo no recibe contribuciones');
    for (const modo of ['duo', 'abierto']) {
      await abrir(id, modo);
      assert.equal((await estado()).ayudas, 0, 'Intento nuevo sin ayudas anteriores');
      await t.ev("window.__mc.store.getState().openPanel('pausa')");
      const pausa = await estado();
      await t.ev('window.__mcTest.motor.avanzar(10)');
      assert.deepEqual(await estado(), pausa);
      await t.ev('window.__mc.store.getState().closePanel(); window.__mcTest.motor.avanzar(3)');
      assert.equal((await estado()).ayudas, 0, 'Sin ayudas durante la cuenta regresiva');
      await t.ev('window.__mcTest.motor.avanzar(40)');
      const s = await estado();
      assert.equal(s.bots, modo === 'duo' ? 1 : s.modos.abierto.bots);
      if (modo === 'abierto' && s.modos.abierto.tipo === 'ambiente') {
        assert.equal(s.ayudas, 0);
        assert.equal(s.puntos, solo.puntos, 'Ambiente no modifica puntos');
      } else {
        assert.ok(s.ayudas > 0, 'La declaración programa acciones sin jugador automático');
        assert.ok(s.puntos > solo.puntos, 'Los bots contribuyen mediante las acciones reales del motor');
      }
      await t.waitFor(
        `document.querySelector('[data-testid=mg-hud]')?.textContent.includes('${modo === 'duo' ? 'Dúo' : 'Abierto'}')`,
        15000,
        'El HUD refleja el modo declarado',
      );
      await t.ev('window.__mc.store.getState().toasts.forEach(t => window.__mc.store.getState().dropToast(t.id))');
      await t.waitFor("!document.querySelector('[data-testid=celebration]')", 15000, 'El cartel deja ver el motor');
      await t.shot(`${capturas}${id}-${modo}.png`);
      await t.ev('window.__mcTest.motor.avanzar(123)');
      const fin = await estado();
      await t.ev('window.__mcTest.motor.avanzar(10)');
      assert.deepEqual(await estado(), fin, 'No contribuyen después del cierre');
      console.log(`PASA ${id} ${modo}: ${s.ayudas} ayudas, ${s.puntos} pts; pausa, cuenta y cierre`);
    }
  }
  assert.equal(t.errors.length, 0);
});
process.exitCode = ok ? 0 : 1;
