// Gracias a Dios (MC-44): 12 puestos, 6 lugares para explorar, 3 locuras, los siete motores propios y el archivo de
// Ciudad Blanca sobre «exploradores». Prueba teclado, toque, mando, modos, que la inacción y machacar F pierdan, el oro
// hasta la última etapa con los topes del servidor y que el Exploradores clásico siga igual sin tema.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validarResultado } from '../../../packages/reglas/src/topes.ts';
import { run } from './harness.mjs';

const file = process.argv[2] ?? 'apps/web/dist/mundo-catrucho-hd.html';
const juegos = JSON.parse(readFileSync(new URL('../shared/data/catalogo/norte.json', import.meta.url))).graciasadios
  .juegos;
const turismo = JSON.parse(readFileSync(new URL('../../../docs/generador/contenido.json', import.meta.url)))
  .graciasadios.turismo;
const puntos = JSON.parse(readFileSync(new URL('../src/game/dept/zones/graciasadios-puntos.json', import.meta.url)));
// MC_SOLO=<texto> juega solo los juegos y motores que lo contengan y se salta el recorrido de la zona
const solo = process.env.MC_SOLO;
const elegidos = solo ? juegos.filter((j) => j[0].includes(solo) || j[2].includes(solo)) : juegos;
const motores = [...new Set(elegidos.map((j) => j[2]))];
// exploradores sin tema es la expedición de siempre: el archivo se abre con su juego del catálogo
const archivo = 'graciasadios.ciudad-blanca-sin-extraer';
const sinGpu = process.env.MC_GPU === '0';
const shots = resolve(sinGpu ? 'capturas/mc-44-sin-gpu' : 'capturas/mc-44');
const S = 'window.__mc.store.getState()',
  M = 'window.__mcTest.motor',
  cuadro = 'new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))';

