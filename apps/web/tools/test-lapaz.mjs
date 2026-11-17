// MC-38: La Paz de punta a punta. Puestos, lugares de turismo, locuras, los doce juegos con oro hasta la última
// etapa (validados con los topes del servidor), inacción y machaque pierden, teclado, mando, toque y motores sin tema.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validarResultado } from '../../../packages/reglas/src/topes.ts';
import { run } from './harness.mjs';

const file = process.argv[2] ?? 'apps/web/dist/mundo-catrucho-hd.html';
const juegos = JSON.parse(readFileSync(new URL('../shared/data/catalogo/centro.json', import.meta.url))).lapaz.juegos;
const locuras = JSON.parse(readFileSync(new URL('../src/game/dept/zones/lapaz-puntos.json', import.meta.url)));
const contenido = JSON.parse(readFileSync(new URL('../../../docs/generador/contenido.json', import.meta.url)));
const shots = resolve('capturas/mc-38');
const sinGpu = process.env.MC_GPU === '0';
const S = 'window.__mc.store.getState()',
  M = 'window.__mcTest.motor',
  frame = 'new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))';

assert.equal(juegos.length, 12);
assert.equal(new Set(juegos.map((j) => j[2])).size, 8);
assert.ok(juegos.every((j) => j[2].startsWith('lapaz.')));

