// Capturas y video automáticos: recorre las escenas clave del juego compilado y deja imágenes, un video corto y un
// índice en Markdown para pegar en el pull request de la ola.
// Uso: node tools/capturas.mjs <archivo.html> <carpeta>      (desde la raíz: `pnpm capturas` → ./capturas)
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { run } from './harness.mjs';

const [file, outArg] = process.argv.slice(2);
if (!file || !outArg) { console.error('uso: node tools/capturas.mjs <html> <carpeta>'); process.exit(2); }
const out = resolve(outArg), S = `window.__mc.store.getState()`, hechas = [];
const foto = async (t, nombre, que) => { await t.shot(`${out}/${nombre}.png`); hechas.push({ nombre: `${nombre}.png`, que }); console.log('captura', nombre); };

const ok = await run('capturas', file, { hash: '#test' }, async t => {
  await t.ev(`localStorage.clear()`); await t.ev(`location.reload()`); await t.sleep(1500);
  await t.waitFor(`!!document.querySelector('[data-testid=menu]')`);
  await t.sleep(800); await foto(t, '01-menu', 'Menú de inicio');
  await t.click('btn-jugar'); await t.waitFor(`!!document.querySelector('[data-testid=panel-personaje]')`, 8000, 'editor de personaje');
  await t.sleep(500); await foto(t, '02-personaje', 'Crear personaje');
  await t.click('ed-done'); await t.waitFor(`${S}.profile.created && !${S}.panel`);
  await t.waitFor(`!!document.querySelector('canvas')`); await t.sleep(2000);

  // video: caminar por el mapa gigante, un minijuego y un viaje
  await t.grabar();
  await foto(t, '03-lobby', 'Mapa gigante: el muñeco en el lobby');
  await t.hold('w', 1200); await t.hold('d', 500); await t.press(' '); await t.hold('w', 800);
  await t.ev(`window.__mc.player.fixedCam={pos:[0,150,150],target:[0,0,-10],fov:55}`); await t.sleep(1200);
  await foto(t, '04-mapa-arriba', 'Honduras vista desde arriba');
  await t.ev(`window.__mc.player.fixedCam=null`); await t.sleep(400);
  await t.click('hud-btn-mapa'); await t.click('map-dept-olancho'); await t.sleep(400);
  await foto(t, '05-mapa-2d', 'Mapa 2D con la ficha de Olancho');
  await t.click('map-go'); await t.waitFor(`${S}.scene.id==='olancho'`); await t.sleep(1800);
  await foto(t, '06-olancho', 'Departamento: Olancho');
  await t.ev(`${S}.startJuego('olancho.pastel')`); await t.waitFor(`!!document.querySelector('[data-testid=mg-intro]')`, 8000, 'intro del minijuego');
  await t.sleep(500); await foto(t, '07-intro', 'Presentación de un minijuego');
  await t.click('mg-start'); await t.waitFor(`${S}.mg?.phase==='playing'`); await t.sleep(2500);
  await foto(t, '08-minijuego', 'Minijuego en juego');
  await t.ev(`${S}.exitMinigame()`); await t.waitFor(`${S}.scene.kind==='dept' && !${S}.mg`, 8000, 'volver del minijuego');
  await t.ev(`${S}.goLobby()`); await t.sleep(600); await t.ev(`${S}.addCoins(300)`);
  await t.ev(`${S}.startViaje('rapidito','copan')`); await t.waitFor(`${S}.scene.kind==='viaje'`, 8000, 'empezar el viaje'); await t.sleep(3500);
  await foto(t, '09-viaje', 'Viaje en rapidito');
  const video = await t.parar(`${out}/recorrido.mp4`);
  console.log('video', video.path, video.cuadros, 'cuadros');

  await t.ev(`${S}.goLobby()`); await t.sleep(600);
  await t.ev(`${S}.openPanel('tienda')`); await t.sleep(900); await foto(t, '10-tienda', 'Tienda');
});

if (ok) {
  const filas = hechas.map(h => `| ${h.que} | \`${h.nombre}\` |`).join('\n');
  writeFileSync(`${out}/INDICE.md`, `# Capturas\n\nVideo: \`recorrido.mp4\` (lobby → mapa → Olancho → minijuego → viaje).\n\n| Escena | Archivo |\n|---|---|\n${filas}\n`);
  console.log(`listo: ${hechas.length} capturas y un video en ${out}`);
}
process.exit(ok ? 0 : 1);
