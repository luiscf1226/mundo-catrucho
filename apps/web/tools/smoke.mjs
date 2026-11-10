// Prueba de humo de punta a punta (versión 3D): menú → crear personaje → mapa gigante → caminar → mapa 2D → departamento →
// un juego de cada motor arranca → terminal y viaje simulado → tienda → guardado.
// Uso: node tools/smoke.mjs <archivo.html> [carpeta-capturas]
import { run } from './harness.mjs';
const file = process.argv[2], shots = process.argv[3];
if (!file) { console.error('uso: node tools/smoke.mjs <html> [capturas]'); process.exit(2); }
const S = `window.__mc.store.getState()`;
// un juego del catálogo por motor
const JUEGOS = ['olancho.pastel', 'olancho.jaripeo', 'atlantida.carnaval', 'olancho.talgua', 'cortes.pescayojoa', 'yoro.lluvia', 'franciscomorazan.baleadas', 'comayagua.pilonpaleta', 'franciscomorazan.rapidito', 'copan.pelota', 'cortes.juniana', 'islas.buceo', 'franciscomorazan.pulperia', 'franciscomorazan.carrera'];
const ok = await run('smoke', file, { hash: '#test' }, async t => {
  await t.ev(`localStorage.clear()`); await t.ev(`location.reload()`); await t.sleep(1500);
  await t.waitFor(`!!document.querySelector('[data-testid=menu]')`);
  if (await t.exists('btn-minijuegos')) throw new Error('el menú todavía tiene el botón de minijuegos');
  if (shots) await t.shot(`${shots}/01-menu.png`);
  await t.click('btn-jugar');
  await t.waitFor(`!!document.querySelector('[data-testid=panel-personaje]')`, 8000, 'editor de personaje en la primera entrada');
  if (shots) await t.shot(`${shots}/02-personaje.png`);
  await t.click('ed-done');
  await t.waitFor(`${S}.profile.created && !${S}.panel`);
  await t.waitFor(`!!document.querySelector('canvas')`); await t.sleep(1500);
  if (await t.exists('hud-btn-minijuegos')) throw new Error('el HUD todavía tiene el botón de minijuegos');
  const p0 = (await t.state()).pos; await t.hold('w', 900); const p1 = (await t.state()).pos;
  if (Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) < 1.5) throw new Error(`el personaje no se movió con W: ${p0} → ${p1}`);
  await t.press(' '); await t.sleep(150); const y0 = p1[1], y = (await t.state()).pos[1]; if (y - y0 < 0.25) throw new Error('el salto no levantó al personaje: y=' + y);
  if (shots) await t.shot(`${shots}/03-lobby.png`);
  console.log('lobby fps', await t.fps());
  // mapa 2D: ficha con juegos y viaje directo
  await t.click('hud-btn-mapa'); await t.click('map-dept-olancho');
  const n = await t.text('map-juegos'); if (!/\d+ juegos/.test(n ?? '')) throw new Error('la ficha del mapa no muestra los juegos: ' + n);
  if (shots) await t.shot(`${shots}/04-mapa.png`);
  await t.click('map-go'); await t.waitFor(`${S}.scene.id==='olancho'`); await t.sleep(1200);
  if (shots) await t.shot(`${shots}/05-olancho.png`);
  console.log('olancho fps', await t.fps());
  // un juego por motor
  for (const id of JUEGOS) {
    await t.ev(`${S}.startJuego('${id}')`);
    await t.waitFor(`!!document.querySelector('[data-testid=mg-intro]')`, 8000, `intro de ${id}`);
    if (id === 'olancho.pastel') { if (shots) await t.shot(`${shots}/06-intro.png`); await t.click('mg-modo-duo'); if ((await t.ev(`${S}.mg.modo`)) !== 'duo') throw new Error('no cambió el modo'); await t.click('mg-modo-solo'); }
    await t.click('mg-start'); await t.waitFor(`${S}.mg?.phase==='playing'`); await t.sleep(1300);
    if (shots) await t.shot(`${shots}/mg-${id.replace('.', '-')}.png`);
    console.log(id.padEnd(28), 'fps', await t.fps());
    await t.ev(`${S}.exitMinigame()`); await t.waitFor(`${S}.scene.kind==='dept' && !${S}.mg`, 8000, `volver de ${id}`); await t.sleep(250);
  }
  // terminal: viaje simulado
  await t.ev(`${S}.goLobby()`); await t.sleep(600); await t.ev(`${S}.openPanel('transporte')`);
  await t.click('tr-veh-rapidito'); await t.click('tr-to-copan'); const c0 = (await t.state()).coins; await t.click('tr-go');
  await t.waitFor(`${S}.scene.kind==='viaje'`, 8000, 'empezar el viaje'); await t.sleep(2500);
  if ((await t.state()).coins >= c0) throw new Error('el pasaje no se cobró');
  if (shots) await t.shot(`${shots}/07-viaje.png`);
  console.log('viaje fps', await t.fps());
  await t.click('viaje-skip'); await t.waitFor(`${S}.scene.kind==='dept' && ${S}.scene.id==='copan'`, 8000, 'llegar a Copán'); await t.sleep(900);
  if (shots) await t.shot(`${shots}/08-copan.png`);
  // tienda y guardado
  await t.ev(`${S}.addCoins(500)`);
  await t.click('hud-btn-tienda'); await t.sleep(400); if (shots) await t.shot(`${shots}/09-tienda.png`); await t.click('panel-close');
  const bought = await t.ev(`(()=>{const s=${S};const c=s.profile.coins;const r=s.buy('gorra');return JSON.stringify([r,c,${S}.profile.coins])})()`);
  console.log('compra', bought);
  await t.ev(`location.reload()`); await t.sleep(1500);
  const saved = await t.ev(`${S}.profile.visited.includes('copan') && ${S}.profile.visited.includes('olancho')`);
  if (!saved) throw new Error('el progreso no se guardó tras recargar');
});
process.exit(ok ? 0 : 1);