const ok = await run('graciasadios', file, { hash: '#test', width: 1280, height: 800 }, async (t) => {
  // con varias pruebas en la misma GPU el menú puede tardar: se espera a que aparezca
  await t.waitFor("!!document.querySelector('[data-testid=btn-jugar]')", 90000);
  await t.click('btn-jugar');
  await t.click('ed-done');
  if (!solo) await recorrido();
  async function recorrido() {
    await t.ev(`${S}.travel('graciasadios')`);
    await t.waitFor(
      "window.__mcTest?.dept?.id==='graciasadios' && window.__mcTest?.lugares?.st?.flatMap(s=>s.booths).length===12 && window.__mcTest?.turismo?.dept==='graciasadios'",
      30000,
    );
    await t.ev('window.__mc.player.fixedCam={pos:[18,22,62],target:[0,2,28],fov:60}');
    await t.waitFor("!document.querySelector('[data-testid=celebration]')", 20000);
    await t.ev(`${S}.toasts.forEach(t=>${S}.dropToast(t.id))`);
    await t.ev(cuadro);
    const dibujo = await t.calls();
    assert.ok(dibujo.calls < 350, `zona ${dibujo.calls} llamadas`);
    await t.shot(`${shots}/departamento.png`);
    await t.ev('window.__mc.player.fixedCam=null');

    // Los 12 puestos se abren caminando hasta ellos y con E
    const puestos = await t.ev('window.__mcTest.lugares.st.flatMap(s=>s.booths)');
    assert.deepEqual(puestos.map((p) => p.id).sort(), juegos.map((j) => `graciasadios.${j[0]}`).sort());
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
      // el muñeco se aparta para que se vea la animación
      await t.ev(`window.__mc.player.teleport(${x},window.__mc.player.pos[1]+0.2,${z + 3.2},0)`);
      await t.ev(
        `window.__mc.player.fixedCam={pos:[${x - 2},window.__mc.player.pos[1]+3,${z + 7}],target:[${x},window.__mc.player.pos[1]+1,${z + 1}],fov:50}`,
      );
      await t.waitFor('false', 1600).catch(() => {});
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
  const etapas = sinGpu ? 2 : Infinity;
  for (const j of elegidos) {
    const id = `graciasadios.${j[0]}`;
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
    const juego = motor === 'exploradores' ? archivo : null;
    await abrir(juego, motor);
    await t.ev(`${M}.avanzar(123)`);
    assert.equal(await t.ev(`${S}.mg.result.won`), false, `${motor}: no jugar pierde`);
    await abrir(juego, motor);
    await t.ev(`for(let i=0;i<1500;i++){window.__mc.input.press('fire');${M}.avanzar(0.05)}`);
    assert.equal(await t.ev(`${S}.mg.result.won`), false, `${motor}: machacar F pierde`);
    await abrir(juego, motor);
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
    assert.equal(await t.ev(`${S}.mg.result.stars`), 3, `${motor} ${juego ? 'con su tema' : 'sin tema'} jugable`);
    console.log(`PASA ${motor}: inacción y machaque pierden; teclado, mando y ${juego ? 'archivo' : 'sin tema'}`);
  }
  if (motores.includes('exploradores')) {
    // sin tema, «exploradores» sigue siendo la expedición de Copán, Yojoa y Roatán
    await t.ev(`window.__mc.input.reset();${S}.setModo('solo');${S}.startMinigame('exploradores')`);
    await t.waitFor(`${S}.mg?.phase==='intro'`);
    await t.click('mg-start');
    await t.waitFor('window.__mcTest?.exploradores?.sites?.length===3', 20000);
    assert.equal(await t.ev('!!window.__mcTest.motor'), false, 'la expedición clásica no es del kit');
    await t.ev(`${S}.exitMinigame()`);
    await t.waitFor(`!${S}.mg`);
    console.log('PASA exploradores sin tema sigue siendo la expedición clásica');
  }
  assert.equal(t.errors.length, 0, t.errors.join('\n'));
});

const tactil = await run(
  'graciasadios-tactil',
  file,
  { hash: '#test', touch: true, width: 900, height: 700 },
  async (t) => {
    await t.waitFor("!!document.querySelector('[data-testid=btn-jugar]')", 90000);
    await t.click('btn-jugar');
    await t.click('ed-done');
    for (const [motor, boton, cumple, juego] of [
      ['graciasadios.lidar', 'fire', 'bien+s.mal>0'],
      ['graciasadios.lidar', 'use', 'usos>0'],
      ['graciasadios.pipante', 'fire', 'remadas>0'],
      ['graciasadios.pipante', 'use', 'remadas>0'],
      ['graciasadios.pistalempira', 'fire', 'grupo+s.sinPermiso>0'],
      ['graciasadios.pistalempira', 'use', 'usos>0'],
      ['graciasadios.caratasca', 'fire', 'vueltas>0'],
      ['graciasadios.caratasca', 'use', 'vueltas>0'],
      ['graciasadios.rastros', 'fire', 'marcadas>0'],
      ['graciasadios.rastros', 'use', 'bien+s.seguidas+s.errores>0'],
      ['graciasadios.wabul', 'fire', 'pasadas>0'],
      ['graciasadios.wabul', 'use', 'volteos>0'],
      ['graciasadios.truequeflotante', 'fire', 'intentos>0'],
      ['exploradores', 'fire', 'fallos+s.marcas>0', 'graciasadios.la-ficha-que-faltaba'],
      ['exploradores', 'use', 'fallos+s.excluidas>0', 'graciasadios.la-ficha-que-faltaba'],
    ].filter(([motor]) => motores.includes(motor))) {
      await t.ev(
        `window.__mc.input.reset();window.__mc.input.px=0;window.__mc.input.py=0;${S}.${juego ? 'startJuego' : 'startMinigame'}('${juego ?? motor}')`,
      );
      await t.waitFor(`${M}?.estado().id==='${motor}' && ${S}.mg.phase==='intro'`);
      await t.click('mg-start');
      await t.ev(`window.__mc.input.reset();${M}.avanzar(3.1)`);
      await t.click(`touch-${boton}`);
      await t.waitFor(`(s=>s.${cumple})(${M}.estado().stats)`);
      console.log(`PASA toque ${boton} en ${motor}`);
    }
    await t.shot(`${shots}/archivo-tactil.png`);
    assert.equal(t.errors.length, 0, t.errors.join('\n'));
  },
);
process.exitCode = ok && tactil ? 0 : 1;
