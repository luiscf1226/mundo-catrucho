// MC-42 · Islas de la Bahía: 12 puestos jugables, 7 lugares y 3 locuras que se descubren caminando,
// controles reales de los ocho motores (teclado, toque y mando) y capturas en capturas/mc-42/.
// Uso: node tools/test-islas.mjs <archivo.html>
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { locuraCaminando, lugaresTuristicos } from './explorar.mjs';
import { run } from './harness.mjs';

const file = process.argv[2] ?? 'apps/web/dist/mundo-catrucho-hd.html';
const raiz = resolve(import.meta.dirname, '../../..');
const puntos = JSON.parse(readFileSync(new URL('../src/game/dept/zones/islas-puntos.json', import.meta.url)));
const juegos = JSON.parse(readFileSync(new URL('../shared/data/catalogo/norte.json', import.meta.url))).islas.juegos;
const contenido = JSON.parse(readFileSync(resolve(raiz, 'docs/generador/contenido.json'))).islas;
const capturas = resolve(raiz, 'capturas/mc-42');
const sinGpu = process.env.MC_GPU === '0';
const S = 'window.__mc.store.getState()';
const E = 'window.__mcTest.motor.estado()';

async function entrar(t) {
  await t.click('btn-jugar');
  await t.click('ed-done');
  await t.waitFor(`${S}.profile.created && !${S}.panel`);
}
async function abrir(t, id, juego) {
  await t.ev(`${S}.setModo('solo'); ${S}.${juego ? `startJuego('${juego}')` : `startMinigame('${id}')`}`);
  await t.waitFor(`window.__mcTest?.motor?.estado().id === '${id}' && ${S}.mg.phase === 'intro'`);
  await t.click('mg-start');
  await t.waitFor(`${S}.mg.phase === 'playing'`);
  await t.ev('window.__mcTest.motor.avanzar(3.1)');
}

