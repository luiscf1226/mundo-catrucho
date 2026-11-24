// Capturas de la vegetación nueva: bananera de Cortés con su cable vía, palma africana de Colón y Atlántida y los
// jardines del barrio (veranera en el tapial, izote, seto y tulipán).
// Uso: node apps/web/tools/capturas-vegetacion.mjs <html> <prefijo>
//   deja <prefijo>-<vista>.png e imprime las llamadas de dibujo de cada vista. MC_VISTAS=a,b saca solo esas.
// Usa GPU y calidad real: con otros agentes en la máquina, córrelo con `flock -s /tmp/…/mc-gpu.lock`.
import { run } from './harness.mjs';

const [file, prefijo] = process.argv.slice(2);
if (!file || !prefijo) {
  console.error('uso: node apps/web/tools/capturas-vegetacion.mjs <html> <prefijo>');
  process.exit(2);
}
const S = 'window.__mc.store.getState()',
  P = 'window.__mc.player';
// [nombre, departamento, hora, jugador [x, z, yaw], cámara {pos, target, fov} | 'jardin:N']
const VISTAS = [
  ['cortes-bananera', 'cortes', 15.5, [44, 22, -1.6], { pos: [47, 5, 12], target: [66, 1.5, 28], fov: 55 }],
  ['cortes-cable', 'cortes', 15.5, [44, 2, -1.6], { pos: [51, 2.6, -9], target: [64.4, 1.8, 8], fov: 55 }],
  ['colon-palma', 'colon', 15.5, [44, 12, -1.6], { pos: [45, 6, 8], target: [66, 3, 24], fov: 55 }],
  ['atlantida-palma', 'atlantida', 15.5, [-44, 12, 1.6], { pos: [-46, 5, 0], target: [-66, 3, 22], fov: 55 }],
  ['tegus-jardin', 'franciscomorazan', 15.5, null, 'jardin:0'],
  ['tegus-jardin2', 'franciscomorazan', 15.5, null, 'jardin:3'],
  ['sps-jardin', 'cortes', 15.5, null, 'jardin:1'],
  ['cortes-bananera-noche', 'cortes', 20.5, [44, 22, -1.6], { pos: [47, 5, 12], target: [66, 1.5, 28], fov: 55 }],
];
const SOLO = process.env.MC_VISTAS?.split(',');
let vuelta = 0;
const hora = (t, h) => t.ev(`location.hash = '#go,fotos,hora=${h},v${vuelta++}'`);

const ok = await run('capturas-vegetacion', file, { hash: '#go,fotos', width: 1280, height: 720 }, async (t) => {
  await t.waitFor(`${S}.scene.kind==='lobby' && !!window.__mc.gl`, 20000, 'el lobby');
  const tabla = [];
  for (const [nombre, dept, h, jug, cam0] of VISTAS.filter(([n]) => !SOLO || SOLO.includes(n))) {
    if ((await t.ev(`${S}.scene.id`)) !== dept) {
      await t.ev(`${S}.travel('${dept}')`);
      await t.waitFor(`${S}.scene.kind==='dept' && ${S}.scene.id==='${dept}'`, 30000, dept);
    }
    await t.sleep(1500);
    let cam = cam0,
      j = jug;
    if (typeof cam0 === 'string') {
      // un jardín del barrio: la cámara en la acera de enfrente, mirando la planta
      // MC_JARDINES={"tegus-jardin": {...}} repite la misma cámara en una compilación sin jardines (las «antes»)
      const fijo = process.env.MC_JARDINES ? JSON.parse(process.env.MC_JARDINES)[nombre] : null;
      if (!fijo) await t.waitFor('!!window.__mcTest?.ciudad?.jardines?.length', 15000, 'los jardines');
      const js = fijo ? [fijo] : await t.ev('window.__mcTest.ciudad.jardines'),
        g = fijo ?? js[Number(cam0.split(':')[1]) % js.length];
      cam = { pos: [g.cam[0], 1.75, g.cam[1]], target: [g.p[0], 1.4, g.p[1]], fov: 55 };
      j = [g.cam[0], g.cam[1], 0];
      console.log(nombre, g.k, JSON.stringify(g));
    }
    await t.ev(`${P}.teleport(${j[0]}, 0.5, ${j[1]}, ${j[2]})`);
    await t.ev(`${P}.fixedCam = ${JSON.stringify(cam)}`);
    await hora(t, h);
    await t.sleep(2500);
    await hora(t, h);
    await t.sleep(600);
    tabla.push([nombre, (await t.calls())?.calls ?? '?']);
    await t.shot(`${prefijo}-${nombre}.png`);
    console.log('captura', `${prefijo}-${nombre}.png`);
  }
  console.log(`\nvista${' '.repeat(20)}llamadas`);
  for (const [n, c] of tabla) console.log(`${n.padEnd(25)}${c}`);
});
process.exit(ok ? 0 : 1);
