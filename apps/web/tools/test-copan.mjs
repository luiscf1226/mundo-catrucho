import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { locuraCaminando, lugaresTuristicos } from './explorar.mjs';
import { run } from './harness.mjs';

const file = process.argv[2] ?? 'apps/web/dist/mundo-catrucho-hd.html';
const puntos = JSON.parse(readFileSync(new URL('../src/game/dept/zones/copan-puntos.json', import.meta.url)));
const juegos = JSON.parse(readFileSync(new URL('../shared/data/catalogo/occidente.json', import.meta.url))).copan
  .juegos;
const shots = resolve(import.meta.dirname, '../../../capturas/mc-45');
const motores = ['cadera', 'glifos', 'guaras', 'estratigrafia', 'hojas', 'adoquin', 'estelas', 'atol'];
const ok = await run('copan', file, { hash: '#test', width: 1280, height: 800 }, async (t) => {
  await t.click('btn-jugar');
  await t.click('ed-done');
  await t.ev("window.__mc.store.getState().travel('copan')");
  await t.waitFor(
    "window.__mcTest?.dept?.id==='copan' && window.__mcTest?.lugares?.st?.flatMap(s=>s.booths).length===12",
  );
  const puestos = await t.ev('window.__mcTest.lugares.st.flatMap(s=>s.booths)');
  assert.equal(puestos.length, juegos.length);
  await t.ev(
    'window.__mc.store.getState().toasts.forEach(t=>window.__mc.store.getState().dropToast(t.id));window.__mc.player.fixedCam={pos:[38,28,40],target:[0,1,-8],fov:55}',
  );
  await t.ev('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  await t.shot(`${shots}/departamento.png`);
  await t.ev('window.__mc.player.fixedCam=null');
  for (const p of puestos) {
    await t.ev(`window.__mc.player.teleport(...${JSON.stringify(p.use)})`);
    await t.waitFor("document.querySelector('[data-testid=prompt]')?.textContent.includes('Jugar:')");
    await t.press('e');
    await t.waitFor("!!document.querySelector('[data-testid=mg-intro]')");
    assert.equal(await t.ev('window.__mc.store.getState().mg.juego'), p.id);
    await t.click('mg-start');
    await t.ev('window.__mcTest.motor.jugarBot();window.__mcTest.motor.avanzar(123)');
    await t.waitFor("document.querySelector('[data-testid=mg-result]')?.dataset.won==='true'");
    await t.click('mg-exit');
    await t.waitFor("!window.__mc.store.getState().mg && window.__mcTest?.dept?.id==='copan'");
  }
  await t.ev('window.__mc.store.getState().goLobby()');
  await t.waitFor("window.__mc.store.getState().scene.kind==='lobby'");
  await t.ev("window.__mc.store.getState().travel('copan')");
  await t.waitFor("window.__mcTest?.dept?.id==='copan'");
  const lugares = await lugaresTuristicos(t, 'copan');
  // las locuras son los últimos puntos: abren su ficha al llegar caminando
  for (let i = 7; i < puntos.length; i++) {
    const x = i < 5 ? -8 : 8,
      z = 36 - (i % 5) * 6;
    await locuraCaminando(t, { x, z, nombre: puntos[i].nombre, texto: puntos[i].texto });
    await t.shot(`${shots}/descubrimiento-${i + 1}.png`);
    await t.click('dialog-close');
  }
  assert.equal(lugares, 7);
  console.log('PASA 12 puestos y victorias, 7 lugares y 3 locuras caminando');
  async function abrir(id) {
    await t.ev(`window.__mc.store.getState().startMinigame('copan.${id}')`);
    await t.waitFor(`window.__mcTest?.motor?.estado().id==='copan.${id}'`);
    await t.click('mg-start');
    await t.ev('window.__mcTest.motor.avanzar(3.1)');
  }
  for (const id of motores) {
    await t.ev('window.__mc.input.px=0;window.__mc.input.py=0');
    await abrir(id);
    await t.ev(
      `window.__pad={id:'Mando de prueba',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0,1,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};navigator.getGamepads=()=>[window.__pad]`,
    );
    const x = await t.ev('window.__mcTest.motor.estado().stats.x ?? 0');
    console.log(`Mando ${id}, inicio ${x}`);
    await t.waitFor(`window.__mcTest.motor.estado().stats.x > ${x + 0.05}`);
    await t.ev('window.__pad.connected=false');
    await t.ev('window.__mcTest.motor.jugarBot();window.__mcTest.motor.avanzar(10)');
    await t.ev('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
    await t.shot(`${shots}/${id}.png`);
  }
  await abrir('cadera');
  await t.press('e');
  await t.waitFor('window.__mcTest.motor.estado().stats.faltas>0');
  await abrir('hojas');
  await t.press('f');
  await t.waitFor('window.__mcTest.motor.estado().stats.errores>0');
  console.log('PASA mando en ocho motores; manos inválidas y ficha sin ambas caras rechazada');
  assert.equal(t.errors.length, 0, t.errors.join('\n'));
});
const tactil = await run('copan-tactil', file, { hash: '#test', touch: true, width: 900, height: 700 }, async (t) => {
  await t.click('btn-jugar');
  await t.click('ed-done');
  await t.ev("window.__mc.store.getState().startMinigame('copan.atol')");
  await t.waitFor("window.__mcTest?.motor?.estado().id==='copan.atol'");
  await t.click('mg-start');
  await t.ev('window.__mcTest.motor.avanzar(3.1)');
  await t.click('touch-fire');
  await t.waitFor('window.__mcTest.motor.estado().stats.verticales>0');
  await t.shot(`${shots}/atol-tactil.png`);
  assert.equal(t.errors.length, 0, t.errors.join('\n'));
  console.log('PASA acción táctil: agitación sin dirección lateral incorpora espuma');
});
process.exitCode = ok && tactil ? 0 : 1;
