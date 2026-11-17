// Yoro (MC-43): 12 puestos, 6 lugares para explorar, 3 locuras, los siete motores propios y la Lluvia de Peces
// sobre el motor «atrapa» (cubeta, poza, relámpagos y dos cubetas). Prueba teclado, toque, mando, modos, que la
// inacción y machacar F pierdan, el oro hasta la última etapa y los topes del servidor.
// MC_SOLO=<texto> corre solo los juegos y motores que lo contengan y se salta el recorrido de la zona.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validarResultado } from '../../../packages/reglas/src/topes.ts';
import { run } from './harness.mjs';

const file = process.argv[2] ?? 'apps/web/dist/mundo-catrucho-hd.html';
const juegos = JSON.parse(readFileSync(new URL('../shared/data/catalogo/norte.json', import.meta.url))).yoro.juegos;
const turismo = JSON.parse(readFileSync(new URL('../../../docs/generador/contenido.json', import.meta.url))).yoro
  .turismo;
const puntos = JSON.parse(readFileSync(new URL('../src/game/dept/zones/yoro-puntos.json', import.meta.url)));
const solo = process.env.MC_SOLO;
const elegidos = solo ? juegos.filter((j) => j[0].includes(solo) || j[2].includes(solo)) : juegos;
const kit = elegidos.filter((j) => j[2] !== 'atrapa'),
  atrapa = elegidos.filter((j) => j[2] === 'atrapa');
const motores = [...new Set(kit.map((j) => j[2]))];
const sinGpu = process.env.MC_GPU === '0';
const shots = resolve(sinGpu ? 'capturas/mc-43-sin-gpu' : 'capturas/mc-43');
const S = 'window.__mc.store.getState()',
  M = 'window.__mcTest.motor',
  A = 'window.__mcTest.atrapa',
  cuadro = 'new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))';
const difDe = (etapa, etapas) => (etapas > 1 ? etapa / (etapas - 1) : 0.35);