const ok = await run('lapaz', file, { hash: '#test', width: 1280, height: 800 }, async (t) => {
  await t.click('btn-jugar');
  await t.click('ed-done');
  await t.ev(`${S}.travel('lapaz')`);
  await t.waitFor(
    "window.__mcTest?.dept?.id==='lapaz' && window.__mcTest?.lugares?.st?.flatMap(s=>s.booths).length===12",
    30000,
  );
  await t.ev('window.__mc.player.fixedCam={pos:[38,28,40],target:[0,1,-8],fov:55}');
  await t.ev(frame);
  const zona = await t.calls();
  assert.ok(zona.calls < 350, `zona ${zona.calls} llamadas`);
  await t.shot(`${shots}/departamento.png`);
  await t.ev('window.__mc.player.fixedCam=null');

  // 12 puestos: se entra caminando y con E
  const puestos = await t.ev('window.__mcTest.lugares.st.flatMap(s=>s.booths)');
  for (const p of puestos) {
    await t.ev(`window.__mc.player.teleport(...${JSON.stringify(p.use)})`);
    await t.waitFor("document.querySelector('[data-testid=prompt]')?.textContent.includes('Jugar:')");
    await t.press('e');
    await t.waitFor("!!document.querySelector('[data-testid=mg-intro]')");
    assert.equal(await t.ev(`${S}.mg.juego`), p.id);
    await t.click('mg-back');
    await t.waitFor(`!${S}.mg`);
  }
  console.log(`PASA 12 puestos · zona ${zona.calls} llamadas`);

  // 6 lugares para explorar (turismo) y 3 locuras
  await t.waitFor("window.__mcTest?.turismo?.dept==='lapaz'", 20000);
  const turismo = await t.ev('window.__mcTest.turismo.puntos');
  assert.equal(turismo.length, contenido.lapaz.turismo.length);
  assert.equal(turismo.length, 6);
  const primero = turismo[0];
  await t.ev(`window.__mc.player.teleport(${primero.pos[0]},${primero.pos[1] + 0.1},${primero.pos[2]})`);
  await t.waitFor(`${S}.profile.turismo.some(x=>x.id===${JSON.stringify(primero.lugar.id)})`);
  console.log(`PASA 6 lugares conectados; descubierto «${primero.lugar.nombre}»`);
  for (let i = 0; i < locuras.length; i++) {
    const [x, z] = locuras[i].pos;
    await t.ev(`window.__mc.player.teleport(${x},0.2,${z + 2.4},0)`);
    await t.waitFor(
      `document.querySelector('[data-testid=prompt]')?.textContent.includes(${JSON.stringify(locuras[i].nombre)})`,
    );
    await t.press('e');
    await t.waitFor(`${S}.dialog?.title===${JSON.stringify(locuras[i].nombre)}`);
    assert.equal(await t.ev(`${S}.dialog.text`), locuras[i].texto);
    await t.click('dialog-close');
    await t.ev(frame);
    await t.shot(`${shots}/locura-${i + 1}.png`);
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
  for (const j of juegos) {
    const id = `lapaz.${j[0]}`;
    await abrir(id, j[2]);
    await t.ev(`${M}.avanzar(123)`);
    assert.equal(await t.ev(`${S}.mg.result.won`), false, `${id} pierde sin jugar`);
    await abrir(id, j[2]);
    await t.ev(`for(let i=0;i<1500;i++){window.__mc.input.press('fire');${M}.avanzar(0.05)}`);
    assert.equal(await t.ev(`${S}.mg.result.won`), false, `${id} rechaza machacar F`);
    const etapas = sinGpu ? 1 : j[8];
    let llamadas = 0;
    for (let etapa = 0; etapa < etapas; etapa++) {
      await abrir(id, j[2], etapa === 1 ? 'duo' : etapa > 1 ? 'abierto' : 'solo');
      assert.equal(await t.ev(`${M}.estado().etapa`), etapa, `${id} abre la etapa ${etapa + 1}`);
      await t.ev(`${M}.jugarBot();${M}.avanzar(12)`);
      if (etapa === 0) {
        await t.ev(`${S}.toasts.forEach(x=>${S}.dropToast(x.id))`);
        await t.ev(frame);
        llamadas = (await t.calls()).calls;
        assert.ok(llamadas < 350, `${id}: ${llamadas} llamadas`);
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
      assert.equal(r.stars, 3, `${id}: oro en la etapa ${etapa + 1} (${r.score} pts)`);
    }
    console.log(`PASA ${id}: inacción y machaque pierden; oro en ${etapas} etapas; ${llamadas} llamadas`);
  }
  if (sinGpu) console.log('SALTA etapas 2+ de cada juego sin GPU (correlas con GPU)');

  for (const motor of new Set(juegos.map((j) => j[2]))) {
    await abrir(null, motor);
    // teclado: A/D mueve el cursor de verdad
    const x = await t.ev(`${M}.estado().stats.x`);
    await t.holdUntil(x > 0 ? 'a' : 'd', `Math.abs(${M}.estado().stats.x-(${x}))>0.05`);
    // mando: el stick derecho mueve el cursor
    await t.ev(
      `window.__pad={id:'Mando de prueba',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0,${x > 0 ? -1 : 1},0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};navigator.getGamepads=()=>[window.__pad]`,
    );
    const antes = await t.ev(`${M}.estado().stats.x`);
    await t.waitFor(`Math.abs(${M}.estado().stats.x-(${antes}))>0.03`);
    await t.ev('window.__pad.connected=false;navigator.getGamepads=()=>[]');
    await t.ev(`${M}.jugarBot();${M}.avanzar(123)`);
    assert.equal(await t.ev(`${S}.mg.result.stars`), 3, `${motor} sin tema llega a oro`);
  }
  console.log('PASA teclado, mando y ocho motores sin tema');

  // saludar alternando las dos comitivas sin pensar en quién va debiendo no gana
  await abrir('lapaz.dos-pueblos-se-saludan', 'lapaz.reciprocidad');
  await t.ev(
    `for(let i=0;i<1500;i++){if(i%18===0){window.__mc.input.px=(i/18)%2?0.5:-0.5;window.__mc.input.press('fire')}${M}.avanzar(0.05)}`,
  );
  assert.equal(await t.ev(`${S}.mg.result.won`), false, 'alternar comitivas a ciegas pierde');
  console.log('PASA alternar comitivas a ciegas pierde');
  assert.equal(t.errors.length, 0, t.errors.join('\n'));
});

const tactil = await run('lapaz-tactil', file, { hash: '#test', touch: true, width: 900, height: 700 }, async (t) => {
  await t.click('btn-jugar');
  await t.click('ed-done');
  for (const [motor, boton, cumple] of [
    ['lapaz.catacion', 'use', 'olfateos>0'],
    ['lapaz.cafe', 'fire', 'rojas+s.verdes+s.arrancados>0'],
    ['lapaz.tostador', 'fire', 'crudos>0'],
    ['lapaz.vapor', 'use', 'valvula===1'],
    ['lapaz.pesas', 'use', 'taradas>0'],
    ['lapaz.abrasigo', 'fire', 'trazos+s.errores+s.tocadas>0'],
    ['lapaz.estiba', 'fire', 'cargados>0'],
  ]) {
    await t.ev(`window.__mc.input.reset();${S}.startMinigame('${motor}')`);
    await t.waitFor(`${M}?.estado().id==='${motor}' && ${S}.mg.phase==='intro'`);
    await t.click('mg-start');
    await t.ev(`window.__mc.input.reset();window.__mc.input.px=0;window.__mc.input.py=0;${M}.avanzar(3.1)`);
    await t.click(`touch-${boton}`);
    await t.waitFor(`(s=>s.${cumple})(${M}.estado().stats)`);
    console.log(`PASA toque ${boton} en ${motor}`);
  }
  await t.shot(`${shots}/tactil.png`);
  assert.equal(t.errors.length, 0, t.errors.join('\n'));
});
process.exitCode = ok && tactil ? 0 : 1;
