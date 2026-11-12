// MC-40 · Atlántida: 12 puestos jugables, 7 lugares y 3 locuras que se descubren caminando, controles reales de los
// ocho motores (teclado, toque y mando), la punta con respuesta del motor «ritmo» y capturas en capturas/mc-40/.
// Uso: node tools/test-atlantida.mjs <archivo.html>
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { run } from './harness.mjs';

const file = process.argv[2] ?? 'apps/web/dist/mundo-catrucho-hd.html';
const raiz = resolve(import.meta.dirname, '../../..');
const puntos = JSON.parse(readFileSync(new URL('../src/game/dept/zones/atlantida-puntos.json', import.meta.url)));
const juegos = JSON.parse(readFileSync(new URL('../shared/data/catalogo/norte.json', import.meta.url))).atlantida
  .juegos;
const contenido = JSON.parse(readFileSync(resolve(raiz, 'docs/generador/contenido.json'))).atlantida;
const capturas = resolve(raiz, 'capturas/mc-40');
const sinGpu = process.env.MC_GPU === '0';
const S = 'window.__mc.store.getState()';
const E = 'window.__mcTest.motor.estado()';
const R = 'window.__mcTest.ritmo';
// el motor reutilizado vive en el catálogo con su id de siempre
const motorDe = (id) => contenido.motores.find((m) => m.id === id)?.reutiliza ?? id;

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
/** Abre un juego de punta (motor «ritmo») y espera a que la canción arranque. */
async function abrirPunta(t, juego) {
  await t.ev(`${S}.setModo('solo'); ${S}.startJuego('${juego}')`);
  await t.waitFor(`${S}.mg?.id === 'ritmo' && ${S}.mg.phase === 'intro' && !!${R}`);
  await t.click('mg-start');
  await t.waitFor(`${S}.mg.phase === 'playing' && ${R}.st.mode !== ''`);
}
/** Toca un carril justo en la hora de una nota o de un contratiempo (dentro de la página, para no depender del CDP). */
const tocarEn = (t, lane, cuando) =>
  t.ev(`new Promise((ok) => {
    const T = ${R}, at = (${cuando})(T);
    const id = setInterval(() => {
      if (T.now() < at) return;
      clearInterval(id);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'asdf'[${lane}] }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'asdf'[${lane}] }));
      ok(at);
    }, 2);
  })`);

