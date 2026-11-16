// Valle (MC-53): 12 puestos, 6 lugares para explorar, 3 locuras y los ocho motores del golfo. Prueba teclado,
// toque, mando, modos, que la inacción y machacar F pierdan, el oro hasta la última etapa y los topes del servidor.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validarResultado } from '../../../packages/reglas/src/topes.ts';
import { run } from './harness.mjs';

const file = process.argv[2] ?? 'apps/web/dist/mundo-catrucho-hd.html';
const juegos = JSON.parse(readFileSync(new URL('../shared/data/catalogo/sur-oriente.json', import.meta.url))).valle
  .juegos;
const turismo = JSON.parse(readFileSync(new URL('../../../docs/generador/contenido.json', import.meta.url))).valle
  .turismo;
const puntos = JSON.parse(readFileSync(new URL('../src/game/dept/zones/valle-puntos.json', import.meta.url)));
const motores = [...new Set(juegos.map((j) => j[2]))];
const sinGpu = process.env.MC_GPU === '0';
const shots = resolve(sinGpu ? 'capturas/mc-53-sin-gpu' : 'capturas/mc-53');
const S = 'window.__mc.store.getState()',
  M = 'window.__mcTest.motor',
  cuadro = 'new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))';

const ok = await run('valle', file, { hash: '#test', width: 1280, height: 800 }, async (t) => {
  await t.click('btn-jugar');
  await t.click('ed-done');
  await t.ev(`${S}.travel('valle')`);
  await t.waitFor(
    "window.__mcTest?.dept?.id==='valle' && window.__mcTest?.lugares?.st?.flatMap(s=>s.booths).length===12 && window.__mcTest?.turismo?.dept==='valle'",
    30000,
  );
  await t.ev('window.__mc.player.fixedCam={pos:[30,26,62],target:[-4,1,22],fov:55}');
  await t.waitFor("!document.querySelector('[data-testid=celebration]')", 20000);
  await t.ev(`${S}.toasts.forEach(t=>${S}.dropToast(t.id))`);
  await t.ev(cuadro);
  const dibujo = await t.calls();
  assert.ok(dibujo.calls < 350, `zona ${dibujo.calls} llamadas`);
  await t.shot(`${shots}/departamento.png`);
  await t.ev('window.__mc.player.fixedCam=null');

  // Los 12 puestos se abren caminando hasta ellos y con E
  const puestos = await t.ev('window.__mcTest.lugares.st.flatMap(s=>s.booths)');
  assert.deepEqual(puestos.map((p) => p.id).sort(), juegos.map((j) => `valle.${j[0]}`).sort());
  for (const p of puestos) {
    await t.ev(`window.__mc.player.teleport(...${JSON.stringify(p.use)})`);
    await t.waitFor("document.querySelector('[data-testid=prompt]')?.textContent.includes('Jugar:')");
    await t.press('e');
    await t.waitFor("!!document.querySelector('[data-testid=mg-intro]')");
    assert.equal(await t.ev(`${S}.mg.juego`), p.id);
    await t.click('mg-back');
    await t.waitFor(`!${S}.mg`);
  }
  console.log('PASA 12 puestos con E');

  // Seis lugares para explorar: se descubren al llegar
  const lugares = await t.ev('window.__mcTest.turismo.puntos.map(p=>({id:p.lugar.id,pos:p.pos}))');
  assert.deepEqual(lugares.map((l) => l.id).sort(), turismo.map((l) => l.id).sort());
  for (const l of lugares) {
    await t.ev(`window.__mc.player.teleport(${l.pos[0]},${l.pos[1] + 0.1},${l.pos[2]})`);
    await t.waitFor(`${S}.profile.turismo.some(x=>x.id==='${l.id}')`, 20000);
  }
  console.log('PASA 6 lugares para explorar');

  // Tres locuras: caminar hasta ellas, E abre la ficha y arranca la animación
  for (let i = 0; i < puntos.length; i++) {
    const [x, z] = puntos[i].pos;
    await t.ev(`${S}.toasts.forEach(t=>${S}.dropToast(t.id))`);
    await t.ev(`window.__mc.player.teleport(${x},(window.__mc.phys.ground?.(${x},${z + 3})??0)+0.3,${z + 3},0)`);
    // el aviso de E se refresca al moverse: se camina hasta quedar a la par de la locura
    await t.holdUntil(
      'w',
      `Math.hypot(window.__mc.player.pos[0]-(${x}),window.__mc.player.pos[2]-(${z}))<1.5 && document.querySelector('[data-testid=prompt]')?.textContent.includes('✨')`,
    );
    await t.press('e');
    await t.waitFor(`${S}.dialog?.title===${JSON.stringify(puntos[i].nombre)}`);
    assert.equal(await t.ev(`${S}.dialog.text`), puntos[i].texto);
    await t.click('dialog-close');
    // el muñeco se aparta para que se vea la animación
    await t.ev(`window.__mc.player.teleport(${x},window.__mc.player.pos[1]+0.2,${z + 3.2},0)`);
    await t.ev(
      `window.__mc.player.fixedCam={pos:[${x - 2},window.__mc.player.pos[1]+3,${z + 6}],target:[${x},window.__mc.player.pos[1]+0.6,${z}],fov:50}`,
    );
    await t.waitFor('false', 3200).catch(() => {});
    await t.shot(`${shots}/locura-${i + 1}.png`);
    await t.ev('window.__mc.player.fixedCam=null');
  }
  console.log('PASA 3 locuras caminando');

  async function abrir(juego, motor, modo = 'solo') {
    await t.ev(
      `window.__mc.input.reset();window.__mc.input.px=0;window.__mc.input.py=0;navigator.getGamepads=()=>[];${S}.setModo('${modo}');${S}.${juego ? 'startJuego' : 'startMinigame'}('${juego ?? motor}')`,
    );
    await t.waitFor(`${M}?.estado().id==='${motor}' && ${S}.mg.phase==='intro'`);
    await t.click('mg-start');
    await t.ev(`window.__mc.input.reset();${M}.avanzar(3.1)`);
  }
  const etapas = sinGpu ? 2 : Infinity;
  for (const j of juegos) {
    const id = `valle.${j[0]}`;
    for (let etapa = 0; etapa < Math.min(j[8], etapas); etapa++) {
      await abrir(id, j[2], etapa === 1 ? 'duo' : etapa > 1 ? 'abierto' : 'solo');
      assert.equal(await t.ev(`${M}.estado().etapa`), etapa, `${id} abre la etapa ${etapa + 1}`);
      await t.ev(`${M}.jugarBot();${M}.avanzar(12)`);
      if (etapa === 0) {
        await t.ev(cuadro);
        const render = await t.calls();
        assert.ok(render.calls < 350, `${id} ${render.calls} llamadas`);
        await t.ev(`${S}.toasts.forEach(t=>${S}.dropToast(t.id))`);
        await t.shot(`${shots}/${j[0]}.png`);
      }
      await t.ev(`${M}.avanzar(123)`);
      const r = await t.ev(`${S}.mg.result`);
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
      assert.equal(r.stars, 3, `Oro en ${id}, etapa ${etapa + 1}: ${r.score} pts`);
    }
    console.log(
      `PASA ${id}: ${Math.min(j[8], etapas)} etapas con oro${sinGpu && j[8] > 2 ? ` (SALTA ${j[8] - 2} en CPU)` : ''}`,
    );
  }

  for (const motor of motores) {
    await abrir(null, motor);
    await t.ev(`${M}.avanzar(123)`);
    assert.equal(await t.ev(`${S}.mg.result.won`), false, `${motor}: no jugar pierde`);
    await abrir(null, motor);
    await t.ev(`for(let i=0;i<1500;i++){window.__mc.input.press('fire');${M}.avanzar(0.05)}`);
    assert.equal(await t.ev(`${S}.mg.result.won`), false, `${motor}: machacar F pierde`);
    await abrir(null, motor);
    // teclado: A y D mueven el cursor (o la inclinación)
    const x0 = await t.ev(`${M}.estado().stats.x`);
    await t.holdUntil(x0 > 0 ? 'a' : 'd', `Math.abs(${M}.estado().stats.x-(${x0}))>0.05`);
    // mando: el stick derecho también
    const x1 = await t.ev(`${M}.estado().stats.x`);
    await t.ev(
      `window.__pad={id:'Mando de prueba',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0,${x1 > 0 ? -1 : 1},0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};navigator.getGamepads=()=>[window.__pad]`,
    );
    await t.waitFor(`Math.abs(${M}.estado().stats.x-(${x1}))>0.03`);
    await t.ev('window.__pad.connected=false;navigator.getGamepads=()=>[]');
    await t.ev(`${M}.jugarBot();${M}.avanzar(123)`);
    assert.equal(await t.ev(`${S}.mg.result.stars`), 3, `${motor} sin tema jugable`);
    console.log(`PASA ${motor}: inacción y machaque pierden; teclado, mando y sin tema`);
  }
  assert.equal(t.errors.length, 0, t.errors.join('\n'));
});

