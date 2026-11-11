import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { createDrive, stepDrive, vehicles } from '../src/game/viaje/model.ts';
import { run } from './harness.mjs';

const casos = [
  ['pickup', 'franciscomorazan', 'lapaz', 'carretera'],
  ['mototaxi', 'copan', 'copan', 'ciudad'],
  ['bicitaxi', 'valle', 'valle', 'ciudad'],
  ['lancha', 'atlantida', 'islas', 'mar'],
  ['ferry', 'atlantida', 'islas', 'mar'],
  ['avioneta', 'atlantida', 'graciasadios', 'cielo'],
  ['cayuco', 'graciasadios', 'graciasadios', 'rio'],
];
const medidas = [];
for (const [veh, , , via] of casos) {
  const c = { veh, via, trip: true, difficulty: 0.35, seed: 504 };
  const simular = (steer, pedal, segundos) => {
    const s = createDrive(c);
    s.traffic = [];
    s.speed = 0;
    for (let i = 0; i < segundos * 20; i++) stepDrive(s, c, 0.05, steer, pedal, false);
    return s;
  };
  const recto = simular(0, -1, 30),
    curva = simular(1, -1, 30),
    deriva = simular(0, -1, 1);
  assert.ok(recto.speed > curva.speed, `${veh}: curva reduce velocidad`);
  assert.ok(recto.speed <= vehicles[veh].speed + 0.01);
  const antes = recto.speed;
  for (let i = 0; i < 20; i++) stepDrive(recto, c, 0.05, 0, 1, false);
  assert.ok(recto.speed < antes);
  if (['mar', 'rio', 'cielo'].includes(via)) assert.ok(Math.abs(deriva.x) > 0.01);
  medidas.push({
    veh,
    maxima_kmh: +(antes * 3.6).toFixed(1),
    freno_1s: +((antes - recto.speed) * 3.6).toFixed(1),
    deriva_1s: +deriva.x.toFixed(3),
  });
}
const legado = { veh: 'cayuco', via: 'rio', trip: false, difficulty: 0, seed: 504 };
const partida = createDrive(legado);
partida.traffic = [];
for (let i = 0; i < 90 * 20; i++) stepDrive(partida, legado, 0.05, 0, -1, false);
assert.ok(partida.distance > 850, 'El minijuego de cayuco conserva el alcance de su meta');
console.table(medidas);
console.log('PASA manejo diferenciado sin renderizador');
const file = process.argv[2] ?? resolve('apps/web/dist/mundo-catrucho-hd.html');
const shots = resolve(process.env.MC_GPU === '0' ? 'capturas/mc-30/sin-gpu' : 'capturas/mc-30');
const ok = await run('vehiculos', file, { hash: '#go,test', touch: true }, async (t) => {
  for (const [veh, de, a] of casos) {
    await t.ev(
      `window.__mc.store.getState().travel('${de}'); window.__mc.store.getState().addCoins(100); window.__mc.store.getState().openPanel('transporte')`,
    );
    await t.waitFor(`!!document.querySelector('[data-testid=tr-to-${a}]')`);
    await t.ev(`document.querySelector('[data-testid=tr-to-${a}]').click()`);
    await t.waitFor(`!!document.querySelector('[data-testid=tr-veh-${veh}]')`);
    await t.ev(`document.querySelector('[data-testid=tr-veh-${veh}]').click()`);
    await t.waitFor(`document.querySelector('[data-testid=tr-veh-${veh}]')?.getAttribute('aria-pressed')==='true'`);
    await t.waitFor(
      `document.querySelector('[data-testid=panel-transporte]').getAnimations().every(a=>a.playState!=='running')`,
    );
    await t.ev(`document.querySelector('[data-testid=tr-go]').click()`);
    await t.waitFor(
      `document.querySelector('[data-testid=viaje-tramo]')?.dataset.vehiculo==='${veh}' && +document.querySelector('[data-testid=viaje-hud]').dataset.speed > 0`,
    );
    const x = await t.ev(`+document.querySelector('[data-testid=viaje-hud]').dataset.x`);
    await t.holdUntil('d', `+document.querySelector('[data-testid=viaje-hud]').dataset.x > ${x + 0.5}`);
    await t.holdUntil('a', `+document.querySelector('[data-testid=viaje-hud]').dataset.x < ${x + 0.3}`);
    const joy = await t.ev(
      `(()=>{const b=document.querySelector('[data-testid=touch-joy]').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}})()`,
    );
    const antesTacto = await t.ev(`+document.querySelector('[data-testid=viaje-hud]').dataset.x`);
    await t.drag(joy.x, joy.y, joy.x + 60, joy.y, 30);
    await t.waitFor(`+document.querySelector('[data-testid=viaje-hud]').dataset.x > ${antesTacto + 0.1}`);
    await t.click('viaje-horn');
    const calls = await t.calls();
    assert.ok(calls.calls < 350, `${veh}: ${JSON.stringify(calls)}`);
    console.log(veh, calls);
    await t.shot(`${shots}/${veh}.png`);
    await t.click('viaje-skip');
    await t.waitFor(
      `window.__mc.store.getState().scene.kind==='dept' && window.__mc.store.getState().scene.id==='${a}'`,
    );
  }
  if (process.env.MC_GPU !== '0') {
    await t.ev(
      `window.__mc.store.getState().travel('colon'); window.__mc.store.getState().addCoins(100); window.__mc.store.getState().startViaje('avioneta','graciasadios')`,
    );
    await t.waitFor(`document.querySelector('[data-testid=viaje-tramo]')?.dataset.medio==='carretera'`);
    await t.waitFor(`document.querySelector('[data-testid=viaje-tramo]')?.dataset.medio==='avioneta'`, 95000);
    await t.waitFor(`+document.querySelector('[data-testid=viaje-hud]').dataset.speed > 80`);
    await t.shot(`${shots}/conexion-avioneta.png`);
    await t.click('viaje-skip');
  } else console.log('SALTA conexión larga sin GPU; siete vehículos y controles verificados');
  // El estado rechaza opciones incompatibles sin cobrar.
  await t.ev(`window.__mc.store.getState().travel('valle')`);
  assert.equal(await t.ev(`window.__mc.store.getState().startViaje('bicitaxi','cortes')`), false);
  assert.equal(await t.ev(`window.__mc.store.getState().startViaje('taxi','islas')`), false);
});
process.exitCode = ok ? 0 : 1;