const ok = await run('yoro', file, { hash: '#test', width: 1280, height: 800 }, async (t) => {
  await t.click('btn-jugar');
  await t.click('ed-done');
  if (!solo) await recorrido();
  async function recorrido() {
    await t.ev(`${S}.travel('yoro')`);
    await t.waitFor(
      "window.__mcTest?.dept?.id==='yoro' && window.__mcTest?.lugares?.st?.flatMap(s=>s.booths).length===12 && window.__mcTest?.turismo?.dept==='yoro'",
      30000,
    );
    await t.ev('window.__mc.player.fixedCam={pos:[14,18,52],target:[0,3,18],fov:60}');
    await t.waitFor("!document.querySelector('[data-testid=celebration]')", 20000);
    await t.ev(`${S}.toasts.forEach(t=>${S}.dropToast(t.id))`);
    await t.ev(cuadro);
    const dibujo = await t.calls();
    assert.ok(dibujo.calls < 350, `zona ${dibujo.calls} llamadas`);
    await t.shot(`${shots}/departamento.png`);
    await t.ev('window.__mc.player.fixedCam=null');

    // Los 12 puestos se abren caminando hasta ellos y con E
    const puestos = await t.ev('window.__mcTest.lugares.st.flatMap(s=>s.booths)');
    assert.deepEqual(puestos.map((p) => p.id).sort(), juegos.map((j) => `yoro.${j[0]}`).sort());
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
      await t.holdUntil(
        'w',
        `Math.hypot(window.__mc.player.pos[0]-(${x}),window.__mc.player.pos[2]-(${z}))<1.5 && document.querySelector('[data-testid=prompt]')?.textContent.includes('✨')`,
      );
      await t.press('e');
      await t.waitFor(`${S}.dialog?.title===${JSON.stringify(puntos[i].nombre)}`);
      assert.equal(await t.ev(`${S}.dialog.text`), puntos[i].texto);
      await t.click('dialog-close');
      await t.ev(`window.__mc.player.teleport(${x},window.__mc.player.pos[1]+0.2,${z + 3.2},0)`);
      await t.ev(
        `window.__mc.player.fixedCam={pos:[${x - 2},window.__mc.player.pos[1]+3,${z + 6}],target:[${x},window.__mc.player.pos[1]+0.9,${z}],fov:50}`,
      );
      await t.waitFor('false', 3200).catch(() => {});
      await t.shot(`${shots}/locura-${i + 1}.png`);
      await t.ev('window.__mc.player.fixedCam=null');
    }
    console.log('PASA 3 locuras caminando');
  }
  async function abrir(juego, motor, modo = 'solo') {
    await t.ev(
      `window.__mc.input.reset();window.__mc.input.px=0;window.__mc.input.py=0;navigator.getGamepads=()=>[];${S}.setModo('${modo}');${S}.${juego ? 'startJuego' : 'startMinigame'}('${juego ?? motor}')`,
    );
    await t.waitFor(`${M}?.estado().id==='${motor}' && ${S}.mg.phase==='intro'`);
    await t.click('mg-start');
    await t.ev(`window.__mc.input.reset();${M}.avanzar(3.1)`);
  }
  const etapas = sinGpu ? 2 : Number.POSITIVE_INFINITY;
  for (const j of kit) {
    const id = `yoro.${j[0]}`;
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
      console.log(`  ${id} etapa ${etapa + 1}: ${r.score} pts (${(r.score / 75).toFixed(1)} pts/s)`);
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
    const x0 = await t.ev(`${M}.estado().stats.x`);
    await t.holdUntil(x0 > 0 ? 'a' : 'd', `Math.abs(${M}.estado().stats.x-(${x0}))>0.05`);
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

  // Lluvia de Peces sobre «atrapa»: cubeta con cupo, poza, relámpagos y dos cubetas por turnos
  async function abrirAtrapa(id, modo = 'solo') {
    await t.ev(
      `window.__mc.input.reset();navigator.getGamepads=()=>[];${S}.setModo('${modo}');${S}.${id.includes('.') ? 'startJuego' : 'startMinigame'}('${id}')`,
    );
    await t.waitFor(`${S}.mg?.phase==='intro' && !!document.querySelector('[data-testid=mg-start]')`);
    await t.click('mg-start');
    await t.waitFor(`${S}.mg?.phase==='playing' && !!${A}?.avanzar`);
  }
  for (const j of atrapa) {
    const id = `yoro.${j[0]}`;
    for (let etapa = 0; etapa < Math.min(j[8], etapas); etapa++) {
      await t.ev(
        `window.__mc.store.setState(s=>({profile:{...s.profile,juegos:{...s.profile.juegos,'${id}':{etapa:${etapa},stars:[],best:0,label:'',veces:0}}}}))`,
      );
      await abrirAtrapa(id, etapa === 1 ? 'duo' : etapa > 1 ? 'abierto' : 'solo');
      assert.equal(await t.ev(`${S}.mg.etapa`), etapa, `${id} abre la etapa ${etapa + 1}`);
      const s0 = await t.ev(`${A}.state()`);
      assert.ok(s0.poza, `${id}: la cubeta y la poza están puestas`);
      await t.ev(`${A}.jugarBot()`);
      let rayos = 0;
      for (let k = 0; k < 40 && !(await t.ev(`!!${S}.mg.result`)); k++) {
        await t.ev(`${A}.avanzar(3)`);
        rayos += await t.ev(`${A}.state().rayos`);
        if (etapa === 0 && k === 4) {
          await t.ev(cuadro);
          const render = await t.calls();
          assert.ok(render.calls < 350, `${id} ${render.calls} llamadas`);
          await t.ev(`${S}.toasts.forEach(t=>${S}.dropToast(t.id))`);
          await t.shot(`${shots}/${j[0]}.png`);
        }
      }
      const s1 = await t.ev(`${A}.state()`);
      assert.ok(s1.vaciadas > 0, `${id}: vació la cubeta`);
      if (j[7].tandas) assert.ok(rayos > 0, `${id}: hubo relámpagos antes de la tanda`);
      if (j[7].cubetas) assert.ok(s1.llenas > 0, `${id}: llenó alguna de las dos cubetas`);
      const r = await t.ev(`${S}.mg.result`);
      const dif = difDe(etapa, j[8]);
      const veredicto = validarResultado({
        motor: 'atrapa',
        puntos: r.score,
        estrellas: r.stars,
        duracion: Math.round(70 + 20 * dif),
        etapa,
        etapas: j[8],
        gano: r.won,
        tema: j[7],
      });
      assert.ok(veredicto.ok, `${id}: ${veredicto.motivos.join(', ')}`);
      assert.equal(r.stars, 3, `Oro en ${id}, etapa ${etapa + 1}: ${r.score} pts`);
      console.log(
        `  ${id} etapa ${etapa + 1}: ${r.score} pts · vaciadas ${s1.vaciadas} · llenas ${s1.llenas} · rebalses ${s1.rebalses}`,
      );
    }
    console.log(`PASA ${id}: ${Math.min(j[8], etapas)} etapas con oro`);
    // sin jugar se pierde; con teclado el muñeco camina y al pisar la poza vacía la cubeta
    await abrirAtrapa(id);
    await t.ev(`${A}.avanzar(123)`);
    assert.equal(await t.ev(`${S}.mg.result.won`), false, `${id}: no jugar pierde`);
    await abrirAtrapa(id);
    const p0 = (await t.ev(`${A}.state()`)).player[0];
    await t.hold('d', 500);
    assert.ok((await t.ev(`${A}.state()`)).player[0] > p0 + 0.5, `${id}: D mueve al muñeco`);
    const pozas = (await t.ev(`${A}.state()`)).pozas;
    for (let k = 0; k < 200 && (await t.ev(`${A}.state().carga`)) === 0; k++) {
      const s = await t.ev(`${A}.state()`);
      const it = s.items.filter((i) => i.kind !== 'malo' && i.y > 1.4).sort((a, b) => a.y - b.y)[0];
      if (it) await t.ev(`window.__mc.player.teleport(${it.x},0,${it.z})`);
      await t.sleep(40);
    }
    const turno = await t.ev(`${A}.state().turno`);
    const [qx, qz] = pozas[pozas.length > 1 ? turno : 0];
    await t.ev(`window.__mc.player.teleport(${qx + 3},0,${qz})`);
    await t.holdUntil('a', `${A}.state().carga===0`);
    console.log(`PASA ${id}: inacción pierde; teclado camina y la poza vacía la cubeta`);
    await t.ev(`${S}.exitMinigame()`);
  }
  assert.equal(t.errors.length, 0, t.errors.join('\n'));
});

