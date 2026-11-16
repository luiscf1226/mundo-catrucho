// MC-51 · El Paraíso: 12 puestos jugables, 3 locuras caminando, 7 lugares turísticos, y por cada juego:
// derrota sin jugar, machacar F no gana, oro en todas las etapas (solo, dúo y abierto) con TOPES válidos,
// teclado y mando mueven el cursor; cada motor sin tema; el toque confirma.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validarResultado } from '../../../packages/reglas/src/topes.ts';
import { run } from './harness.mjs';

const file = process.argv[2] ?? 'apps/web/dist/mundo-catrucho-hd.html';
const juegos = JSON.parse(readFileSync(new URL('../shared/data/catalogo/sur-oriente.json', import.meta.url))).elparaiso
  .juegos;
const puntos = JSON.parse(readFileSync(new URL('../src/game/dept/zones/elparaiso-puntos.json', import.meta.url)));
const turismo = JSON.parse(readFileSync(new URL('../../../docs/generador/contenido.json', import.meta.url))).elparaiso
  .turismo;
const CPU = process.env.MC_GPU === '0';
const shots = resolve(`capturas/mc-51${CPU ? '-sin-gpu' : ''}`);
const S = 'window.__mc.store.getState()',
  M = 'window.__mcTest.motor';
const cuadro = 'new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))';
const ok = await run('elparaiso', file, { hash: '#test', width: 1280, height: 800 }, async (t) => {
  await t.click('btn-jugar');
  await t.click('ed-done');
  await t.ev(`${S}.travel('elparaiso')`);
  await t.waitFor(
    "window.__mcTest?.dept?.id==='elparaiso' && window.__mcTest?.lugares?.st?.flatMap(s=>s.booths).length===12",
  );
  const puestos = await t.ev('window.__mcTest.lugares.st.flatMap(s=>s.booths)');
  assert.deepEqual(puestos.map((p) => p.id).sort(), juegos.map((j) => `elparaiso.${j[0]}`).sort());
  await t.ev('window.__mc.player.fixedCam={pos:[30,26,46],target:[0,1,6],fov:55}');
  await t.ev(`${S}.toasts.forEach(t=>${S}.dropToast(t.id))`);
  await t.ev(cuadro);
  await t.shot(`${shots}/departamento.png`);
  const zona = await t.calls();
  assert.ok(zona.calls < 350, `zona: ${zona.calls} llamadas`);
  await t.ev('window.__mc.player.fixedCam=null');
  // cada puesto abre su juego caminando y se gana con el bot
  for (const p of CPU ? puestos.slice(0, 2) : puestos) {
    await t.ev(`window.__mc.player.teleport(...${JSON.stringify(p.use)})`);
    await t.waitFor("document.querySelector('[data-testid=prompt]')?.textContent.includes('Jugar:')");
    await t.press('e');
    await t.waitFor("!!document.querySelector('[data-testid=mg-intro]')");
    assert.equal(await t.ev(`${S}.mg.juego`), p.id);
    await t.click('mg-start');
    await t.waitFor('!!window.__mcTest?.motor');
    await t.ev(`${M}.jugarBot();${M}.avanzar(123)`);
    await t.waitFor("document.querySelector('[data-testid=mg-result]')?.dataset.won==='true'");
    await t.click('mg-exit');
    await t.waitFor(`!${S}.mg && window.__mcTest?.dept?.id==='elparaiso'`);
  }
  console.log(`PASA ${CPU ? '2 de 12 (SALTA el resto sin GPU)' : '12'} puestos y victorias`);
  await t.ev(`${S}.goLobby()`);
  await t.waitFor(`${S}.scene.kind==='lobby'`);
  await t.ev(`delete window.__mcTest.dept;${S}.travel('elparaiso')`);
  await t.waitFor("window.__mcTest?.dept?.id==='elparaiso'");
  // tres locuras: caminando aparece su ficha y con E hacen su gracia
  for (let i = 0; i < puntos.length; i++) {
    const [x, z] = puntos[i].pos;
    await t.ev(`window.__mc.player.teleport(${x},0.2,${z + 3},0)`);
    await t.holdUntil('w', `${S}.dialog?.title===${JSON.stringify(puntos[i].nombre)}`);
    assert.equal(await t.ev(`${S}.dialog.text`), puntos[i].texto);
    await t.shot(`${shots}/locura-${i + 1}.png`);
    await t.click('dialog-close');
    await t.ev(`${S}.toasts.forEach(t=>${S}.dropToast(t.id))`);
    await t.ev(`window.__mc.player.teleport(${x},0.2,${z + 1.2},0)`);
    await t.waitFor(
      `(()=>{window.__mc.input.press('use');return ${S}.toasts.some(t=>/[¿¡]|parqueo|Corbata/.test(t.text))})()`,
    );
    await t.ev('window.__mc.input.reset()');
  }
  console.log('PASA 3 locuras caminando y activándolas');
  // siete lugares para explorar (dept/turismo.tsx): se registran al pisarlos
  const lugares = await t.ev('window.__mcTest.turismo.puntos.map(p=>({id:p.lugar.id,pos:p.pos}))');
  assert.deepEqual(lugares.map((l) => l.id).sort(), turismo.map((l) => l.id).sort());
  for (const l of lugares) {
    await t.ev(`window.__mc.player.teleport(${l.pos[0]},${l.pos[1] + 0.2},${l.pos[2]})`);
    await t.waitFor(`${S}.profile.turismo.some(r=>r.id==='${l.id}')`);
  }
  await t.ev(cuadro);
  await t.shot(`${shots}/turismo.png`);
  console.log('PASA 7 lugares para explorar registrados');
  async function abrir(id, modo = 'solo', juego = true) {
    await t.ev(
      `window.__mc.input.reset();window.__mc.input.px=0;window.__mc.input.py=0;navigator.getGamepads=()=>[];${S}.setModo('${modo}');${S}.${juego ? 'startJuego' : 'startMinigame'}('${id}')`,
    );
    await t.waitFor(`!!${M} && ${S}.mg.phase==='intro'`);
    await t.click('mg-start');
  }
  // MC_SOLO=slug,slug prueba solo esos juegos (para afinar uno sin repetir los demás)
  const solo = process.env.MC_SOLO?.split(',');
  const lista = (CPU ? juegos.filter((_, i) => i % 3 === 0) : juegos).filter((j) => !solo || solo.includes(j[0]));
  // los puestos ya ganaron la primera etapa: se borra el avance para recorrer todas desde la primera
  await t.ev('window.__mc.store.setState(s=>({profile:{...s.profile,juegos:{}}}))');
  for (const j of lista) {
    const id = `elparaiso.${j[0]}`;
    await abrir(id);
    assert.equal(await t.ev(`${M}.estado().id`), j[2]);
    await t.ev(`${M}.avanzar(123)`);
    assert.equal(await t.ev(`${S}.mg.result.won`), false, `${j[0]} pierde sin jugar`);
    await abrir(id);
    await t.ev(
      `window.__mc.input.px=0;window.__mc.input.py=0;${M}.avanzar(3.1);for(let i=0;i<1500;i++){window.__mc.input.press('fire');${M}.avanzar(0.05)}`,
    );
    assert.equal(await t.ev(`${S}.mg.result.won`), false, `${j[0]} rechaza machacar F`);
    const puntajes = [];
    for (let etapa = 0; etapa < (CPU ? 1 : j[8]); etapa++) {
      await abrir(id, etapa === 0 ? 'solo' : etapa === 1 ? 'duo' : 'abierto');
      const e = await t.ev(`${M}.estado()`);
      assert.equal(e.etapa, etapa, `${j[0]} abre la etapa ${etapa + 1}`);
      await t.ev(`${M}.jugarBot();${M}.avanzar(123)`);
      const r = await t.ev(`${S}.mg.result`);
      puntajes.push(r.score);
      assert.equal(r.stars, 3, `${j[0]}, etapa ${etapa + 1} alcanza oro: ${r.score}`);
      const v = validarResultado({
        motor: j[2],
        puntos: r.score,
        estrellas: r.stars,
        duracion: e.duracion,
        etapa,
        etapas: j[8],
        gano: r.won,
        tema: j[7],
      });
      assert.ok(v.ok, `${j[0]} etapa ${etapa + 1}: ${v.motivos.join(', ')}`);
    }
    await abrir(id);
    await t.ev(`${M}.jugarBot();${M}.avanzar(9)`);
    await t.ev(`${S}.toasts.forEach(t=>${S}.dropToast(t.id))`);
    await t.ev(cuadro);
    const render = await t.calls();
    assert.ok(render.calls < 350, `${j[0]} ${render.calls} llamadas`);
    await t.shot(`${shots}/${j[0]}.png`);
    await t.ev(`${M}.jugarBot(false)`);
    const x = await t.ev(`${M}.estado().stats.x`);
    await t.holdUntil(x > 0 ? 'a' : 'd', `Math.abs(${M}.estado().stats.x-(${x}))>0.05`);
    await t.ev(
      `window.__pad={id:'Mando de prueba',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0,${x > 0 ? -1 : 1},0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};navigator.getGamepads=()=>[window.__pad]`,
    );
    const antes = await t.ev(`${M}.estado().stats.x`);
    await t.waitFor(`Math.abs(${M}.estado().stats.x-(${antes}))>0.03`);
    await t.ev('window.__pad.connected=false;navigator.getGamepads=()=>[]');
    await t.ev(`${S}.exitMinigame()`);
    await t.waitFor(`!${S}.mg`);
    console.log(
      `PASA ${j[0]}: inacción, machacar, oro por etapa (${puntajes.join(' · ')} pts), TOPES, teclado y mando, ${render.calls} llamadas`,
    );
  }
  for (const id of new Set(juegos.map((j) => j[2]))) {
    await abrir(id, 'solo', false);
    await t.ev(`${M}.jugarBot();${M}.avanzar(123)`);
    assert.equal(await t.ev(`${S}.mg.result.stars`), 3, `${id} sin tema jugable`);
    await t.ev(`${S}.exitMinigame()`);
    await t.waitFor(`!${S}.mg`);
  }
  console.log('PASA ocho motores sin tema');
  assert.equal(t.errors.length, 0, t.errors.join('\n'));
});
const tactil = await run(
  'elparaiso-tactil',
  file,
  { hash: '#test', touch: true, width: 900, height: 700 },
  async (t) => {
    await t.click('btn-jugar');
    await t.click('ed-done');
    await t.ev(`${S}.startMinigame('elparaiso.tapisca')`);
    await t.waitFor(`!!${M}`);
    await t.click('mg-start');
    await t.ev(`${M}.avanzar(3.1)`);
    await t.click('touch-fire');
    await t.waitFor(`${M}.estado().stats.dobladas>0`);
    await t.ev(cuadro);
    await t.shot(`${shots}/tapisca-tactil.png`);
    assert.equal(t.errors.length, 0, t.errors.join('\n'));
    console.log('PASA toque: 🎯 dobla un tallo');
  },
);
process.exitCode = ok && tactil ? 0 : 1;
