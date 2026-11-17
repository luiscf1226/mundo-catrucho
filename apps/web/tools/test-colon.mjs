// Colón (MC-41): 12 puestos, 6 lugares para explorar, 3 locuras, los siete motores propios y el comal del casabe
// (cocina con tema). Prueba teclado, toque, mando, modos, que la inacción y machacar F pierdan, el oro hasta la
// última etapa y los topes del servidor. Con MC_GPU=0 juega solo las dos primeras etapas de cada juego.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validarResultado } from '../../../packages/reglas/src/topes.ts';
import { run } from './harness.mjs';

const file = process.argv[2] ?? 'apps/web/dist/mundo-catrucho-hd.html';
const juegos = JSON.parse(readFileSync(new URL('../shared/data/catalogo/norte.json', import.meta.url))).colon.juegos;
const turismo = JSON.parse(readFileSync(new URL('../../../docs/generador/contenido.json', import.meta.url))).colon
  .turismo;
const puntos = JSON.parse(readFileSync(new URL('../src/game/dept/zones/colon-puntos.json', import.meta.url)));
const delKit = juegos.filter((j) => j[2].startsWith('colon.'));
const casabe = juegos.filter((j) => j[2] === 'cocina');
const motores = [...new Set(delKit.map((j) => j[2]))];
const sinGpu = process.env.MC_GPU === '0';
const shots = resolve(sinGpu ? 'capturas/mc-41-sin-gpu' : 'capturas/mc-41');
const S = 'window.__mc.store.getState()',
  M = 'window.__mcTest.motor',
  C = 'window.__mcTest.cocina',
  cuadro = 'new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))';

assert.equal(juegos.length, 12);
assert.equal(motores.length, 7);
assert.equal(casabe.length, 2);

