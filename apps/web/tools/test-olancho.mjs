import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { locuraCaminando, lugaresTuristicos } from './explorar.mjs';
import { run } from './harness.mjs';

const file = process.argv[2] ?? 'apps/web/dist/mundo-catrucho-hd.html';
const raiz = resolve(import.meta.dirname, '../../..');
const contenido = JSON.parse(readFileSync(resolve(raiz, 'docs/generador/contenido.json'))).olancho;
const capturas = resolve(raiz, 'capturas/mc-50');
const locuras = JSON.parse(readFileSync(resolve(raiz, 'apps/web/src/game/dept/zones/olancho-puntos.json')));
const ok = await run('olancho', file, { hash: '#test', width: 1280, height: 800 }, async (t) => {
  await t.click('btn-jugar');
  await t.click('ed-done');
  await t.ev("window.__mc.store.getState().travel('olancho')");
  await t.waitFor(
    "window.__mcTest?.dept?.id === 'olancho' && window.__mcTest?.lugares?.st?.some(s=>s.booths.some(b=>b.id.startsWith('olancho.')))",
  );
  const puestos = await t.ev('window.__mcTest.lugares.st.flatMap(s=>s.booths)');
  assert.equal(puestos.length, 12);
  await t.shot(`${capturas}/departamento.png`);
  for (const p of puestos) {
    await t.ev(`window.__mc.player.teleport(...${JSON.stringify(p.use)})`);
    await t.waitFor("document.querySelector('[data-testid=prompt]')?.textContent.includes('Jugar:')");
    await t.press('e');
    await t.waitFor("!!document.querySelector('[data-testid=mg-intro]')");
    assert.equal(await t.ev('window.__mc.store.getState().mg.juego'), p.id);
    await t.click('mg-back');
    await t.waitFor("!window.__mc.store.getState().mg && window.__mcTest.dept.id==='olancho'");
  }
  assert.equal(await lugaresTuristicos(t, 'olancho'), 6);
  // las tres locuras abren su ficha al llegar caminando
  assert.deepEqual(
    locuras.map((l) => l.nombre),
    contenido.locuras.map((l) => l.nombre),
  );
  for (const [i, l] of locuras.entries()) {
    await locuraCaminando(t, { x: l.pos[0], z: l.pos[1], nombre: l.nombre, texto: l.texto });
    await t.shot(`${capturas}/locura-${i + 1}.png`);
    await t.click('dialog-close');
  }
  async function abrir(id) {
    await t.ev(`window.__mc.store.getState().setModo('solo'); window.__mc.store.getState().startMinigame('${id}')`);
    await t.waitFor(`window.__mcTest?.motor?.estado().id === '${id}'`);
    await t.click('mg-start');
    await t.ev('window.__mcTest.motor.avanzar(3.1)');
  }
  await abrir('olancho.batea');
  await t.press('f');
  await t.waitFor('window.__mcTest.motor.estado().stats.perdidas > 0');
  await abrir('olancho.calcita');
  await t.press('e');
  await t.waitFor('window.__mcTest.motor.estado().stats.malas > 0');
  await abrir('olancho.cuajada');
  await t.press('f');
  await t.waitFor('window.__mcTest.motor.estado().stats.peso === 1');
  await abrir('olancho.postura');
  await t.holdUntil('w', 'window.__mcTest.motor.estado().stats.paso > .2');
  await abrir('olancho.arreo');
  await t.holdUntil('w', 'window.__mcTest.motor.estado().stats.dispersion > 0');
  await abrir('olancho.tablas');
  await t.holdUntil('w', 'window.__mcTest.motor.estado().stats.y < -.7');
  await t.press('f');
  await t.holdUntil('s', 'window.__mcTest.motor.estado().stats.y > .7');
  await t.press('f');
  await t.waitFor('window.__mcTest.motor.estado().stats.malas > 0');
  await t.ev(
    `window.__pad={id:'Mando de prueba',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))}; navigator.getGamepads=()=>[window.__pad]`,
  );
  await t.ev('window.__pad.axes[2]=1');
  const xAntes = await t.ev('window.__mcTest.motor.estado().stats.x');
  await t.waitFor(`window.__mcTest.motor.estado().stats.x > ${xAntes + 0.1}`);
  await t.ev('window.__pad.axes[2]=0');
  console.log('PASA mando: el stick derecho mueve el cursor del corte');
  console.log('PASA controles reales: sedimentación prematura, extracción inválida, peso, marcha y corte con nudo');
  await t.ev('window.__pad.connected=false');
  for (const id of ['batea', 'arreo', 'calcita', 'cuajada', 'postura', 'tablas']) {
    await abrir(`olancho.${id}`);
    await t.ev('window.__mcTest.motor.jugarBot(); window.__mcTest.motor.avanzar(10)');
    await t.ev('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
    await t.shot(`${capturas}/${id}.png`);
  }
  assert.equal(t.errors.length, 0, t.errors.join('\n'));
});
const tactil = await run('olancho táctil', file, { hash: '#test', touch: true, width: 900, height: 700 }, async (t) => {
  await t.click('btn-jugar');
  await t.click('ed-done');
  await t.ev("window.__mc.store.getState().startMinigame('olancho.cuajada')");
  await t.waitFor("window.__mcTest?.motor?.estado().id === 'olancho.cuajada'");
  await t.click('mg-start');
  await t.ev('window.__mcTest.motor.avanzar(3.1)');
  await t.click('touch-fire');
  await t.waitFor('window.__mcTest.motor.estado().stats.peso === 1');
  await t.shot(`${capturas}/tactil.png`);
  assert.equal(t.errors.length, 0, t.errors.join('\n'));
});
process.exitCode = ok && tactil ? 0 : 1;
