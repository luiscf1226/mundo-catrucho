// Taxi y asaltante en Tegucigalpa, jugados con el teclado: manejar hasta el primer pasajero y dejarlo,
// correr hasta una bolsa de pisto y guardarla en la guarida.
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './harness.mjs';

const file = process.argv[2];
if (!file) throw new Error('Uso: test-capital.mjs <html>');
// sin GPU cada segundo de juego tarda varios segundos reales
const lento = process.env.MC_GPU === '0' ? 6 : 1;
const capturas = resolve(dirname(fileURLToPath(import.meta.url)), '../../../capturas/capital');
const ok = await run('capital', file, { hash: '#test', width: 1280, height: 800 }, async (t) => {
  await t.click('btn-jugar');
  await t.click('ed-done');
  await t.waitFor('window.__mc.store.getState().profile.created && !window.__mc.store.getState().panel');
  if (process.env.MC_GPU !== '0') await t.ev('window.__mc.gl.setPixelRatio(1.5)');
  const pos = () => t.ev('[...window.__mc.player.pos]');
  const hud = () => t.ev('JSON.stringify(window.__mc.store.getState().mgHud)');
  async function abrir(juego, motor) {
    await t.ev(`window.__mc.store.getState().setModo('solo'); window.__mc.store.getState().startJuego('${juego}')`);
    await t.waitFor(
      `window.__mcTest?.motor?.estado().id === '${motor}' && window.__mc.store.getState().mg.phase === 'intro'`,
    );
    await t.click('mg-start');
    await t.waitFor('window.__mcTest.motor.estado().cuenta === 0', 20000 * lento, 'termina la cuenta regresiva');
  }

  // ---- Taxi: arranca en el carril derecho mirando al norte; el primer pasajero espera 28 m adelante
  await abrir('franciscomorazan.taxi-a-toda-mecha', 'franciscomorazan.taxi');
  assert.equal(await t.ev('window.__mc.player.vehicle?.kind'), 'Car', 'Vas manejando el taxi');
  const z0 = (await pos())[2];
  await t.holdUntil('w', 'window.__mc.player.pos[2] < -5', 20000 * lento);
  assert.ok((await pos())[2] < z0 - 15, 'W acelera hacia adelante');
  await t.holdUntil('s', `JSON.stringify(window.__mc.store.getState().mgHud).includes('Llevá a')`, 20000 * lento);
  console.log('PASA frenar en la marca sube al pasajero');
  await t.press('f');
  await t.waitFor('window.__mc.player.vehicle.maxSpeed > 16', 5000 * lento, 'F prende el turbo');
  console.log('PASA turbo');
  await t.waitFor('window.__mc.player.vehicle.maxSpeed === 16', 10000 * lento, 'el turbo se apaga solo');
  await t.shot(`${capturas}/taxi-pasajero-arriba.png`);
  const yaw0 = await t.ev('window.__mc.player.yaw');
  await t.down('w');
  await t.hold('a', 900);
  await t.up('w');
  assert.notEqual(await t.ev('window.__mc.player.yaw'), yaw0, 'A gira el taxi');
  assert.match(await hud(), /m al (norte|noreste|este|sureste|sur|suroeste|oeste|noroeste)/, 'El HUD dice para dónde');
  // dejar al pasajero con el piloto de prueba y comprobar que paga
  await t.ev('window.__mcTest.motor.jugarBot(true)');
  await t.waitFor('window.__mcTest.motor.estado().stats.entregas >= 1', 30000 * lento, 'entrega al pasajero');
  await t.ev('window.__mcTest.motor.jugarBot(false)');
  assert.ok((await t.ev('window.__mcTest.motor.estado().puntos')) > 0, 'La entrega paga');
  await t.shot(`${capturas}/taxi-entrega.png`);
  console.log('PASA taxi con teclado');

  if (process.env.MC_GPU === '0') {
    // sin GPU el juego va a ~1 cuadro por segundo: correr a pie no cabe; test-motor cubre su lógica
    console.log('SALTA asaltante con teclado sin GPU');
    assert.equal(t.errors.length, 0, 'Sin excepciones ni red no permitida');
    return;
  }
  // ---- Asaltante: sale de la guarida mirando al norte; hay una bolsa en la acera de la izquierda
  await abrir('franciscomorazan.corre-que-viene-la-chepa', 'franciscomorazan.asalto');
  assert.equal(await t.ev('window.__mc.player.vehicle'), null, 'El asaltante va a pie');
  await t.holdUntil('w', 'window.__mc.player.pos[2] < 14', 20000 * lento);
  await t.holdUntil('a', 'window.__mcTest.motor.estado().stats.lleva === 1', 20000 * lento);
  assert.ok((await t.ev('window.__mc.player.speedMul')) < 1, 'Cargar pisto te vuelve más lento');
  console.log('PASA juntar una bolsa');
  await t.shot(`${capturas}/asalto-bolsa.png`);
  await t.holdUntil('d', 'window.__mc.player.pos[0] > -2.6', 20000 * lento);
  await t.holdUntil('s', 'window.__mcTest.motor.estado().stats.guardadas === 1', 20000 * lento);
  assert.ok((await t.ev('window.__mcTest.motor.estado().puntos')) >= 25, 'Guardar paga');
  assert.equal(await t.ev('window.__mc.player.speedMul'), 1, 'Sin carga corrés normal');
  console.log('PASA guardar en la guarida');
  // la otra bolsa cercana está en la acera de enfrente
  await t.ev('window.__mc.player.teleport(5.2, 0.2, 19.5)');
  await t.waitFor('window.__mcTest.motor.estado().stats.lleva === 1', 10000 * lento, 'junta la segunda bolsa');
  await t.shot(`${capturas}/asalto-noche.png`);
  // quieto junto a un contenedor de la esquina, quedás escondido
  await t.ev('window.__mc.player.teleport(-4.4, 0.2, 4.4)');
  await t.waitFor('window.__mcTest.motor.estado().stats.escondido === 1', 10000 * lento, 'se esconde');
  await t.shot(`${capturas}/asalto-escondido.png`);
  await t.holdUntil('w', 'window.__mcTest.motor.estado().stats.escondido === 0', 5000 * lento);
  console.log('PASA escondite');
  // vista general: chepos con su anillo de vista, bolsas, escondites y patrullas
  await t.ev('window.__mc.player.fixedCam = { pos: [0, 70, 55], target: [0, 0, 2], fov: 55 }');
  await t.sleep(1500);
  await t.shot(`${capturas}/asalto-vista-general.png`);
  await t.ev('window.__mc.player.fixedCam = null');
  assert.equal(t.errors.length, 0, 'Sin excepciones ni red no permitida');
});
process.exitCode = ok ? 0 : 1;
