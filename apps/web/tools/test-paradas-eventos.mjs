import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { acciones, admiteEvento, crearAgenda, limiteDeEvento } from '../src/game/viaje/eventos/agenda.ts';
import { resolverRuta, VIAJES } from '../src/game/viaje/routes.ts';
import { run } from './harness.mjs';

const vistos = new Set();
// el pesaje de equipaje (18) va en tierra, al final del tramo de carretera justo antes de volar o embarcar
const pesajeEnTierra = (ruta, c) => {
  const k = ruta.tramos.indexOf(c.tramo);
  assert.equal(c.tramo.medio, 'carretera', 'el pesaje no puede caer en pleno vuelo ni en el mar');
  assert.ok(['avioneta', 'lancha'].includes(ruta.tramos[k + 1]?.medio), 'el pesaje va justo antes de embarcar');
};
for (const fuente of VIAJES.rutas) {
  for (const [de, a] of [
    [fuente.de, fuente.a],
    [fuente.a, fuente.de],
  ]) {
    const ruta = resolverRuta(de, a, [fuente.medio]);
    for (let seed = 0; seed < 20; seed++) {
      const agenda = crearAgenda(ruta, seed),
        eventos = agenda.filter((c) => c.tipo === 'evento');
      // una ruta solo aérea puede no tener eventos: en el aire nada te detiene
      const minimo = fuente.medio === 'carretera' ? 2 : fuente.medio === 'avioneta' ? 0 : 1;
      assert.ok(eventos.length >= minimo && eventos.length <= 4);
      for (const c of eventos) {
        const i = VIAJES.eventosDeCarretera.findIndex((e) => e.nombre === c.nombre);
        if (i === 18) pesajeEnTierra(ruta, c);
        else assert.ok(admiteEvento(i, c.tramo));
        vistos.add(i);
        assert.ok(c.segundo >= 0 && c.segundo < ruta.segundos);
        if (c.km !== null) assert.ok(c.km >= c.tramo.desdeKm && c.km <= c.tramo.hastaKm);
      }
    }
  }
}
// rutas con taxi y luego avioneta o lancha: ahí sí sale el pesaje, en tierra
for (const fuente of VIAJES.rutas.filter((f) => f.medio === 'avioneta' || f.medio === 'lancha')) {
  for (const destino of [fuente.a, fuente.de]) {
    for (const origen of ['franciscomorazan', 'cortes', 'atlantida', 'colon']) {
      if (origen === destino) continue;
      const ruta = resolverRuta(origen, destino, ['carretera', fuente.medio]);
      if (!ruta?.tramos.some((t) => t.medio === fuente.medio)) continue;
      for (let seed = 0; seed < 20; seed++)
        for (const c of crearAgenda(ruta, seed).filter((x) => x.nombre === VIAJES.eventosDeCarretera[18].nombre)) {
          pesajeEnTierra(ruta, c);
          vistos.add(18);
        }
    }
  }
}
assert.equal(vistos.size, 20, 'Los veinte eventos deben poder aparecer');
for (const a of acciones) assert.ok(limiteDeEvento(a, 0) < 10);
assert.ok(limiteDeEvento('rodear', 4) > limiteDeEvento('rodear', 0));
console.log('PASA agenda de 20 eventos, tramos, medios, regresos y límites de manejo');
const file = process.argv[2] ?? resolve('apps/web/dist/mundo-catrucho-hd.html');
const shots = resolve(process.env.MC_GPU === '0' ? 'capturas/mc-28-29/sin-gpu' : 'capturas/mc-28-29');
const ok = await run('paradas-eventos', file, { hash: '#go,test' }, async (t) => {
  for (const [de, a] of [
    ['franciscomorazan', 'choluteca'],
    ['franciscomorazan', 'cortes'],
    ['cortes', 'atlantida'],
  ]) {
    const ruta = resolverRuta(de, a),
      agenda = crearAgenda(ruta);
    await t.ev(
      `window.__mc.store.getState().travel('${de}'); window.__mc.store.getState().addCoins(100); window.__mc.store.getState().startViaje('rapidito','${a}')`,
    );
    await t.waitFor(`!!window.__mcCamino && !!document.querySelector('[data-testid=viaje-hud]')`);
    let compro = false;
    for (const c of agenda) {
      await t.ev(`window.__mcCamino.avanzar(Math.max(0,${c.segundo + 0.2}-window.__mcCamino.estado().elapsed),0)`);
      await t.waitFor(
        `document.querySelector('[data-testid=viaje-evento]')?.dataset.evento===${JSON.stringify(c.nombre)}`,
      );
      await t.ev('window.__mcCamino.avanzar(2)');
      const v = await t.ev('window.__mcCamino.estado().speed');
      assert.ok(v <= limiteDeEvento(c.accion, 0) + 0.2, `${c.nombre}: ${v}`);
      if (c.accion === 'rodear') {
        await t.ev('window.__mcCamino.avanzar(0.8,4)');
        assert.ok((await t.ev('window.__mcCamino.estado().speed')) > 2, 'Rodear permite acelerar');
      }
      if (c.accion === 'comprar') {
        await t.waitFor(`!!document.querySelector('[data-testid=viaje-vendedor] button:not(:disabled)')`);
        const id = await t.ev(`document.querySelector('[data-testid=viaje-vendedor] button').dataset.testid`);
        assert.ok(id.includes(c.id), `la comida es de esta parada: ${id}`); // en otra parada se puede volver a comprar
        const antes = await t.ev('window.__mc.store.getState().profile.coins');
        await t.click(id);
        assert.equal(await t.ev('window.__mc.store.getState().profile.coins'), antes - 5);
        await t.ev(`document.querySelector('[data-testid=${id}]').click()`);
        assert.equal(await t.ev('window.__mc.store.getState().profile.coins'), antes - 5, 'No cobra dos veces');
        compro = true;
      }
      if (c.accion === 'pagar') {
        const antes = await t.ev('window.__mc.store.getState().profile.coins');
        await t.click('viaje-peaje');
        assert.equal(await t.ev('window.__mc.store.getState().profile.coins'), antes - 2);
      } else {
        const frame = await t.ev('window.__mc.gl.info.render.frame');
        await t.waitFor(`window.__mc.gl.info.render.frame > ${frame + 2}`);
        await t.shot(`${shots}/${a}-${c.id}.png`);
        await t.click('viaje-evento-seguir');
      }
      const calls = await t.calls();
      assert.ok(calls.calls < 350, JSON.stringify(calls));
    }
    assert.ok(compro, 'Se compró comida del tramo');
    await t.click('viaje-skip');
    await t.waitFor(
      `window.__mc.store.getState().scene.kind==='dept' && window.__mc.store.getState().scene.id==='${a}'`,
    );
  }
});
process.exitCode = ok ? 0 : 1;
