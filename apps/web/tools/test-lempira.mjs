import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { locuraCaminando, lugaresTuristicos } from './explorar.mjs';
import { run } from './harness.mjs';

const file = process.argv[2] ?? 'apps/web/dist/mundo-catrucho-hd.html';
const juegos = JSON.parse(readFileSync(new URL('../shared/data/catalogo/occidente.json', import.meta.url))).lempira
  .juegos;
const puntos = JSON.parse(readFileSync(new URL('../src/game/dept/zones/lempira-puntos.json', import.meta.url)));
const shots = resolve('capturas/mc-46');
const S = 'window.__mc.store.getState()',
  M = 'window.__mcTest.motor';
const ok = await run('lempira', file, { hash: '#test', width: 1280, height: 800 }, async (t) => {
  await t.click('btn-jugar');
  await t.click('ed-done');
  await t.ev(`${S}.travel('lempira')`);
  await t.waitFor(
    "window.__mcTest?.dept?.id==='lempira' && window.__mcTest?.lugares?.st?.flatMap(s=>s.booths).length===12",
  );
  const puestos = await t.ev('window.__mcTest.lugares.st.flatMap(s=>s.booths)');
  assert.equal(puestos.length, 12);
  await t.ev('window.__mc.player.fixedCam={pos:[38,28,40],target:[0,1,-8],fov:55}');
  await t.ev(`${S}.toasts.forEach(t=>${S}.dropToast(t.id))`);
  await t.ev('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  await t.shot(`${shots}/departamento.png`);
  await t.ev('window.__mc.player.fixedCam=null');
  for (const p of puestos) {
    console.log('Puesto', p.id);
    await t.ev(`window.__mc.player.teleport(...${JSON.stringify(p.use)})`);
    await t.waitFor("document.querySelector('[data-testid=prompt]')?.textContent.includes('Jugar:')");
    await t.press('e');
    await t.waitFor("!!document.querySelector('[data-testid=mg-intro]')");
    assert.equal(await t.ev(`${S}.mg.juego`), p.id);
    await t.click('mg-start');
    if (await t.ev(`${S}.mg.id==='ruta'`)) {
      await t.waitFor('!!window.__mcTest?.ruta');
      await t.ev(
        `window.__rutaIndice=0;window.__rutaPrueba=setInterval(()=>{const T=window.__mcTest.ruta,M=window.__mc,q=T.G.plats[Math.min(window.__rutaIndice,T.G.plats.length-1)];M.player.teleport(Math.min(0,q.x),q.y+0.15,q.z);window.__rutaIndice++;},180)`,
      );
      await t.waitFor("document.querySelector('[data-testid=mg-result]')?.dataset.won==='true'");
      await t.ev('clearInterval(window.__rutaPrueba)');
    } else {
      await t.waitFor('!!window.__mcTest?.motor');
      await t.ev(`${M}.jugarBot();${M}.avanzar(123)`);
      await t.waitFor("document.querySelector('[data-testid=mg-result]')?.dataset.won==='true'");
    }
    await t.click('mg-exit');
    await t.waitFor(`!${S}.mg && window.__mcTest?.dept?.id==='lempira'`);
  }
  console.log('PASA 12 puestos y victorias');
  await t.ev(`${S}.goLobby()`);
  await t.waitFor(`${S}.scene.kind==='lobby'`);
  await t.ev(`delete window.__mcTest.dept;${S}.travel('lempira')`);
  await t.waitFor("window.__mcTest?.dept?.id==='lempira'");
  assert.equal(await lugaresTuristicos(t, 'lempira'), 8);
  // las tres locuras (los últimos puntos) abren su ficha al llegar caminando
  for (let i = 8; i < puntos.length; i++) {
    console.log('Locura', i - 7);
    const [x, z] = puntos[i].pos;
    await locuraCaminando(t, { x, z, atras: 2.5, nombre: puntos[i].nombre, texto: puntos[i].texto });
    await t.shot(`${shots}/descubrimiento-${i + 1}.png`);
    await t.click('dialog-close');
  }
  console.log('PASA 8 lugares y 3 locuras caminando');
  async function abrir(j, modo = 'solo') {
    await t.ev(`${S}.setModo('${modo}');${S}.startJuego('lempira.${j[0]}')`);
    await t.waitFor(`${M}?.estado().id==='${j[2]}' && ${S}.mg.phase==='intro'`);
    await t.click('mg-start');
  }
  for (const j of juegos.filter((j) => j[2] !== 'ruta')) {
    await abrir(j);
    await t.ev(`${M}.avanzar(123)`);
    assert.equal(await t.ev(`${S}.mg.result.won`), false, `${j[0]} pierde sin jugar`);
    await abrir(j);
    await t.ev(
      `window.__mc.input.px=0;window.__mc.input.py=0;${M}.avanzar(3.1);for(let i=0;i<1500;i++){window.__mc.input.press('fire');${M}.avanzar(0.05)}`,
    );
    assert.equal(await t.ev(`${S}.mg.result.won`), false, `${j[0]} rechaza machacar F`);
    for (let etapa = 1; etapa < j[8]; etapa++) {
      await abrir(j, etapa === 1 ? 'duo' : 'abierto');
      await t.ev(`${M}.jugarBot();${M}.avanzar(123)`);
      const r = await t.ev(`${S}.mg.result`);
      assert.equal(r.stars, 3, `${j[0]}, etapa ${etapa + 1} alcanza oro: ${r.score}`);
    }
    await abrir(j);
    await t.ev(`${M}.jugarBot();${M}.avanzar(13)`);
    await t.ev('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
    const render = await t.calls();
    assert.ok(render.calls < 350, `${j[2]} ${render.calls} llamadas`);
    await t.shot(`${shots}/${j[0]}.png`);
    await t.ev(`${M}.jugarBot(false)`);
    const x = await t.ev(`${M}.estado().stats.x`);
    await t.holdUntil(x > 0 ? 'a' : 'd', `Math.abs(${M}.estado().stats.x-(${x}))>0.05`);
    await t.ev(
      `window.__pad={id:'Mando de prueba',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0,${x > 0 ? -1 : 1},0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};navigator.getGamepads=()=>[window.__pad]`,
    );
    const anterior = await t.ev(`${M}.estado().stats.x`);
    await t.waitFor(`Math.abs(${M}.estado().stats.x-(${anterior}))>0.03`);
    await t.ev('window.__pad.connected=false');
    console.log(`PASA ${j[0]}: inacción, oro hasta última etapa, modos, dibujo ${render.calls}`);
  }
  for (const id of new Set(juegos.filter((j) => j[2] !== 'ruta').map((j) => j[2]))) {
    await t.ev(`${S}.startMinigame('${id}')`);
    await t.waitFor(`${M}?.estado().id==='${id}' && ${S}.mg.phase==='intro'`);
    await t.click('mg-start');
    await t.ev(`${M}.jugarBot();${M}.avanzar(123)`);
    assert.equal(await t.ev(`${S}.mg.result.stars`), 3, `${id} sin tema jugable`);
  }
  console.log('PASA siete motores sin tema');
  assert.equal(t.errors.length, 0, t.errors.join('\n'));
});
const tactil = await run('lempira-tactil', file, { hash: '#test', touch: true, width: 900, height: 700 }, async (t) => {
  await t.click('btn-jugar');
  await t.click('ed-done');
  await t.ev(`${S}.startMinigame('lempira.termal')`);
  await t.waitFor(`!!${M}`);
  await t.click('mg-start');
  await t.ev(`${M}.avanzar(3.1)`);
  await t.click('touch-fire');
  await t.waitFor(`${M}.estado().stats.apuros>0`);
  await t.shot(`${shots}/termal-tactil.png`);
  assert.equal(t.errors.length, 0, t.errors.join('\n'));
  console.log('PASA toque: entrar sin recuperación reinicia descanso');
});
process.exitCode = ok && tactil ? 0 : 1;
