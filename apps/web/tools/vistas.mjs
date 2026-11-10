// Hoja de vistas en calidad normal para revisar a ojo. Uso: node tools/vistas.mjs <html> <carpeta>
import { run } from './harness.mjs';

const [file, out] = process.argv.slice(2),
  S = `window.__mc.store.getState()`;
const ok = await run('vistas', file, { hash: '#go', width: 1280, height: 720 }, async (t) => {
  await t.waitFor(`!!document.querySelector('canvas')`);
  await t.sleep(2500);
  await t.shot(`${out}/a1-lobby.png`);
  await t.ev(`window.__mc.player.fixedCam={pos:[0,150,150],target:[0,0,-10],fov:55}`);
  await t.sleep(900);
  await t.shot(`${out}/a2-mapa.png`);
  await t.ev(`window.__mc.player.fixedCam={pos:[40,30,40],target:[0,4,-20],fov:55}`);
  await t.sleep(700);
  await t.shot(`${out}/a3-mapa-cerca.png`);
  await t.ev(`window.__mc.player.fixedCam=null`);
  await t.ev(`${S}.travel('olancho')`);
  await t.sleep(2500);
  await t.shot(`${out}/b1-olancho.png`);
  await t.ev(`${S}.travel('franciscomorazan')`);
  await t.sleep(2500);
  await t.shot(`${out}/b2-fm.png`);
  let i = 0;
  for (const id of [
    'olancho.pastel',
    'olancho.jaripeo',
    'atlantida.carnaval',
    'olancho.talgua',
    'cortes.pescayojoa',
    'yoro.lluvia',
    'franciscomorazan.baleadas',
    'comayagua.pilonpaleta',
    'franciscomorazan.rapidito',
    'islas.ballena',
    'atlantida.rafting',
    'lempira.celaque',
  ]) {
    await t.ev(`${S}.startJuego('${id}')`);
    await t.waitFor(`!!document.querySelector('[data-testid=mg-intro]')`);
    if (i === 0) {
      await t.sleep(600);
      await t.shot(`${out}/c0-intro.png`);
    }
    await t.click('mg-start');
    await t.sleep(4200);
    await t.shot(`${out}/c${String(++i).padStart(2, '0')}-${id.replace('.', '-')}.png`);
    await t.ev(`${S}.exitMinigame()`);
    await t.sleep(300);
  }
  await t.ev(`${S}.addCoins(300)`);
  for (const v of ['rapidito', 'bus', 'taxi']) {
    await t.ev(`${S}.goLobby()`);
    await t.sleep(400);
    await t.ev(`${S}.startViaje('${v}','atlantida')`);
    await t.sleep(5000);
    await t.shot(`${out}/d-viaje-${v}.png`);
  }
  await t.ev(`${S}.goLobby()`);
  await t.sleep(500);
  await t.ev(`${S}.openPanel('transporte')`);
  await t.sleep(700);
  await t.shot(`${out}/e1-terminal.png`);
  await t.ev(`${S}.openPanel('tienda')`);
  await t.sleep(900);
  await t.shot(`${out}/e2-tienda.png`);
  await t.ev(`${S}.openPanel('mapa')`);
  await t.sleep(900);
  await t.shot(`${out}/e3-mapa2d.png`);
  console.log('errores', JSON.stringify(t.errors).slice(0, 600));
});
process.exit(ok ? 0 : 1);