const ok = await run('colon', file, { hash: '#test', width: 1280, height: 800 }, async (t) => {
  await t.click('btn-jugar');
  await t.click('ed-done');
  await t.ev(`${S}.travel('colon')`);
  await t.waitFor(
    "window.__mcTest?.dept?.id==='colon' && window.__mcTest?.lugares?.st?.flatMap(s=>s.booths).length===12 && window.__mcTest?.turismo?.dept==='colon'",
    30000,
  );
  await t.ev('window.__mc.player.fixedCam={pos:[34,30,52],target:[0,1,4],fov:55}');
  await t.waitFor("!document.querySelector('[data-testid=celebration]')", 20000);
  await t.ev(`${S}.toasts.forEach(t=>${S}.dropToast(t.id))`);
  await t.ev(cuadro);
  const dibujo = await t.calls();
  assert.ok(dibujo.calls < 350, `zona ${dibujo.calls} llamadas`);
  await t.shot(`${shots}/departamento.png`);
  await t.ev('window.__mc.player.fixedCam=null');

  // Los 12 puestos se abren caminando hasta ellos y con E
  const puestos = await t.ev('window.__mcTest.lugares.st.flatMap(s=>s.booths)');
  assert.deepEqual(puestos.map((p) => p.id).sort(), juegos.map((j) => `colon.${j[0]}`).sort());
  for (const p of puestos) {
    await t.ev(`window.__mc.player.teleport(...${JSON.stringify(p.use)})`);
    await t.waitFor("document.querySelector('[data-testid=prompt]')?.textContent.includes('Jugar:')");
    await t.press('e');
    await t.waitFor("!!document.querySelector('[data-testid=mg-intro]')");
    assert.equal(await t.ev(`${S}.mg.juego`), p.id);
    await t.click('mg-back');
    await t.waitFor(`!${S}.mg`);
  }
  console.log(`PASA 12 puestos con E · zona ${dibujo.calls} llamadas`);

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
    await t.ev(`window.__mc.player.teleport(${x},(window.__mc.phys.ground?.(${x},${z + 4})??0)+0.3,${z + 4},0)`);
    await t.holdUntil(
      'w',
      `document.querySelector('[data-testid=prompt]')?.textContent.includes(${JSON.stringify(puntos[i].nombre)})`,
    );
    await t.press('e');
    await t.waitFor(`${S}.dialog?.title===${JSON.stringify(puntos[i].nombre)}`);
    assert.equal(await t.ev(`${S}.dialog.text`), puntos[i].texto);
    assert.equal(await t.ev('window.__mc.player.state.anim'), 'asombro', 'la locura asombra al muñeco');
    await t.click('dialog-close');
    await t.ev(`window.__mc.player.teleport(${x + 2.5},window.__mc.player.pos[1]+0.2,${z + 3.5},0)`);
    await t.ev(
      `window.__mc.player.fixedCam={pos:[${x - 1.5},window.__mc.player.pos[1]+3,${z + 6}],target:[${x},window.__mc.player.pos[1]+0.8,${z}],fov:50}`,
    );
    await t.waitFor('false', 2500).catch(() => {});
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
  for (const j of delKit) {
    const id = `colon.${j[0]}`;
    for (let etapa = 0; etapa < Math.min(j[8], etapas); etapa++) {
      await abrir(id, j[2], etapa === 1 ? 'duo' : etapa > 1 ? 'abierto' : 'solo');
      assert.equal(await t.ev(`${M}.estado().etapa`), etapa, `${id} abre la etapa ${etapa + 1}`);
      await t.ev(`${M}.jugarBot();${M}.avanzar(12)`);
      if (etapa === 0) {
        await t.ev(`${S}.toasts.forEach(t=>${S}.dropToast(t.id))`);
        await t.ev(cuadro);
        const render = await t.calls();
        assert.ok(render.calls < 350, `${id} ${render.calls} llamadas`);
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
    // teclado: A y D mueven el cursor
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

  // Comal del casabe: la cocina con los pasos del casabe; un paso fuera de orden se cobra y un pedido se entrega
  for (const j of casabe) {
    const id = `colon.${j[0]}`;
    await t.ev(`window.__mc.input.reset();${S}.setModo('solo');${S}.startJuego('${id}')`);
    await t.waitFor(`${S}.mg?.phase==='intro'`);
    await t.click('mg-start');
    await t.waitFor(`${S}.mg?.phase==='playing' && !!${C}`);
    const bins = await t.ev(`${C}.bins`);
    assert.deepEqual(
      bins.map((b) => b.n).slice(0, j[7].pasos.length),
      j[7].pasos.map((p) => p[0]),
      `${id}: los recipientes son los pasos del casabe`,
    );
    const ir = async (b) => {
      await t.ev(`window.__mc.player.teleport(${b.pos[0]},0,${b.pos[2] + 1})`);
      await t.ev(cuadro);
    };
    await t.waitFor(`${C}.state().pedido`, 20000, 'primer pedido');
    let s = await t.ev(`${C}.state()`);
    await ir(bins.find((b) => b.k !== s.pedido.seq[0]));
    await t.press('e');
    await t.waitFor(`${C}.state().errores===1 && ${C}.state().prog===0`);
    await t.waitFor(`${C}.state().pedido && !${C}.state().listo`, 20000);
    s = await t.ev(`${C}.state()`);
    for (const k of s.pedido.seq) {
      const prog = await t.ev(`${C}.state().prog`);
      await ir(bins.find((b) => b.k === k));
      await t.press('e');
      await t.waitFor(`${C}.state().prog>${prog} || ${C}.state().listo`);
    }
    const slots = await t.ev(`${C}.slots`);
    await t.ev(`window.__mc.player.teleport(${slots[s.pedido.slot]},0,-3.2)`);
    await t.ev(cuadro);
    await t.press('e');
    await t.waitFor(`${C}.state().servidos===1`);
    if (j === casabe[0]) {
      await t.ev(`${S}.toasts.forEach(t=>${S}.dropToast(t.id))`);
      await t.shot(`${shots}/${j[0]}.png`);
    }
    await t.ev(`${C}.skip(9999)`);
    await t.waitFor("!!document.querySelector('[data-testid=mg-result]')");
    const r = await t.ev(`${S}.mg.result`);
    const veredicto = validarResultado({
      motor: 'cocina',
      puntos: r.score,
      estrellas: r.stars,
      duracion: 100,
      etapa: 0,
      etapas: j[8],
      gano: r.won,
      tema: j[7],
    });
    assert.ok(veredicto.ok, `${id}: ${veredicto.motivos.join(', ')}`);
    console.log(`PASA ${id}: pasos del casabe en orden, error cobrado y pedido entregado (${r.score} pts)`);
  }
  assert.equal(t.errors.length, 0, t.errors.join('\n'));
});

const tactil = await run('colon-tactil', file, { hash: '#test', touch: true, width: 900, height: 700 }, async (t) => {
  await t.click('btn-jugar');
  await t.click('ed-done');
  for (const [motor, cumple] of [
    ['colon.salinidad', 'ajustes>0'],
    ['colon.gajos', 'tajos>0'],
    ['colon.racimos', 'malos>0'],
    ['colon.redjuvenil', 'malas>0'],
  ]) {
    await t.ev(
      `window.__mc.input.reset();window.__mc.input.px=0;window.__mc.input.py=0;${S}.startMinigame('${motor}')`,
    );
    await t.waitFor(`${M}?.estado().id==='${motor}' && ${S}.mg.phase==='intro'`);
    await t.click('mg-start');
    await t.ev(`window.__mc.input.reset();${M}.avanzar(3.1)`);
    await t.click('touch-fire');
    await t.waitFor(`(s=>s.${cumple})(${M}.estado().stats)`);
    console.log(`PASA toque 🎯 en ${motor}`);
  }
  await t.shot(`${shots}/tactil.png`);
  assert.equal(t.errors.length, 0, t.errors.join('\n'));
});
process.exitCode = ok && tactil ? 0 : 1;
