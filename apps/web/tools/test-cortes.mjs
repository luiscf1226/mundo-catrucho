import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { run } from './harness.mjs';

const file = process.argv[2] ?? 'apps/web/dist/mundo-catrucho-hd.html';
const puntos = JSON.parse(readFileSync(new URL('../src/game/dept/zones/cortes-puntos.json', import.meta.url)));
const juegos = JSON.parse(readFileSync(new URL('../shared/data/catalogo/norte.json', import.meta.url))).cortes.juegos;
const shots = resolve('capturas/mc-39');
const ok = await run('cortes', file, { hash: '#test', width: 1280, height: 800 }, async (t) => {
  await t.click('btn-jugar');
  await t.click('ed-done');
  await t.ev("window.__mc.store.getState().travel('cortes')");
  await t.waitFor("[...window.__mc.interactions].filter(i=>i.label.startsWith('Jugar:')).length===12");
  assert.equal(juegos.length, 12);
  for (const j of juegos) {
    const etiqueta = `Jugar: ${j[1]}`;
    const pos = await t.ev(
      `(()=>{const i=[...window.__mc.interactions].find(i=>i.label===${JSON.stringify(etiqueta)});return [i.x,i.y,i.z]})()`,
    );
    await t.ev(`window.__mc.player.teleport(${pos.join(',')})`);
    await t.waitFor(`document.querySelector('[data-testid=prompt]')?.textContent.includes(${JSON.stringify(j[1])})`);
    await t.press('e');
    await t.waitFor("!!document.querySelector('[data-testid=mg-intro]')");
    assert.equal(await t.ev('window.__mc.store.getState().mg.id'), j[2]);
    await t.click('mg-back');
    await t.waitFor("[...window.__mc.interactions].some(i=>i.label.startsWith('Jugar:'))");
  }
  await t.ev('window.__mc.store.getState().closeDialog(); window.__mc.store.getState().goLobby()');
  await t.waitFor("window.__mc.store.getState().scene.kind==='lobby'");
  await t.ev("window.__mc.store.getState().travel('cortes')");
  await t.waitFor("[...window.__mc.interactions].filter(i=>i.label.startsWith('Jugar:')).length===12");
  for (let i = 0; i < puntos.length; i++) {
    const x = -40 + (i % 6) * 15,
      z = i < 6 ? 9 : 24;
    await t.ev(`window.__mc.player.teleport(${x},0,${z + 3},0)`);
    await t.holdUntil('w', `window.__mc.store.getState().dialog?.title===${JSON.stringify(puntos[i].nombre)}`);
    assert.equal(await t.ev('window.__mc.store.getState().dialog.text'), puntos[i].texto);
    if ([0, 6, 9, 10, 11].includes(i)) await t.shot(`${shots}/descubrimiento-${i + 1}.png`);
    await t.click('dialog-close');
    if (i >= 9) {
      await t.ev(`window.__mc.player.fixedCam={pos:[${x + 3},4,${z + 6}],target:[${x},1,${z}],fov:52}`);
      await t.ev('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
      await t.shot(`${shots}/locura-${i - 8}-escena.png`);
      await t.ev('window.__mc.player.fixedCam=null');
    }
  }
  console.log('PASA 12 puestos, 9 lugares y 3 locuras descubiertos caminando');
  // Verifica acciones de teclado reales, además del bot del kit.
  for (const [id, accion, stat] of [
    ['chuco', 'f', 'capas'],
    ['gruas', 'f', 'activas'],
    ['cortina', 'f', 'marcadas'],
    ['merendon', 'f', 'altura'],
    ['cusuco', 'f', 'caidas'],
    ['topo', 'f', 'sello'],
  ]) {
    await t.ev(`window.__mc.store.getState().startMinigame('cortes.${id}')`);
    await t.click('mg-start');
    await t.waitFor(`window.__mcTest?.motor?.estado().id==='cortes.${id}'`);
    await t.ev('window.__mcTest.motor.avanzar(3.1)');
    if (id === 'cusuco') await t.ev('window.__mc.input.px=0');
    await t.press(accion);
    await t.waitFor(`window.__mcTest.motor.estado().stats.${stat}>0`);
    await t.shot(`${shots}/${id}-control.png`);
  }
  await t.ev("window.__mc.store.getState().startMinigame('cortes.garitas')");
  await t.click('mg-start');
  await t.waitFor("window.__mcTest?.motor?.estado().id==='cortes.garitas'");
  await t.ev('window.__mcTest.motor.avanzar(3.1)');
  await t.press('f');
  await t.waitFor('window.__mcTest.motor.estado().stats.garita===1');
  console.log('PASA controles de los siete motores');
});
const tactil = await run('cortes-tactil', file, { hash: '#test', width: 1100, height: 800, touch: true }, async (t) => {
  await t.click('btn-jugar');
  await t.click('ed-done');
  await t.ev("window.__mc.store.getState().startMinigame('cortes.chuco')");
  await t.click('mg-start');
  await t.waitFor("window.__mcTest?.motor?.estado().id==='cortes.chuco'");
  await t.ev('window.__mcTest.motor.avanzar(3.1)');
  await t.click('touch-fire');
  await t.waitFor('window.__mcTest.motor.estado().stats.capas===1');
  await t.shot(`${shots}/chuco-tactil.png`);
  console.log('PASA acción táctil en el motor sin tema');
});
process.exitCode = ok && tactil ? 0 : 1;
