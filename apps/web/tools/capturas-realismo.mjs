// Capturas fijas para comparar luz, cielo y materiales: siempre las mismas vistas, la misma hora y la misma cámara.
// Uso: node apps/web/tools/capturas-realismo.mjs <html> <prefijo>
//   p. ej. node apps/web/tools/capturas-realismo.mjs apps/web/dist/mundo-catrucho-hd.html capturas/realismo/antes
//   deja <prefijo>-lobby.png, <prefijo>-tegus.png, … e imprime las llamadas de dibujo de cada vista.
// Usa GPU y calidad real (sin #test): con otros agentes en la máquina, córrelo con `flock -s /tmp/…/mc-gpu.lock`.
import { run } from './harness.mjs';

const [file, prefijo] = process.argv.slice(2);
if (!file || !prefijo) {
  console.error('uso: node apps/web/tools/capturas-realismo.mjs <html> <prefijo>');
  process.exit(2);
}
const S = 'window.__mc.store.getState()',
  P = 'window.__mc.player';
// [nombre, departamento o null (lobby), hora, jugador [x, z, yaw], cámara {pos, target, fov}]
const VISTAS = [
  ['lobby', null, 15.5, [-49, 121, 0], { pos: [-40, 9, 137], target: [-49, 1, 108], fov: 55 }],
  ['tegus', 'franciscomorazan', 15.5, [58, 124, 0.6], { pos: [47, 6, 108], target: [64.6, 3, 134], fov: 55 }],
  ['sps', 'cortes', 15.5, [0, 62, Math.PI], { pos: [-7, 6, 46], target: [2, 2.5, 80], fov: 55 }],
  ['olancho', 'olancho', 15.5, [0, 62, Math.PI], { pos: [9, 5, 47], target: [-3, 2.5, 80], fov: 55 }],
  ['valle', 'valle', 15.5, [0, 72, Math.PI], { pos: [-7, 6, 56], target: [2, 2.5, 90], fov: 55 }],
  ['olancho-noche', 'olancho', 21, [0, 62, Math.PI], { pos: [9, 5, 47], target: [-3, 2.5, 80], fov: 55 }],
  ['yoro-lluvia', 'yoro', 15.5, [0, 62, Math.PI], { pos: [-7, 6, 46], target: [2, 2.5, 80], fov: 55 }],
  // contraluz al atardecer (resplandor del sol y bruma)
  ['atardecer', null, 17.7, [-49, 121, 0], { pos: [-40, 6, 125], target: [-90, 6, 118], fov: 55 }],
  // agua: el Río Plátano en Gracias a Dios y el mar de Roatán
  ['rio', 'graciasadios', 15.5, [-8, 30, -1.2], { pos: [-4, 5, 40], target: [16, 0, 18], fov: 55 }],
  ['mar', 'islas', 15.5, [0, -12, Math.PI], { pos: [10, 5, -8], target: [-6, 0, -42], fov: 55 }],
  // vegetación y terreno: bosque, costa con palmas, sur seco, cerros, platanar, selva y el mapa desde arriba
  ['olancho-pasto', 'olancho', 15.5, [-10, 30, 0], { pos: [-12, 1.7, 27], target: [-22, 0.4, 14], fov: 55 }],
  ['olancho-bosque', 'olancho', 15.5, [-10, 30, 0], { pos: [-8, 4, 32], target: [-35, 3, 8], fov: 55 }],
  ['atlantida-costa', 'atlantida', 15.5, [0, 30, 0], { pos: [10, 4, 0], target: [-30, 3, -17], fov: 55 }],
  ['choluteca-seco', 'choluteca', 15.5, [0, 42, 0], { pos: [8, 5, 36], target: [-25, 2, 5], fov: 55 }],
  ['lempira-cerros', 'lempira', 15.5, [0, 42, 0], { pos: [6, 5, 50], target: [0, 7, -20], fov: 55 }],
  ['lapaz-platanar', 'lapaz', 15.5, [0, 30, 0], { pos: [0, 5, 2], target: [22, 2, -25], fov: 55 }],
  ['copan-selva', 'copan', 15.5, [0, 42, 0], { pos: [0, 6, 46], target: [-30, 5, 0], fov: 55 }],
  ['lobby-arriba', null, 15.5, [-49, 121, 0], { pos: [-40, 55, 170], target: [-30, 0, 70], fov: 50 }],
];
// MC_VISTAS=rio,mar saca solo esas vistas (y salta el fútbol) para iterar rápido
const SOLO = process.env.MC_VISTAS?.split(',');
// MC_HASH=ver-ao agrega esa marca a la dirección (p. ej. para ver solo la oclusión del posproceso)
const EXTRA = process.env.MC_HASH ? `,${process.env.MC_HASH}` : '';
let vuelta = 0;
// cambiar el hash dispara `hashchange`: el cielo pone esa hora (el contador hace que el hash siempre cambie)
const hora = (t, h) => t.ev(`location.hash = '#go,hora=${h},v${vuelta++}${EXTRA}'`);

const ok = await run('capturas-realismo', file, { hash: `#go${EXTRA}`, width: 1280, height: 720 }, async (t) => {
  await t.waitFor(`${S}.scene.kind==='lobby' && !!window.__mc.gl`, 20000, 'el lobby');
  const tabla = [];
  for (const [nombre, dept, h, [x, z, yaw], cam] of VISTAS.filter(([n]) => !SOLO || SOLO.includes(n))) {
    if (!dept && (await t.ev(`${S}.scene.kind`)) !== 'lobby') {
      await t.ev(`${S}.goLobby()`);
      await t.waitFor(`${S}.scene.kind==='lobby'`, 30000, 'volver al lobby');
    }
    if (dept && (await t.ev(`${S}.scene.id`)) !== dept) {
      await t.ev(`${S}.travel('${dept}')`);
      await t.waitFor(`${S}.scene.kind==='dept' && ${S}.scene.id==='${dept}'`, 30000, dept);
    }
    await t.sleep(1500);
    await t.ev(`${P}.teleport(${x}, ${dept ? 0.5 : 1}, ${z}, ${yaw})`);
    await t.ev(`${P}.fixedCam = ${JSON.stringify(cam)}`);
    await hora(t, h);
    // el clima se suaviza unos segundos (lluvia, nubes) y las sombras siguen al jugador
    await t.sleep(nombre.includes('lluvia') ? 9000 : 2500);
    await hora(t, h);
    await t.sleep(600);
    tabla.push([nombre, (await t.calls())?.calls ?? '?']);
    await t.shot(`${prefijo}-${nombre}.png`);
    console.log('captura', `${prefijo}-${nombre}.png`);
  }
  // minijuego de fútbol con su propia cámara
  if (SOLO && !SOLO.includes('futbol')) return void imprimir(tabla);
  await t.ev(`${P}.fixedCam = null`);
  await t.ev(`${S}.goLobby()`);
  await t.waitFor(`${S}.scene.kind==='lobby'`, 20000, 'volver al lobby');
  await t.ev(`${S}.startMinigame('futbol')`);
  await t.click('mg-start', 20000);
  await t.waitFor(`${S}.mg?.phase==='playing'`, 20000, 'el partido');
  await t.sleep(3000);
  tabla.push(['futbol', (await t.calls())?.calls ?? '?']);
  await t.shot(`${prefijo}-futbol.png`);
  console.log('captura', `${prefijo}-futbol.png`);
  imprimir(tabla);
});
function imprimir(tabla) {
  console.log('\nvista           llamadas');
  for (const [n, c] of tabla) console.log(`${n.padEnd(16)}${c}`);
}
process.exit(ok ? 0 : 1);
