// Capturas fijas de la ciudad (edificios, calles y lugares famosos) para comparar antes y después.
// Uso: node apps/web/tools/capturas-ciudad.mjs <html> <prefijo>
//   p. ej. node apps/web/tools/capturas-ciudad.mjs apps/web/dist/mundo-catrucho-hd.html capturas/realismo-ciudad/antes
// Deja <prefijo>-<vista>.png e imprime las llamadas de dibujo de cada vista. MC_VISTAS=a,b saca solo esas.
// Usa GPU y calidad real (sin #test): con otros agentes en la máquina, córrelo con `flock -s /tmp/…/mc-gpu.lock`.
import { run } from './harness.mjs';

const [file, prefijo] = process.argv.slice(2);
if (!file || !prefijo) {
  console.error('uso: node apps/web/tools/capturas-ciudad.mjs <html> <prefijo>');
  process.exit(2);
}
const S = 'window.__mc.store.getState()',
  P = 'window.__mc.player';
// [nombre, departamento, hora, jugador [x, z, yaw], cámara {pos, target, fov}]
const VISTAS = [
  ['tegus-catedral', 'franciscomorazan', 15.5, [-36, 66, 1.6], { pos: [-20, 4.5, 76], target: [-46, 5, 63], fov: 55 }],
  [
    'tegus-pulperia',
    'franciscomorazan',
    15.5,
    [-24, 64, 1.6],
    { pos: [-21, 2.4, 68.5], target: [-31.5, 1.8, 61.5], fov: 55 },
  ],
  [
    'tegus-polilandia',
    'franciscomorazan',
    15.5,
    [58, 124, 0.6],
    { pos: [47, 6, 108], target: [64.6, 3, 134], fov: 55 },
  ],
  ['tegus-calle', 'franciscomorazan', 15.5, [-48, 100, 0.6], { pos: [-38, 3.2, 92], target: [-70, 3, 128], fov: 60 }],
  ['tegus-noche', 'franciscomorazan', 21, [-36, 66, 1.6], { pos: [-20, 4.5, 76], target: [-46, 5, 63], fov: 55 }],
  ['sps-guamilito', 'cortes', 15.5, [55, 122, 0.7], { pos: [49, 6, 115], target: [63, 2.5, 132.5], fov: 55 }],
  ['sps-museo', 'cortes', 15.5, [70, 110, 0.7], { pos: [62, 5, 100], target: [80, 3, 118], fov: 55 }],
  ['colon-fortaleza', 'colon', 15.5, [6, 20, Math.PI], { pos: [12, 7, 28], target: [0, 2.5, -8], fov: 55 }],
  ['santabarbara-iglesia', 'santabarbara', 15.5, [44, 114, 0.6], { pos: [40, 6, 106], target: [52, 5, 129], fov: 55 }],
  ['comayagua-catedral', 'comayagua', 15.5, [0, 10, Math.PI], { pos: [6, 6, 14], target: [0, 5, -11], fov: 60 }],
  ['yoro-lluvia', 'yoro', 15.5, [-60, 100, 0.6], { pos: [-52, 4, 96], target: [-70, 3, 112], fov: 60 }],
];
const SOLO = process.env.MC_VISTAS?.split(',');
const EXTRA = process.env.MC_HASH ? `,${process.env.MC_HASH}` : '';
let vuelta = 0;
const hora = (t, h) => t.ev(`location.hash = '#go,hora=${h},v${vuelta++}${EXTRA}'`);

const ok = await run('capturas-ciudad', file, { hash: `#go${EXTRA}`, width: 1280, height: 720 }, async (t) => {
  await t.waitFor(`${S}.scene.kind==='lobby' && !!window.__mc.gl`, 20000, 'el lobby');
  const tabla = [];
  for (const [nombre, dept, h, [x, z, yaw], cam] of VISTAS.filter(([n]) => !SOLO || SOLO.includes(n))) {
    if ((await t.ev(`${S}.scene.id`)) !== dept) {
      await t.ev(`${S}.travel('${dept}')`);
      await t.waitFor(`${S}.scene.kind==='dept' && ${S}.scene.id==='${dept}'`, 30000, dept);
    }
    await t.sleep(1500);
    await t.ev(`${P}.teleport(${x}, 0.5, ${z}, ${yaw})`);
    await t.ev(`${P}.fixedCam = ${JSON.stringify(cam)}`);
    await hora(t, h);
    await t.sleep(nombre.includes('lluvia') ? 9000 : 2500);
    await hora(t, h);
    await t.sleep(600);
    tabla.push([nombre, (await t.calls())?.calls ?? '?']);
    await t.shot(`${prefijo}-${nombre}.png`);
    console.log('captura', `${prefijo}-${nombre}.png`);
  }
  console.log('\nvista                 llamadas');
  for (const [n, c] of tabla) console.log(`${n.padEnd(22)}${c}`);
});
process.exit(ok ? 0 : 1);
