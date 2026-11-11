// Desde la parada de bus de un departamento se abre la terminal con ese departamento como origen:
// en Islas de la Bahía ofrece barco o lancha a Atlántida. Uso: node tools/test-terminal-depto.mjs <html>
import { run } from './harness.mjs';

const file = process.argv[2];
const S = 'window.__mc.store.getState()';
const ok = await run('terminal-depto', file, { hash: '#test,go' }, async (t) => {
  await t.waitFor(`!!document.querySelector('canvas')`);
  await t.ev(`${S}.travel('islas')`);
  await t.waitFor(`${S}.scene.kind==='dept' && !!window.__mcTest?.dept && window.__mcTest.dept.id==='islas'`, 15000);
  const [x, , z] = await t.ev('window.__mcTest.dept.bus');
  await t.ev(`window.__mc.player.teleport(${x}, 0.5, ${z})`);
  await t.waitFor(
    `(document.querySelector('[data-testid=prompt]')?.innerText ?? '').includes('Terminal')`,
    8000,
    'aviso de la terminal',
  );
  await t.press('e');
  await t.waitFor(`${S}.panel==='transporte'`, 5000, 'la parada abre la terminal');
  await t.click('tr-to-atlantida');
  const barcos = await t.ev(`['ferry','lancha'].filter(v=>!!document.querySelector('[data-testid=tr-veh-'+v+']'))`);
  if (!barcos.length) throw new Error('desde Islas no se ofrece barco ni lancha a Atlántida');
  console.log('desde Islas a Atlántida:', barcos.join(', '));
});
process.exit(ok ? 0 : 1);