const tactil = await run('yoro-tactil', file, { hash: '#test', touch: true, width: 900, height: 700 }, async (t) => {
  await t.click('btn-jugar');
  await t.click('ed-done');
  for (const [motor, boton, cumple, px = 0] of [
    ['yoro.cable', 'fire', 'toques>0'],
    ['yoro.cable', 'use', 'sueltos>0'],
    ['yoro.acuerdos', 'fire', 'elegidos>0'],
    ['yoro.acuerdos', 'use', 'pendientes+s.fallas>0'],
    ['yoro.jamo', 'fire', 'curvas+s.rozones+s.ciegas>0', 0.8],
    ['yoro.ulua', 'fire', 'puestos>0'],
    ['yoro.pijol', 'fire', 'toques>0'],
    ['yoro.pijol', 'use', 'pasos+s.fallas>0'],
    ['yoro.almohadilla', 'fire', 'tajos>0'],
    ['yoro.coyol', 'fire', 'pruebas>0'],
    ['yoro.coyol', 'use', 'alPunto+s.casi+s.aguadas+s.pasadas>0'],
  ].filter(([motor]) => motores.includes(motor))) {
    await t.ev(
      `window.__mc.input.reset();window.__mc.input.px=0;window.__mc.input.py=0;${S}.startMinigame('${motor}')`,
    );
    await t.waitFor(`${M}?.estado().id==='${motor}' && ${S}.mg.phase==='intro'`);
    await t.click('mg-start');
    await t.ev(`window.__mc.input.reset();${M}.avanzar(3.1)`);
    // algunos motores esperan su primera ronda (sensores, primera ficha); el Jamo dobla hacia un lado
    await t.ev(`window.__mc.input.px=${px};${M}.avanzar(1.5)`);
    await t.click(`touch-${boton}`);
    await t.waitFor(`(s=>s.${cumple})(${M}.estado().stats)`);
    console.log(`PASA toque ${boton} en ${motor}`);
  }
  await t.shot(`${shots}/tactil.png`);
  assert.equal(t.errors.length, 0, t.errors.join('\n'));
});
process.exitCode = ok && tactil ? 0 : 1;
