import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { run } from './harness.mjs';

const file = process.argv[2] ?? 'apps/web/dist/mundo-catrucho-hd.html';
const out = resolve('capturas/mc-36');
const puntos = JSON.parse(
  readFileSync(new URL('../src/game/dept/zones/franciscomorazan-puntos.json', import.meta.url)),
);
const S = 'window.__mc.store.getState()';
const ok = await run('fm', file, { hash: '#test', width: 1280, height: 800 }, async (t) => {
  await t.click('btn-jugar');
  await t.click('ed-done');
  await t.ev(`${S}.travel('franciscomorazan')`);
  const listo = `window.__mcTest?.dept?.id==='franciscomorazan' && window.__mcTest?.lugares?.st.flatMap(s=>s.booths).length===12`;
  await t.waitFor(listo);
  if (process.env.MC_GPU !== '0') await t.ev('window.__mc.gl.setPixelRatio(1.5)');
  const puestos = await t.ev('window.__mcTest.lugares.st.flatMap(s=>s.booths)');
  assert.equal(new Set(puestos.map((p) => p.id)).size, 12);
  await t.shot(`${out}/departamento.png`);
  for (const p of puestos) {
    await t.ev(`window.__mc.player.teleport(...${JSON.stringify(p.use)})`);
    await t.waitFor(`document.querySelector('[data-testid=prompt]')?.textContent.includes('Jugar:')`);
    await t.press('e');
    await t.waitFor(`${S}.mg?.juego===${JSON.stringify(p.id)} && ${S}.mg?.phase==='intro'`);
    await t.waitFor("!!document.querySelector('[data-testid=mg-start]')");
    await t.ev(`${S}.exitMinigame()`);
    await t.waitFor(listo);
  }
  console.log('PASA 12 puestos abren su tarjeta con E');
  for (const p of puntos) {
    await t.ev(
      `${S}.toasts.forEach(t=>${S}.dropToast(t.id));window.__mc.player.teleport(${p.x},window.__mc.phys.ground(${p.x},${p.z}),${p.z + 1})`,
    );
    await t.waitFor(`${S}.toasts.some(t=>t.text.includes(${JSON.stringify(p.nombre)}))`);
    await t.waitFor(
      `document.querySelector('[data-testid=prompt]')?.textContent.includes(${JSON.stringify(p.nombre)})`,
    );
    await t.press('e');
    await t.waitFor(`${S}.dialog?.title===${JSON.stringify(p.nombre)}`);
    if (p.tipo === 'locura' || p.id.endsWith('1')) await t.shot(`${out}/${p.id.split('.').at(-1)}.png`);
    await t.click('dialog-close');
    await t.ev(
      `window.__mc.player.fixedCam={pos:[${p.x},window.__mc.player.pos[1]+4,${p.z + 7}],target:[${p.x},window.__mc.player.pos[1]+1,${p.z}],fov:52}`,
    );
    await t.waitFor(`${S}.dialog===null`);
    await t.sleep(1200);
    if (p.tipo === 'locura' || p.id.endsWith('1')) await t.shot(`${out}/${p.id.split('.').at(-1)}-sitio.png`);
  }
  await t.ev('window.__mc.player.fixedCam=null');
  console.log('PASA 6 lugares y 3 locuras descubiertos por proximidad');
  for (const id of ['niebla', 'baleada', 'repartidor', 'artesania']) {
    await t.ev(`${S}.startMinigame('franciscomorazan.${id}')`);
    await t.click('mg-start');
    await t.waitFor(`window.__mcTest?.motor?.estado().id==='franciscomorazan.${id}' && ${S}.mg?.phase==='playing'`);
    await t.ev('window.__mcTest.motor.avanzar(3.1)');
    if (id === 'niebla') {
      await t.press('d');
      await t.waitFor('window.__mcTest.motor.estado().stats.arbol===1');
      await t.down('w');
      await t.waitFor('window.__mcTest.motor.estado().stats.copa>.2');
      await t.up('w');
      await t.press('f');
      await t.waitFor('window.__mcTest.motor.estado().stats.abiertas===1');
    } else if (id === 'baleada') {
      await t.down('a');
      await t.waitFor('window.__mcTest.motor.estado().stats.izq>.2');
      await t.up('a');
    } else if (id === 'repartidor') {
      await t.press('f');
      await t.waitFor('window.__mcTest.motor.estado().stats.choques===0');
    } else {
      await t.down('d');
      await t.waitFor('window.__mcTest.motor.estado().stats.giro>.2');
      await t.up('d');
    }
    await t.ev('window.__mcTest.motor.jugarBot();window.__mcTest.motor.avanzar(14)');
    await t.ev(`${S}.toasts.forEach(t=>${S}.dropToast(t.id))`);
    await t.shot(`${out}/${id}.png`);
    await t.ev('window.__mcTest.motor.avanzar(123)');
    await t.waitFor(`${S}.mg.phase==='ended'`);
    assert.equal(await t.ev(`${S}.mg.result.won`), true);
    await t.ev(`${S}.exitMinigame()`);
  }
  console.log('PASA teclado y partida de los cuatro motores');
});
const controles = await run(
  'fm-tactil-mando',
  file,
  { hash: '#test', width: 1280, height: 800, touch: true },
  async (t) => {
    await t.click('btn-jugar');
    await t.click('ed-done');
    for (const id of ['niebla', 'baleada', 'repartidor', 'artesania']) {
      await t.ev(`${S}.startMinigame('franciscomorazan.${id}')`);
      await t.click('mg-start');
      await t.waitFor(`window.__mcTest?.motor?.estado().id==='franciscomorazan.${id}' && ${S}.mg?.phase==='playing'`);
      await t.ev('window.__mcTest.motor.avanzar(3.1)');
      await t.drag(400, 400, 820, 300);
      const antes = await t.ev('window.__mcTest.motor.estado().stats');
      assert.ok(Object.keys(antes).length > 0);
      await t.click('touch-fire');
      await t.ev(
        `(()=>{window.__pad={id:'Mando de prueba',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0,-.8,.8],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};navigator.getGamepads=()=>[window.__pad]})()`,
      );
      const x = await t.ev('window.__mc.input.px');
      await t.waitFor(`window.__mc.input.px < ${x}-.05`);
      await t.ev('window.__pad.axes=[0,0,0,0]');
      await t.waitFor(
        `JSON.stringify(window.__mcTest.motor.estado().stats)!==${JSON.stringify(JSON.stringify(antes))}`,
      );
      console.log(`PASA arrastre táctil, 🎯 y stick derecho: ${id}`);
      await t.ev('navigator.getGamepads=()=>[]');
      await t.ev(`${S}.exitMinigame()`);
    }
  },
);
process.exitCode = ok && controles ? 0 : 1;
