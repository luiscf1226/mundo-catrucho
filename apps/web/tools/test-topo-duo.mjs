// En dúo, el compa de Topo no rompe sellos ni resta puntos aunque tu tirón vaya disparejo.
// Uso: node tools/test-topo-duo.mjs <html>
import { run } from './harness.mjs';

const S = 'window.__mc.store.getState()';
const ok = await run('topo-duo', process.argv[2], { hash: '#test,go' }, async (t) => {
  await t.waitFor(`!!document.querySelector('canvas')`);
  await t.sleep(1000);
  await t.ev(`${S}.startMinigame('cortes.topo')`);
  await t.waitFor(`!!document.querySelector('[data-testid=mg-intro]')`, 10000);
  await t.click('mg-modo-duo');
  await t.click('mg-start');
  await t.waitFor(`${S}.mg?.phase==='playing'`);
  await t.sleep(4000); // cuenta regresiva
  await t.hold('d', 2500); // tirón izquierdo al máximo y el derecho quieto: muy disparejo
  await t.sleep(3000);
  const st = await t.ev(`JSON.stringify(window.__mcTest.motor.estado())`);
  console.log(st.slice(0, 300));
  const e = JSON.parse(st),
    rotas = e.stats?.rotas ?? e.datos?.rotas;
  if (rotas > 0) throw new Error(`el compa rompió ${rotas} sellos sin que pulsaras nada`);
});
process.exit(ok ? 0 : 1);
