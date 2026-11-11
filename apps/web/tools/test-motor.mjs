import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './harness.mjs';

const [file, motor, elegido] = process.argv.slice(2);
if (!file || !motor) throw new Error('Uso: test-motor.mjs <html> <motorId> [juegoId]');
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const catalogos = readdirSync(resolve(raiz, 'shared/data/catalogo')).filter((f) => f.endsWith('.json'));
const juegos = catalogos.flatMap((f) =>
  Object.entries(JSON.parse(readFileSync(resolve(raiz, 'shared/data/catalogo', f), 'utf8'))).flatMap(([dept, c]) =>
    c.juegos.filter((j) => j[2] === motor).map((j) => `${dept}.${j[0]}`),
  ),
);
const juego = elegido ?? juegos[0];
assert.ok(juego, 'El motor necesita al menos un juego del catálogo');
const sinGpu = process.env.MC_GPU === '0';
const capturas = resolve(raiz, '../../capturas/mc-32', `${motor}${sinGpu ? '-sin-gpu' : ''}`);
const ok = await run('motor', file, { hash: '#test', width: 1280, height: 800 }, async (t) => {
  await t.click('btn-jugar');
  await t.click('ed-done');
  await t.waitFor('window.__mc.store.getState().profile.created && !window.__mc.store.getState().panel');
  if (!sinGpu) await t.ev('window.__mc.gl.setPixelRatio(1.5)');
  const estado = () => t.ev('window.__mcTest.motor.estado()');
  async function abrir(catalogo, modo = 'solo') {
    await t.ev(
      `window.__mc.store.getState().setModo(${JSON.stringify(modo)}); window.__mc.store.getState().${catalogo ? 'startJuego' : 'startMinigame'}(${JSON.stringify(catalogo ? juego : motor)})`,
    );
    await t.waitFor(
      `window.__mcTest?.motor?.estado().id === ${JSON.stringify(motor)} && window.__mc.store.getState().mg.phase === 'intro'`,
    );
    await t.click('mg-start');
    await t.waitFor("window.__mc.store.getState().mg.phase === 'playing'");
  }
  async function completar(bot) {
    await t.ev(`window.__mcTest.motor.jugarBot(${bot}); window.__mcTest.motor.avanzar(123)`);
    await t.waitFor("!!document.querySelector('[data-testid=mg-result]')");
    const s = await estado();
    assert.ok(s.duracion >= 60 && s.duracion <= 120, 'Duración 60–120 s');
    assert.equal(s.tiempo, s.duracion, 'Termina al vencer el reloj');
    assert.ok(s.terminado);
    return t.ev('window.__mc.store.getState().mg.result');
  }
  await abrir(false);
  const inicial = await estado();
  await t.ev("window.__mc.store.getState().openPanel('pausa')");
  const pausado = await estado();
  await t.ev('window.__mcTest.motor.avanzar(10)');
  assert.deepEqual(await estado(), pausado, 'Pausa detiene la simulación');
  await t.ev('window.__mc.store.getState().closePanel()');
  assert.ok(inicial.cuenta > 0, 'Cuenta regresiva');
  const derrota = await completar(false);
  assert.equal(derrota.won, false, 'Sin jugar se pierde');
  await t.shot(`${capturas}/sin-tema-derrota.png`);
  await abrir(true);
  assert.equal((await estado()).etapa, 0);
  await t.ev('window.__mcTest.motor.jugarBot(); window.__mcTest.motor.avanzar(14)');
  assert.ok((await estado()).puntos > 0, 'El bot juega acciones y suma antes del fin');
  const tiempo = (await estado()).tiempo;
  await t.waitFor(`window.__mcTest.motor.estado().tiempo > ${tiempo}`, 15000, 'El reloj corre con cuadros reales');
  const render = await t.calls();
  assert.ok(render && render.calls < 350, `Presupuesto de dibujo: ${render?.calls}`);
  console.log(`PASA etapa 1, reloj, pausa y dibujo (${render.calls} llamadas)`);
  await t.shot(`${capturas}/etapa-1-jugando.png`);
  const resultado = await completar(true);
  assert.ok(resultado.won, 'La primera etapa se gana');
  assert.ok(resultado.stars >= 1);
  await t.ev('window.__mc.store.getState().toasts.forEach(t => window.__mc.store.getState().dropToast(t.id))');
  await t.shot(`${capturas}/etapa-1-victoria.png`);
  assert.equal(
    await t.ev(`window.__mc.store.getState().profile.juegos[${JSON.stringify(juego)}].etapa`),
    1,
    'Guarda avance',
  );
  // Recargar verifica la persistencia real, sin inyectar puntajes ni progreso.
  await t.ev('location.reload()');
  await t.waitFor('!!window.__mc');
  assert.equal(
    await t.ev(`window.__mc.store.getState().profile.juegos[${JSON.stringify(juego)}].etapa`),
    1,
    'Conserva avance tras recargar',
  );
  if (sinGpu) {
    console.log('SALTA última etapa y modos sin GPU; primera etapa completa con simulación de pasos fijos');
    return;
  }
  // Ganar las intermedias por el mismo camino que usa el jugador desbloquea la última.
  await abrir(true, 'duo');
  assert.equal((await estado()).bots, 1);
  await t.shot(`${capturas}/duo.png`);
  assert.ok((await completar(true)).won, 'Dúo jugable');
  for (;;) {
    await abrir(true, 'abierto');
    const s = await estado();
    assert.equal(s.bots, 3);
    if (s.etapa === s.etapas - 1) {
      await t.ev('window.__mcTest.motor.jugarBot(); window.__mcTest.motor.avanzar(14)');
      await t.ev('window.__mc.store.getState().toasts.forEach(t => window.__mc.store.getState().dropToast(t.id))');
      await t.shot(`${capturas}/ultima-abierto.png`);
      const r = await completar(true);
      assert.equal(typeof r.won, 'boolean');
      assert.ok(s.metas[0] >= inicial.metas[0], 'La dificultad sube las metas');
      break;
    }
    assert.ok((await completar(true)).won, 'Desbloquea la etapa siguiente');
  }
  await abrir(false, 'duo');
  assert.ok((await completar(true)).won, 'Motor sin tema con compa');
  assert.equal(t.errors.length, 0, 'Sin excepciones ni red no permitida');
});
process.exitCode = ok ? 0 : 1;
