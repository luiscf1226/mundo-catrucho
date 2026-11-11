import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { lineaDeViaje, resolverRuta, segundosDeViaje, VIAJES } from '../src/game/viaje/routes.ts';
import { run } from './harness.mjs';

for (const fuente of VIAJES.rutas) {
  const ruta = resolverRuta(fuente.de, fuente.a, [fuente.medio]);
  assert.ok(ruta);
  assert.equal(ruta.segundos, segundosDeViaje(ruta.horas));
  const regreso = resolverRuta(fuente.a, fuente.de, [fuente.medio]);
  assert.ok(Math.abs(regreso.horas - ruta.horas) < 0.00001);
  let anterior = -1;
  for (let i = 0; i <= 100; i++) {
    const linea = lineaDeViaje(ruta, (ruta.segundos * i) / 100);
    assert.ok(linea.posicion >= 0 && linea.posicion <= 1);
    if (linea.kilometros !== null) {
      assert.ok(linea.kilometros >= anterior - 0.00001);
      anterior = linea.kilometros;
    }
  }
  assert.ok(Math.abs(lineaDeViaje(ruta, ruta.segundos).posicion - 1) < 0.00001);
}
assert.equal(segundosDeViaje(0.1), 40);
assert.equal(segundosDeViaje(2), 50);
assert.equal(segundosDeViaje(4), 100);
assert.equal(segundosDeViaje(20), 240);
assert.equal(resolverRuta('cortes', 'islas'), null);
const norte = resolverRuta('franciscomorazan', 'cortes');
assert.ok(Math.abs(norte.kilometros - 244.8) < 0.00001);
assert.ok(norte.tramos.every((t) => t.carretera === 'CA-5 norte'));
assert.deepEqual(
  norte.tramos.map((t) => t.nombre),
  VIAJES.rutas[0].paisaje.concat(VIAJES.rutas[11].paisaje),
);
assert.deepEqual(
  resolverRuta('cortes', 'franciscomorazan').tramos.map((t) => t.nombre),
  norte.tramos.map((t) => t.nombre).toReversed(),
);
for (const [de, a, indices] of [
  ['franciscomorazan', 'choluteca', [3, 4]],
  ['cortes', 'atlantida', [12, 13]],
]) {
  const ruta = resolverRuta(de, a);
  assert.deepEqual(
    ruta.tramos.map((t) => t.nombre),
    indices.flatMap((i) => VIAJES.rutas[i].paisaje),
  );
  assert.deepEqual(
    [...new Set(ruta.tramos.map((t) => t.carretera))],
    [...new Set(indices.map((i) => VIAJES.rutas[i].carretera))],
  );
}
assert.equal(lineaDeViaje(norte, -5).posicion, 0);
assert.equal(lineaDeViaje(norte, 9999).posicion, 1);
console.log('PASA modelo de rutas');

const file = process.argv[2] ?? resolve('apps/web/dist/mundo-catrucho-hd.html');
const shots = resolve(process.env.MC_GPU === '0' ? 'capturas/mc-27/sin-gpu' : 'capturas/mc-27');
const ok = await run('rutas', file, { hash: '#go,test' }, async (t) => {
  for (const [de, a, carretera] of [
    ['franciscomorazan', 'cortes', 'CA-5 norte'],
    ['franciscomorazan', 'choluteca', 'CA-5 sur'],
    ['cortes', 'atlantida', 'CA-13'],
  ]) {
    if (process.env.MC_GPU === '0' && a !== 'cortes') {
      console.log(`SALTA capturas adicionales de ${a} sin GPU; modelo completo verificado`);
      continue;
    }
    const ruta = resolverRuta(de, a);
    await t.ev(
      `window.__mc.store.getState().travel('${de}'); window.__mc.store.getState().addCoins(100); window.__mc.store.getState().openPanel('transporte')`,
    );
    await t.ev(`document.querySelector('[data-testid=tr-to-${a}]')?.scrollIntoView({block:'center'})`);
    await t.waitFor(`(()=>{
      const e=document.querySelector('[data-testid=tr-to-${a}]');
      if (!e) return false;
      const b=e.getBoundingClientRect();
      return e.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));
    })()`);
    await t.click(`tr-to-${a}`);
    await t.waitFor(`document.querySelector('[data-testid=tr-to-${a}]')?.getAttribute('aria-pressed') === 'true'`);
    assert.ok((await t.text('tr-ruta')).includes(carretera));
    await t.shot(`${shots}/${a}-terminal.png`);
    await t.click('tr-go');
    await t.waitFor(
      `window.__mc.store.getState().scene.kind === 'viaje' && window.__mc.store.getState().scene.to === '${a}' && document.querySelector('[data-testid=viaje-tramo]')?.textContent.includes('${carretera}')`,
    );
    const primerPaisaje = await t.ev(`document.querySelector('[data-testid=viaje-tramo]').dataset.paisaje`);
    await t.shot(`${shots}/${a}-salida.png`);
    await t.waitFor(
      `document.querySelector('[data-testid=viaje-tramo]')?.dataset.paisaje !== '${primerPaisaje}'`,
      ruta.segundos * 1000,
    );
    const calls = await t.calls();
    assert.ok(calls.calls < 350, JSON.stringify(calls));
    console.log(`${de} → ${a}`, calls);
    await t.shot(`${shots}/${a}-paisaje.png`);
    if (a === 'atlantida') {
      await t.waitFor(
        `document.querySelector('[data-testid=viaje-tramo]')?.dataset.paisaje === 'costa'`,
        ruta.segundos * 1000,
      );
      await t.shot(`${shots}/${a}-costa.png`);
    }
    await t.click('viaje-skip');
    await t.waitFor(
      `window.__mc.store.getState().scene.kind === 'dept' && window.__mc.store.getState().scene.id === '${a}'`,
    );
  }
});
process.exitCode = ok ? 0 : 1;
