import assert from 'node:assert/strict';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { run } from './harness.mjs';

const [file, lado = 'despues'] = process.argv.slice(2);
assert.ok(file, 'Uso: test-pulido.mjs <html> [antes|despues]');
assert.ok(['antes', 'despues'].includes(lado));
const ids = [
  'franciscomorazan.rosquilla',
  'franciscomorazan.baleada',
  'franciscomorazan.artesania',
  'franciscomorazan.repartidor',
  'franciscomorazan.niebla',
  'olancho.batea',
  'olancho.arreo',
  'olancho.calcita',
  'olancho.cuajada',
  'olancho.postura',
  'olancho.tablas',
  'cortes.chuco',
  'cortes.gruas',
  'cortes.cortina',
  'cortes.garitas',
  'cortes.merendon',
  'cortes.cusuco',
  'cortes.topo',
];
const juegos = readdirSync('apps/web/shared/data/catalogo')
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) =>
    Object.entries(JSON.parse(readFileSync('apps/web/shared/data/catalogo/' + f))).flatMap(([d, c]) =>
      c.juegos.map((j) => ({ id: d + '.' + j[0], motor: j[2] })),
    ),
  );
const medidas = {};
for (const vertical of [false, true]) {
  const ok = await run(
    'pulido',
    file,
    { hash: '#test', width: vertical ? 390 : 1280, height: vertical ? 844 : 720, touch: vertical },
    async (t) => {
      await t.click('btn-jugar');
      await t.click('ed-done');
      for (const id of vertical ? ['olancho.arreo', 'cortes.gruas', 'franciscomorazan.baleada'] : ids) {
        const juego = juegos.find((j) => j.motor === id);
        await t.ev(`window.__mc.store.getState().startJuego(${JSON.stringify(juego.id)})`);
        await t.waitFor(`window.__mcTest?.motor?.estado().id===${JSON.stringify(id)}`);
        await t.click('mg-start');
        await t.ev(
          'window.__mcTest.motor.jugarBot();window.__mcTest.motor.avanzar(14);window.__mc.store.getState().toasts.forEach(t=>window.__mc.store.getState().dropToast(t.id))',
        );
        const time = await t.ev('window.__mcTest.motor.estado().tiempo');
        await t.waitFor(`window.__mcTest.motor.estado().tiempo>${time}`);
        await t.waitFor("!document.querySelector('[data-testid=celebration]')");
        medidas[id + (vertical ? '-vertical' : '')] = await t.calls();
        assert.ok(medidas[id + (vertical ? '-vertical' : '')].calls < 350, `Presupuesto de dibujo de ${id}`);
        await t.shot(resolve(`capturas/pulido/${lado}-${id}${vertical ? '-vertical' : ''}.png`));
      }
      assert.deepEqual(t.errors, [], 'Sin errores ni red externa');
    },
  );
  if (!ok) process.exit(1);
}
writeFileSync(`capturas/pulido/${lado}.json`, JSON.stringify(medidas, null, 2));
