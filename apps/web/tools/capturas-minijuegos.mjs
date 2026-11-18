// Capturas fijas de escenarios de minijuegos, con la cámara de juego de cada uno, para comparar antes y después.
// Uso: node apps/web/tools/capturas-minijuegos.mjs <html> <prefijo>
//   p. ej. node apps/web/tools/capturas-minijuegos.mjs apps/web/dist/mundo-catrucho-hd.html capturas/realismo-minijuegos/antes
//   deja <prefijo>-pipante.png, … e imprime las llamadas de dibujo de cada vista.
// Usa GPU y calidad real (sin #test): con otros agentes en la máquina, córrelo con `flock -s /tmp/…/mc-gpu.lock`.
// MC_VISTAS=pipante,batea saca solo esas vistas.
import { run } from './harness.mjs';

const [file, prefijo] = process.argv.slice(2);
if (!file || !prefijo) {
  console.error('uso: node apps/web/tools/capturas-minijuegos.mjs <html> <prefijo>');
  process.exit(2);
}
const S = 'window.__mc.store.getState()';
// [nombre, juego del catálogo]
const VISTAS = [
  ['pipante', 'graciasadios.pipante-por-el-patuca'],
  ['batea', 'olancho.oro-en-batea-del-guayape'],
  ['estela', 'islas.water-taxi-sin-estela'],
  ['futbol', 'franciscomorazan.potra-de-dos-colores'],
  ['cocina', 'colon.casabe-de-santa-fe'],
  ['feria', 'santabarbara.argollas-pateplumas'],
  ['cable', 'yoro.cable-bananero'],
  ['chimenea', 'santabarbara.chimeneas-de-trinidad'],
  ['estelas', 'copan.patio-de-las-estelas'],
  ['trapiche', 'lempira.cana-al-trapiche'],
  ['baleada', 'franciscomorazan.baleada-con-cinturon'],
  ['pastel', 'olancho.pastel'],
  ['ritmo', 'atlantida.punta-en-sambo-creek'],
  ['monta', 'olancho.jaripeo'],
  ['lluvia', 'yoro.lluvia-de-peces'],
  ['gol', 'franciscomorazan.el-gol-del-lunes'],
  ['talgua', 'olancho.talgua-sin-tocar-los-restos'],
  ['chepa', 'franciscomorazan.corre-que-viene-la-chepa'],
  ['taxi', 'franciscomorazan.taxi-a-toda-mecha'],
  ['pulperia', 'franciscomorazan.pulperia'],
  ['ruta', 'lempira.sendero-de-celaque'],
  ['yojoa', 'cortes.pesca-en-yojoa'],
  ['estanque', 'choluteca.estanques-de-marcovia'],
  ['rapidito', 'franciscomorazan.rapidito'],
  ['ciudadblanca', 'graciasadios.ciudad-blanca-sin-extraer'],
  ['termal', 'lempira.la-pausa-tambien-cuenta'],
  ['ondas', 'intibuca.chiligatoro-en-el-reflejo'],
  ['cuencas', 'lempira.la-montana-reparte-agua'],
  ['tapisca', 'elparaiso.tapisca-de-jamastran'],
  ['catacion', 'lapaz.catacion-de-marcala'],
];
const SOLO = process.env.MC_VISTAS?.split(',');

const ok = await run('capturas-minijuegos', file, { hash: '#go', width: 1280, height: 720 }, async (t) => {
  await t.waitFor(`${S}.scene.kind==='lobby' && !!window.__mc.gl`, 20000, 'el lobby');
  const tabla = [];
  for (const [nombre, juego] of VISTAS.filter(([n]) => !SOLO || SOLO.includes(n))) {
    await t.ev(`window.__mc.input.reset();${S}.setModo('solo');${S}.startJuego('${juego}')`);
    await t.click('mg-start', 30000);
    await t.waitFor(`${S}.mg?.phase==='playing'`, 30000, nombre);
    // la cuenta de «¡Preparáte!» dura 3 s; las sombras y el posproceso se asientan
    await t.sleep(4500);
    await t.ev(`${S}.toasts.forEach(x=>${S}.dropToast(x.id))`);
    await t.sleep(400);
    tabla.push([nombre, (await t.calls())?.calls ?? '?']);
    await t.shot(`${prefijo}-${nombre}.png`);
    console.log('captura', `${prefijo}-${nombre}.png`);
    await t.ev(`${S}.exitMinigame()`);
    await t.waitFor(`!${S}.mg`, 20000, `salir de ${nombre}`);
  }
  console.log('\nvista           llamadas');
  for (const [n, c] of tabla) console.log(`${n.padEnd(16)}${c}`);
});
process.exit(ok ? 0 : 1);
