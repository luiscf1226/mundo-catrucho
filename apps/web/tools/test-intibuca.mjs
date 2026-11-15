import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validarResultado } from '../../../packages/reglas/src/topes.ts';
import { run } from './harness.mjs';

const file = process.argv[2] ?? 'apps/web/dist/mundo-catrucho-hd.html';
const juegos = JSON.parse(readFileSync(new URL('../shared/data/catalogo/occidente.json', import.meta.url))).intibuca
  .juegos;
const puntos = JSON.parse(readFileSync(new URL('../src/game/dept/zones/intibuca-puntos.json', import.meta.url)));
const shots = resolve('capturas/mc-49');
const ok = await run('intibuca', file, { hash: '#test', width: 1280, height: 800 }, async (t) => {
  await t.click('btn-jugar');
  await t.click('ed-done');
  await t.ev("window.__mc.store.getState().travel('intibuca')");
  await t.waitFor(
    "window.__mcTest?.dept?.id==='intibuca' && window.__mcTest?.lugares?.st?.flatMap(s=>s.booths).length===12",
  );
  await t.ev('window.__mc.player.fixedCam={pos:[38,28,40],target:[0,1,-8],fov:55}');
  await t.ev('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  await t.shot(`${shots}/departamento.png`);
  await t.ev('window.__mc.player.fixedCam=null');
  const puestos = await t.ev('window.__mcTest.lugares.st.flatMap(s=>s.booths)');
  for (const p of puestos) {
    await t.ev(`window.__mc.player.teleport(...${JSON.stringify(p.use)})`);
    await t.waitFor("document.querySelector('[data-testid=prompt]')?.textContent.includes('Jugar:')");
    await t.press('e');
    await t.waitFor("!!document.querySelector('[data-testid=mg-intro]')");
    assert.equal(await t.ev('window.__mc.store.getState().mg.juego'), p.id);
    await t.click('mg-back');
    await t.waitFor('!window.__mc.store.getState().mg');
  }
  await t.ev('window.__mc.store.getState().goLobby()');
  await t.waitFor("window.__mc.store.getState().scene.kind==='lobby'");
  await t.ev("window.__mc.store.getState().travel('intibuca')");
  await t.waitFor("window.__mcTest?.dept?.id==='intibuca'");
  for (let i = 0; i < puntos.length; i++) {
    const [x, y, z] = puntos[i].pos;
    await t.ev(`window.__mc.player.teleport(${x},${y},${z + 3},0)`);
    await t.holdUntil('w', `window.__mc.store.getState().dialog?.title===${JSON.stringify(puntos[i].nombre)}`);
    await t.shot(`${shots}/descubrimiento-${i + 1}.png`);
    await t.click('dialog-close');
    if (i !== 3) {
      await t.ev(`window.__mc.player.teleport(${x},${y},${z + 1.5},0)`);
      await t.waitFor(
        `(()=>{window.__mc.input.press('use');return window.__mc.store.getState().dialog?.title===${JSON.stringify(puntos[i].nombre)}})()`,
      );
      await t.ev('window.__mc.input.reset()');
      await t.click('dialog-close');
      await t.ev('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
      await t.shot(`${shots}/accion-${i + 1}.png`);
    }
  }
  console.log('PASA 12 puestos, 7 lugares y 3 locuras caminando');
  async function abrir(juego, motor, modo = 'solo') {
    await t.ev(
      `window.__mc.input.reset();window.__mc.input.px=0;window.__mc.input.py=0;navigator.getGamepads=()=>[];window.__mc.store.getState().setModo('${modo}');window.__mc.store.getState().${juego ? 'startJuego' : 'startMinigame'}('${juego ?? motor}')`,
    );
    await t.waitFor(
      `window.__mcTest?.motor?.estado().id==='${motor}' && window.__mc.store.getState().mg.phase==='intro'`,
    );
    await t.click('mg-start');
    await t.ev('window.__mc.input.reset();window.__mcTest.motor.avanzar(3.1)');
  }
  for (const j of juegos.filter((j) => j[2] !== 'intibuca.carrera')) {
    const id = `intibuca.${j[0]}`;
    for (let etapa = 0; etapa < j[8]; etapa++) {
      await abrir(id, j[2], etapa === 1 ? 'duo' : etapa > 1 ? 'abierto' : 'solo');
      await t.ev('window.__mcTest.motor.jugarBot();window.__mcTest.motor.avanzar(12)');
      if (etapa === 0) {
        await t.ev('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
        assert.ok((await t.calls()).calls < 350);
        await t.ev('window.__mc.store.getState().toasts.forEach(t=>window.__mc.store.getState().dropToast(t.id))');
        await t.shot(`${shots}/${j[0]}.png`);
      }
      await t.ev('window.__mcTest.motor.avanzar(123)');
      const r = await t.ev('window.__mc.store.getState().mg.result');
      const veredicto = validarResultado({
        motor: j[2],
        puntos: r.score,
        estrellas: r.stars,
        duracion: 75,
        etapa,
        etapas: j[8],
        gano: r.won,
        tema: j[7],
      });
      assert.ok(veredicto.ok, `${id}: ${veredicto.motivos.join(', ')}`);
      assert.equal(r.won, true, id);
      assert.equal(r.stars, 3, `Oro alcanzable ${id}, etapa ${etapa + 1}`);
    }
    console.log(`PASA ${id}: ${j[8]} etapas con oro`);
  }
  for (const motor of [...new Set(juegos.map((j) => j[2]))].filter((id) => id !== 'intibuca.carrera')) {
    await abrir(null, motor);
    await t.ev('window.__mcTest.motor.avanzar(123)');
    assert.equal(await t.ev('window.__mc.store.getState().mg.result.won'), false);
    await abrir(null, motor);
    await t.ev("for(let i=0;i<1500;i++){window.__mc.input.press('fire');window.__mcTest.motor.avanzar(0.05)}");
    assert.equal(await t.ev('window.__mc.store.getState().mg.result.won'), false, `Machacar F pierde ${motor}`);
    await abrir(null, motor);
    await t.ev(
      `window.__pad={id:'Mando de prueba',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0,1,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};navigator.getGamepads=()=>[window.__pad]`,
    );
    const x = await t.ev('window.__mcTest.motor.estado().stats.x??0');
    await t.waitFor(`window.__mcTest.motor.estado().stats.x>${x + 0.05}`);
    await t.ev('window.__pad.connected=false');
    await t.ev('window.__mcTest.motor.jugarBot();window.__mcTest.motor.avanzar(123)');
    assert.equal(await t.ev('window.__mc.store.getState().mg.result.won'), true, motor);
  }
  console.log('PASA inacción y machaque pierden; mando y motores sin tema');
  for (const j of juegos.filter((j) => j[2] === 'intibuca.carrera')) {
    await t.ev(`window.__mc.store.getState().startJuego('intibuca.${j[0]}')`);
    await t.waitFor("window.__mcTest?.carrera && window.__mc.store.getState().mg.phase==='intro'");
    await t.click('mg-start');
    await t.waitFor('window.__mcTest.carrera.race.countdown<=0');
    const cps = await t.ev('window.__mcTest.carrera.checkpoints');
    for (let i = 0; i < cps.length; i++) {
      await t.ev(`window.__mc.player.teleport(...${JSON.stringify(cps[i])})`);
      await t.waitFor(`window.__mcTest.carrera.race.checkpoint===${i}`);
    }
    await t.ev('window.__mc.player.teleport(...window.__mcTest.carrera.meta)');
    await t.waitFor("document.querySelector('[data-testid=mg-result]')?.dataset.won==='true'");
    console.log(`PASA circuito ${j[0]} y checkpoints`);
  }
});
const tactil = await run(
  'intibuca-tactil',
  file,
  { hash: '#test', touch: true, width: 900, height: 700 },
  async (t) => {
    await t.click('btn-jugar');
    await t.click('ed-done');
    await t.ev("window.__mc.store.getState().startMinigame('intibuca.vaho')");
    await t.waitFor("window.__mcTest?.motor?.estado().id==='intibuca.vaho'");
    await t.click('mg-start');
    await t.ev('window.__mc.input.reset();window.__mcTest.motor.avanzar(3.1)');
    await t.click('touch-use');
    await t.waitFor('window.__mcTest.motor.estado().stats.vaho>0.1');
    await t.shot(`${shots}/vaho-tactil.png`);
    console.log('PASA exhalación táctil');
    for (const [id, accion, stat] of [
      ['telar', 'fire', 'errores'],
      ['hongos', 'use', 'fichas'],
      ['callejero', 'fire', 'errores'],
      ['papas', 'fire', 'perdidas'],
      ['semilla', 'fire', 'errores'],
      ['ondas', 'fire', 'errores'],
    ]) {
      await t.ev(`window.__mc.input.reset();window.__mc.store.getState().startMinigame('intibuca.${id}')`);
      await t.waitFor(
        `window.__mcTest?.motor?.estado().id==='intibuca.${id}' && window.__mc.store.getState().mg.phase==='intro'`,
      );
      await t.click('mg-start');
      await t.ev('window.__mc.input.reset();window.__mcTest.motor.avanzar(3.1)');
      await t.click(`touch-${accion}`);
      await t.waitFor(`window.__mcTest.motor.estado().stats.${stat}>0`);
    }
    console.log('PASA acciones táctiles de los siete motores nuevos');
  },
);
process.exitCode = ok && tactil ? 0 : 1;
