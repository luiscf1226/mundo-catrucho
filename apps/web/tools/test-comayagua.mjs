// MC-37 · Comayagua: 12 puestos jugables, 7 lugares y 3 locuras que se descubren caminando,
// controles reales de los ocho motores (teclado, toque y mando) y capturas en capturas/mc-37/.
// Uso: node tools/test-comayagua.mjs <archivo.html>
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { run } from './harness.mjs';

const file = process.argv[2] ?? 'apps/web/dist/mundo-catrucho-hd.html';
const raiz = resolve(import.meta.dirname, '../../..');
const puntos = JSON.parse(readFileSync(new URL('../src/game/dept/zones/comayagua-puntos.json', import.meta.url)));
const juegos = JSON.parse(readFileSync(new URL('../shared/data/catalogo/centro.json', import.meta.url))).comayagua
  .juegos;
const contenido = JSON.parse(readFileSync(resolve(raiz, 'docs/generador/contenido.json'))).comayagua;
const capturas = resolve(raiz, 'capturas/mc-37');
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

const ok = await run('comayagua', file, { hash: '#test', width: 1280, height: 800 }, async (t) => {
  await entrar(t);
  // --- contenido: cada juego del catálogo sale de contenido.json, con su motor, tipo y etapas
  assert.equal(juegos.length, 12);
  for (const j of juegos) {
    const fuente = contenido.juegos.find((c) => c.id === `comayagua.${j[0]}`);
    assert.ok(fuente, `comayagua.${j[0]} está en contenido.json`);
    assert.equal(j[2], fuente.motor, `motor de comayagua.${j[0]}`);
    assert.equal(j[8], fuente.etapas, `etapas de comayagua.${j[0]}`);
    assert.equal(j[7].loco, fuente.tipo === 'loco', `loco de comayagua.${j[0]}`);
  }
  assert.deepEqual(
    [...new Set(juegos.map((j) => j[2]))].sort(),
    contenido.motores.map((m) => m.id).sort(),
    'los ocho motores tienen juego',
  );
  // --- los 12 puestos abren su juego
  await t.ev(`${S}.travel('comayagua')`);
  await t.waitFor(
    "window.__mcTest?.dept?.id === 'comayagua' && window.__mcTest?.lugares?.st?.some(s=>s.booths.some(b=>b.id.startsWith('comayagua.')))",
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
    const motor = juegos.find((j) => `comayagua.${j[0]}` === p.id)[2];
    assert.equal(await t.ev(`${S}.mg.id`), motor);
    await t.click('mg-back');
    await t.waitFor(`!${S}.mg && window.__mcTest.dept.id==='comayagua'`);
  }
  console.log('PASA 12 puestos abren su juego');
  // --- 7 lugares y 3 locuras se descubren caminando
  assert.equal(puntos.length, 10);
  if (!sinGpu) {
    await t.ev('window.__mc.player.fixedCam={pos:[0,46,46],target:[0,0,10],fov:55}');
    await t.ev('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
    await t.shot(`${capturas}/plaza-desde-arriba.png`);
    await t.ev('window.__mc.player.fixedCam=null');
  }
  for (let i = 0; i < puntos.length; i++) {
    const p = puntos[i];
    const esperado = i < 7 ? contenido.turismo[i].nombre : contenido.locuras[i - 7].nombre;
    assert.equal(p.nombre, esperado);
    await t.ev(`window.__mc.player.teleport(${p.x},2,${p.z + 3.2},0)`);
    await t.holdUntil('w', `${S}.dialog?.title===${JSON.stringify(p.nombre)}`);
    assert.equal(await t.ev(`${S}.dialog.text`), p.texto);
    if (!sinGpu && [0, 2, 6, 7].includes(i)) await t.shot(`${capturas}/descubrimiento-${i + 1}.png`);
    await t.click('dialog-close');
    if (!sinGpu && i >= 7) {
      // el muñeco se esconde para que se vea la escena de la locura
      await t.ev(
        `window.__mc.player.visible=false; window.__mc.player.fixedCam={pos:[${p.x + 2.5},${3.6},${p.z + 5}],target:[${p.x},1.1,${p.z}],fov:50}`,
      );
      await t.ev('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
      await t.shot(`${capturas}/locura-${i - 6}-escena.png`);
      await t.ev('window.__mc.player.fixedCam=null; window.__mc.player.visible=true');
    }
  }
  console.log('PASA 7 lugares y 3 locuras descubiertos caminando');
  // --- controles de teclado de cada motor
  await abrir(t, 'comayagua.aserrin');
  const col0 = await t.ev(`${E}.stats.col`);
  await t.holdUntil(col0 < 4 ? 'd' : 'a', `${E}.stats.col !== ${col0}`);
  await t.press('e');
  await t.waitFor(`${E}.stats.sujetadas === 1`);
  await t.press('f');
  await t.waitFor(`${E}.stats.sopladas === 1`);
  await abrir(t, 'comayagua.reloj');
  await t.press('f');
  await t.waitFor(`${E}.stats.encajes === 1 && ${E}.stats.puestas === 1`);
  await t.press('e');
  await t.waitFor(`${E}.stats.sel === 2`);
  await t.holdUntil('w', `${E}.stats.perilla > 0.3`);
  await abrir(t, 'comayagua.eco');
  await t.holdUntil('d', `${E}.stats.rumbo > 2`);
  await t.press('f');
  await t.waitFor(`${E}.stats.emitidos === 1`);
  await t.press('e');
  await t.waitFor(`${E}.stats.galerias + ${E}.stats.paredes === 1`);
  await abrir(t, 'comayagua.pilon');
  await t.press('e');
  await t.waitFor(`${E}.stats.movidas === 1 && ${E}.stats.divisores === 1`);
  await t.press('f');
  await t.waitFor(`${E}.stats.aperturas === 1`);
  await abrir(t, 'comayagua.tenampua');
  await t.press('e');
  await t.waitFor(`${E}.stats.cambios === 1`);
  await t.holdUntil('s', `${E}.stats.nivel === 2`);
  await t.press('f');
  await t.waitFor(`${E}.stats.asentadas === 1`);
  await abrir(t, 'comayagua.anden');
  await t.holdUntil('d', `${E}.stats.ranura >= 2`);
  await t.press('f');
  await t.waitFor(`${E}.stats.puestos === 1 && ${E}.stats.turno === 1`);
  await t.press('e');
  await t.waitFor(`${E}.stats.turno === 0`);
  await abrir(t, 'comayagua.mantas');
  await t.holdUntil('a', `${E}.stats.i1 > 0.5`);
  await t.holdUntil('d', `${E}.stats.i2 > 0.5`);
  await abrir(t, 'comayagua.fachadas');
  const h0 = await t.ev(`${E}.stats.hueco`);
  await t.holdUntil('d', `${E}.stats.hueco !== ${h0}`);
  await t.press('f');
  await t.waitFor(`${E}.stats.pegados + ${E}.stats.errados + ${E}.stats.invalidas === 1`);
  await t.press('e');
  await t.waitFor(`${E}.stats.descartes === 1`);
  console.log('PASA controles de teclado de los ocho motores');
  // --- una captura jugando de cada juego del catálogo (los dos de cada motor), con el bot
  if (!sinGpu) {
    for (const j of juegos) {
      await abrir(t, j[2], `comayagua.${j[0]}`);
      await t.ev('window.__mcTest.motor.jugarBot(); window.__mcTest.motor.avanzar(12)');
      await t.ev(`${S}.toasts.forEach(x => ${S}.dropToast(x.id))`);
      await t.ev('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
      await t.shot(`${capturas}/${j[0]}.png`);
      const r = await t.calls();
      assert.ok(r && r.calls < 350, `${j[0]}: ${r?.calls} llamadas de dibujo`);
    }
    console.log('PASA capturas de los doce juegos');
  }
  // --- mando: el stick derecho mueve la perilla, B encaja y X cambia de eje
  await t.ev(`(()=>{window.__pad={id:'Mando de prueba (STANDARD GAMEPAD)',index:0,connected:true,mapping:'standard',timestamp:0,
    axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
    navigator.getGamepads=()=>[window.__pad];})()`);
  await abrir(t, 'comayagua.reloj');
  await t.ev('window.__pad.axes[3]=-1');
  await t.waitFor(`${E}.stats.perilla > 0.2`, 15000, 'el stick derecho sube la perilla');
  await t.ev('window.__pad.axes[3]=0');
  await t.ev('(()=>{const b=window.__pad.buttons[1];b.pressed=true;b.value=1})()');
  await t.waitFor(`${E}.stats.encajes === 1`, 15000, 'B encaja');
  await t.ev('(()=>{const b=window.__pad.buttons[1];b.pressed=false;b.value=0})()');
  await t.ev('(()=>{const b=window.__pad.buttons[2];b.pressed=true;b.value=1})()');
  await t.waitFor(`${E}.stats.sel === 2`, 15000, 'X cambia de eje');
  await t.ev('(()=>{const b=window.__pad.buttons[2];b.pressed=false;b.value=0})()');
  console.log('PASA mando en el reloj');
  assert.equal(t.errors.length, 0, 'sin excepciones ni red');
});
const tactil = await run(
  'comayagua-tactil',
  file,
  { hash: '#test', width: 1100, height: 800, touch: true },
  async (t) => {
    await entrar(t);
    await abrir(t, 'comayagua.aserrin');
    await t.click('touch-use');
    await t.waitFor(`${E}.stats.sujetadas === 1`);
    await t.click('touch-fire');
    await t.waitFor(`${E}.stats.sopladas === 1`);
    if (!sinGpu) await t.shot(`${capturas}/aserrin-tactil.png`);
    await abrir(t, 'comayagua.eco');
    await t.click('touch-fire');
    await t.waitFor(`${E}.stats.emitidos === 1`);
    await t.click('touch-use');
    await t.waitFor(`${E}.stats.galerias + ${E}.stats.paredes === 1`);
    console.log('PASA toque: sujetar, soplar, chasquear y dibujar');
  },
);
process.exitCode = ok && tactil ? 0 : 1;