const ok = await run('atlantida', file, { hash: '#test', width: 1280, height: 800 }, async (t) => {
  await entrar(t);
  // --- contenido: cada juego del catálogo con el motor de contenido.json
  assert.equal(juegos.length, 12);
  for (const j of juegos) {
    const fuente = contenido.juegos.find((c) => c.id === `atlantida.${j[0]}`);
    assert.ok(fuente, `atlantida.${j[0]} está en contenido.json`);
    assert.equal(j[2], motorDe(fuente.motor), `motor de atlantida.${j[0]}`);
    assert.equal(j[8], fuente.etapas, `etapas de atlantida.${j[0]}`);
    assert.equal(j[1], fuente.nombre);
  }
  assert.deepEqual(
    [...new Set(juegos.map((j) => j[2]))].sort(),
    contenido.motores.map((m) => motorDe(m.id)).sort(),
    'los ocho motores tienen juego',
  );
  // --- los 12 puestos abren su juego
  await t.ev(`${S}.travel('atlantida')`);
  await t.waitFor(
    "window.__mcTest?.dept?.id === 'atlantida' && window.__mcTest?.lugares?.st?.some(s=>s.booths.some(b=>b.id.startsWith('atlantida.')))",
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
    const motor = juegos.find((j) => `atlantida.${j[0]}` === p.id)[2];
    assert.equal(await t.ev(`${S}.mg.id`), motor);
    await t.click('mg-back');
    await t.waitFor(`!${S}.mg && window.__mcTest.dept.id==='atlantida'`);
  }
  console.log('PASA 12 puestos abren su juego');
  // --- 7 lugares y 3 locuras se descubren caminando
  assert.equal(puntos.length, 10);
  for (let i = 0; i < puntos.length; i++) {
    const p = puntos[i];
    const esperado = i < 7 ? contenido.turismo[i] : contenido.locuras[i - 7];
    assert.equal(p.nombre, esperado.nombre);
    assert.equal(p.fuente, esperado.fuente);
    await t.ev(`window.__mc.player.teleport(${p.x},2,${p.z + 3.2},0)`);
    await t.holdUntil('w', `${S}.dialog?.title===${JSON.stringify(p.nombre)}`);
    assert.equal(await t.ev(`${S}.dialog.text`), p.texto);
    if (!sinGpu && [0, 4, 6, 7, 8, 9].includes(i)) await t.shot(`${capturas}/descubrimiento-${i + 1}.png`);
    await t.click('dialog-close');
    if (!sinGpu && i >= 7) {
      await t.ev(
        `window.__mc.player.fixedCam={pos:[${p.x + 3},${4.5},${p.z + 6}],target:[${p.x},1.2,${p.z - 1.5}],fov:50}`,
      );
      await t.ev('new Promise(r=>setTimeout(r,900))');
      await t.shot(`${capturas}/locura-${i - 6}-escena.png`);
      await t.ev('window.__mc.player.fixedCam=null');
    }
  }
  console.log('PASA 7 lugares y 3 locuras descubiertos caminando');
  // --- controles de teclado de los siete motores nuevos
  await abrir(t, 'atlantida.balsa');
  await t.press('f');
  await t.waitFor(`${E}.stats.paladas === 1`);
  await t.ev('new Promise(r=>setTimeout(r,300))');
  await t.press('e');
  await t.waitFor(`${E}.stats.paladas === 2`);
  await t.holdUntil('d', `${E}.stats.asiento % 2 === 1`);
  await abrir(t, 'atlantida.pancoco');
  await t.press('f');
  await t.waitFor(`${E}.stats.puestos === 1`);
  await t.holdUntil(' ', `${E}.stats.divididos === 1`);
  await t.press('e');
  await t.waitFor(`${E}.stats.tandas === 1`);
  await abrir(t, 'atlantida.vagon');
  await t.holdUntil('d', `${E}.stats.sel >= 1`);
  await t.holdUntil('w', `${E}.stats.giros >= 1`);
  await t.press('e');
  await t.waitFor(`${E}.stats.soltados === 1`);
  await t.press('f');
  await t.waitFor(`${E}.stats.rondas === 1`);
  await abrir(t, 'atlantida.manati');
  await t.press('f');
  await t.waitFor(`${E}.stats.remadas === 1`);
  await t.holdUntil('s', `${E}.stats.elegido === 2`);
  await abrir(t, 'atlantida.lancetilla');
  await t.press('f');
  await t.waitFor(`${E}.stats.elegidas === 1`);
  await t.holdUntil('a', `${E}.stats.columna === 0`);
  await t.press('f');
  await t.waitFor(`${E}.stats.elegidas === 2`);
  await abrir(t, 'atlantida.canopy');
  await t.press('f');
  await t.waitFor(`${E}.stats.andando === 1`);
  await t.press('f');
  await t.waitFor(`${E}.stats.frenadas === 1`);
  await abrir(t, 'atlantida.carnaval');
  await t.press('f');
  await t.waitFor(`${E}.stats.barras === 1`);
  await t.press('e');
  await t.waitFor(`${E}.stats.quitadas === 1`);
  await t.holdUntil('d', `${E}.stats.largo === 4`);
  console.log('PASA controles de teclado de los siete motores nuevos');
  // --- punta con respuesta: mezclar pie con cadera corta la frase; en modo libre la cadera pone acentos propios
  await abrirPunta(t, 'atlantida.punta-en-sambo-creek');
  assert.ok(await t.ev(`${R}.C.compases.length >= 8 && ${R}.C.llamadas.length > 0`), 'llamadas y respuestas');
  await tocarEn(t, 2, `(T) => T.st.notas.find((n) => n.lane < 2 && n.time > T.now() + 0.4).time`);
  await t.waitFor(`${R}.st.cortes === 1`, 5000, 'mezclar pie y cadera corta la frase');
  await t.ev(`${R}.auto(0)`);
  await t.waitFor(`${R}.st.score > 0 && ${R}.st.hits[0] > 3`, 20000, 'el pulso y los acentos suman');
  await t.ev(`${R}.stop()`);
  if (!sinGpu) await t.shot(`${capturas}/punta.png`);
  await t.ev(`${S}.goLobby()`);
  await abrirPunta(t, 'atlantida.el-tambor-te-contesto');
  assert.ok(await t.ev(`${R}.st.notas.every((n) => n.lane < 2)`), 'en modo libre solo bajan los pies');
  await tocarEn(
    t,
    3,
    `(T) => { const c = T.C.compases.find((x) => x.tipo === 'respuesta' && x.t > T.now() + 0.3); return c.t + 3 * T.C.step; }`,
  );
  await t.waitFor(`${R}.st.propios === 1`, 5000, 'acento propio a contratiempo');
  if (!sinGpu) await t.shot(`${capturas}/tambor-te-contesto.png`);
  await t.ev(`${S}.goLobby()`);
  console.log('PASA punta con respuesta: corte de frase y acentos propios');
  // --- una captura jugando de cada motor nuevo, con su juego del catálogo
  if (!sinGpu) {
    for (const id of contenido.motores.filter((m) => !m.reutiliza).map((m) => m.id)) {
      for (const j of juegos.filter((x) => x[2] === id)) {
        await abrir(t, id, `atlantida.${j[0]}`);
        await t.ev('window.__mcTest.motor.jugarBot(); window.__mcTest.motor.avanzar(9)');
        await t.ev(`${S}.toasts.forEach(x => ${S}.dropToast(x.id))`);
        // la cámara fija tarda un ratito en llegar a su lugar
        await t.ev('new Promise(r=>setTimeout(r,700))');
        await t.shot(`${capturas}/${j[0]}.png`);
        const r = await t.calls();
        assert.ok(r && r.calls < 350, `${id}: ${r?.calls} llamadas de dibujo`);
      }
    }
    console.log('PASA capturas de los siete motores nuevos');
  }
  // --- mando: el stick derecho elige apartadero, X suelta un vagón y B parte
  await t.ev(`(()=>{window.__pad={id:'Mando de prueba (STANDARD GAMEPAD)',index:0,connected:true,mapping:'standard',timestamp:0,
    axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
    navigator.getGamepads=()=>[window.__pad];})()`);
  await abrir(t, 'atlantida.vagon');
  const sel0 = await t.ev(`${E}.stats.sel`);
  await t.ev('window.__pad.axes[2]=1');
  await t.waitFor(`${E}.stats.sel > ${sel0}`, 15000, 'el stick derecho elige apartadero');
  await t.ev('window.__pad.axes[2]=0');
  const boton = (i, v) => t.ev(`(()=>{const b=window.__pad.buttons[${i}];b.pressed=${v};b.value=${v ? 1 : 0}})()`);
  await boton(2, true);
  await t.waitFor(`${E}.stats.soltados === 1`, 15000, 'X suelta un vagón');
  await boton(2, false);
  await boton(1, true);
  await t.waitFor(`${E}.stats.rondas === 1`, 15000, 'B parte');
  await boton(1, false);
  console.log('PASA mando en los apartaderos');
  assert.equal(t.errors.length, 0, 'sin excepciones ni red');
});
const tactil = await run(
  'atlantida-tactil',
  file,
  { hash: '#test', width: 1100, height: 800, touch: true },
  async (t) => {
    await entrar(t);
    await abrir(t, 'atlantida.pancoco');
    await t.click('touch-fire');
    await t.waitFor(`${E}.stats.puestos === 1`);
    await t.click('touch-jump');
    await t.waitFor(`${E}.stats.divididos === 1`);
    await t.click('touch-use');
    await t.waitFor(`${E}.stats.tandas === 1`);
    if (!sinGpu) await t.shot(`${capturas}/pancoco-tactil.png`);
    await abrir(t, 'atlantida.balsa');
    await t.click('touch-use');
    await t.waitFor(`${E}.stats.paladas === 1`);
    await abrir(t, 'atlantida.canopy');
    await t.click('touch-fire');
    await t.waitFor(`${E}.stats.andando === 1`);
    console.log('PASA toque: poner, dividir, hornear, remar y soltarse');
  },
);
process.exitCode = ok && tactil ? 0 : 1;