const tactil = await run('valle-tactil', file, { hash: '#test', touch: true, width: 900, height: 700 }, async (t) => {
  await t.click('btn-jugar');
  await t.click('ed-done');
  for (const [motor, boton, cumple] of [
    ['valle.bicitaxi', 'use', 'izq>0'],
    ['valle.bicitaxi', 'fire', 'der>0'],
    ['valle.curil', 'fire', 'bien+s.errores>0'],
    ['valle.embarque', 'fire', 'escora!==0'],
    ['valle.raices', 'fire', 'remadas>0'],
    ['valle.volcan', 'fire', 'huecos>0'],
  ]) {
    await t.ev(
      `window.__mc.input.reset();window.__mc.input.px=0;window.__mc.input.py=0;${S}.startMinigame('${motor}')`,
    );
    await t.waitFor(`${M}?.estado().id==='${motor}' && ${S}.mg.phase==='intro'`);
    await t.click('mg-start');
    await t.ev(`window.__mc.input.reset();${M}.avanzar(3.1)`);
    // el palpador necesita un momento quieto sobre la celda
    if (motor === 'valle.curil') await t.ev(`${M}.avanzar(1.2)`);
    await t.click(`touch-${boton}`);
    await t.waitFor(`(s=>s.${cumple})(${M}.estado().stats)`);
    console.log(`PASA toque ${boton} en ${motor}`);
  }
  await t.shot(`${shots}/volcan-tactil.png`);
  assert.equal(t.errors.length, 0, t.errors.join('\n'));
});
process.exitCode = ok && tactil ? 0 : 1;