const ok = await run('islas', file, { hash: '#test', width: 1280, height: 800 }, async (t) => {
  await entrar(t);
  // --- contenido: cada juego del catálogo con un motor de contenido.json, sin motores viejos
  assert.equal(juegos.length, 12);
  for (const j of juegos) {
    const fuente = contenido.juegos.find((c) => c.id === `islas.${j[0]}`);
    assert.ok(fuente, `islas.${j[0]} está en contenido.json`);
    assert.equal(j[2], fuente.motor, `motor de islas.${j[0]}`);
  }
  assert.deepEqual(
    [...new Set(juegos.map((j) => j[2]))].sort(),
    contenido.motores.map((m) => m.id).sort(),
    'los ocho motores tienen juego',
  );
  // --- los 12 puestos abren su juego
  await t.ev(`${S}.travel('islas')`);
  await t.waitFor(
    "window.__mcTest?.dept?.id === 'islas' && window.__mcTest?.lugares?.st?.some(s=>s.booths.some(b=>b.id.startsWith('islas.')))",
  );
  const puestos = await t.ev('window.__mcTest.lugares.st.flatMap(s=>s.booths)');
  assert.equal(puestos.length, 12, 'doce puestos');
  if (!sinGpu) await t.shot(`${capturas}/departamento.png`);
  for (const p of puestos) {
    await t.ev(`window.__mc.player.teleport(...${JSON.stringify(p.use)})`);
    await t.waitFor("document.querySelector('[data-testid=prompt]')?.textContent.includes('Jugar:')");
    await t.press('e');
    await t.waitFor("!!document.querySelector('[data-testid=mg-intro]')");
    assert.equal(await t.ev(`${S}.mg.juego`), p.id);
    const motor = juegos.find((j) => `islas.${j[0]}` === p.id)[2];
    assert.equal(await t.ev(`${S}.mg.id`), motor);
    await t.click('mg-back');
    await t.waitFor(`!${S}.mg && window.__mcTest.dept.id==='islas'`);
  }
  console.log('PASA 12 puestos abren su juego');
  // --- 7 lugares y 3 locuras se descubren caminando
  assert.equal(puntos.length, 10);
  assert.equal(await lugaresTuristicos(t, 'islas'), 7);
  for (let i = 7; i < puntos.length; i++) {
    const p = puntos[i];
    assert.equal(p.nombre, contenido.locuras[i - 7].nombre);
    await locuraCaminando(t, { x: p.x, y: 2, z: p.z, atras: 3.2, nombre: p.nombre, texto: p.texto });
    if (!sinGpu) await t.shot(`${capturas}/descubrimiento-${i + 1}.png`);
    await t.click('dialog-close');
    if (!sinGpu && i >= 7) {
      await t.ev(`window.__mc.player.fixedCam={pos:[${p.x + 3},${4.5},${p.z + 6}],target:[${p.x},1.2,${p.z}],fov:50}`);
      await t.ev('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
      await t.shot(`${capturas}/locura-${i - 6}-escena.png`);
      await t.ev('window.__mc.player.fixedCam=null');
    }
  }
  console.log('PASA 7 lugares y 3 locuras descubiertos caminando');
  // --- controles de teclado de cada motor
  await abrir(t, 'islas.ballena');
  await t.press('f');
  await t.waitFor(`${E}.stats.intentos === 1`);
  await abrir(t, 'islas.coral');
  await t.press('f');
  await t.waitFor(`${E}.stats.puestos === 1`);
  await abrir(t, 'islas.bonacca');
  await t.press('f');
  await t.waitFor(`${E}.stats.intentos === 1`);
  await abrir(t, 'islas.estela');
  await t.holdUntil('d', `${E}.stats.x > -7`);
  await t.press('f');
  await t.waitFor(`${E}.stats.intentos === 1`);
  await abrir(t, 'islas.flotacion');
  await t.holdUntil('w', `${E}.stats.aire > 0.4`);
  await abrir(t, 'islas.colorprofundo');
  await t.holdUntil('d', `${E}.stats.sel === 2`);
  await t.press('f');
  await t.waitFor(`${E}.stats.intentos === 1`);
  await abrir(t, 'islas.cangrejo');
  for (let k = 0; k < 4 && !(await t.ev(`${E}.stats.puestas > 0`)); k++) {
    await t.holdUntil('w', `false`, 250).catch(() => {});
    await t.press('f');
  }
  await t.waitFor(`${E}.stats.puestas > 0`);
  await abrir(t, 'islas.absorcion');
  await t.press('e');
  await t.press('f');
  await t.waitFor(`${E}.stats.revueltas === 1 && ${E}.stats.echadas === 1`);
  console.log('PASA controles de teclado de los ocho motores');
  // --- una captura jugando de cada motor, con su juego del catálogo
  if (!sinGpu) {
    for (const id of contenido.motores.map((m) => m.id)) {
      const j = juegos.find((x) => x[2] === id);
      await abrir(t, id, `islas.${j[0]}`);
      await t.ev('window.__mcTest.motor.jugarBot(); window.__mcTest.motor.avanzar(9)');
      await t.ev(`${S}.toasts.forEach(x => ${S}.dropToast(x.id))`);
      await t.ev('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
      await t.shot(`${capturas}/${id.split('.')[1]}.png`);
      const r = await t.calls();
      assert.ok(r && r.calls < 350, `${id}: ${r?.calls} llamadas de dibujo`);
    }
    console.log('PASA capturas de los ocho motores');
  }
  // --- mando: el stick derecho mueve la elección y B confirma
  await t.ev(`(()=>{window.__pad={id:'Mando de prueba (STANDARD GAMEPAD)',index:0,connected:true,mapping:'standard',timestamp:0,
    axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
    navigator.getGamepads=()=>[window.__pad];})()`);
  await abrir(t, 'islas.colorprofundo');
  const sel0 = await t.ev(`${E}.stats.sel`);
  await t.ev('window.__pad.axes[2]=-1');
  await t.waitFor(`${E}.stats.sel < ${sel0}`, 15000, 'el stick derecho mueve la carta');
  await t.ev('window.__pad.axes[2]=0');
  await t.ev('(()=>{const b=window.__pad.buttons[1];b.pressed=true;b.value=1})()');
  await t.waitFor(`${E}.stats.intentos === 1`, 15000, 'B confirma');
  await t.ev('(()=>{const b=window.__pad.buttons[1];b.pressed=false;b.value=0})()');
  console.log('PASA mando en el motor de color');
  assert.equal(t.errors.length, 0, 'sin excepciones ni red');
});
const tactil = await run('islas-tactil', file, { hash: '#test', width: 1100, height: 800, touch: true }, async (t) => {
  await entrar(t);
  await abrir(t, 'islas.absorcion');
  await t.click('touch-use');
  await t.click('touch-fire');
  await t.waitFor(`${E}.stats.revueltas === 1 && ${E}.stats.echadas === 1`);
  if (!sinGpu) await t.shot(`${capturas}/absorcion-tactil.png`);
  await abrir(t, 'islas.coral');
  await t.click('touch-fire');
  await t.waitFor(`${E}.stats.puestos === 1`);
  console.log('PASA toque: echar, revolver y sembrar');
});
process.exitCode = ok && tactil ? 0 : 1;
