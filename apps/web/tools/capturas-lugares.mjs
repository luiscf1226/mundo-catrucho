// Capturas de los lugares famosos con edificio propio (de cerca y de lejos) y de la ciudad de noche.
// Uso: node apps/web/tools/capturas-lugares.mjs <html> <prefijo>
//   p. ej. node apps/web/tools/capturas-lugares.mjs apps/web/dist/mundo-catrucho-hd.html capturas/lugares-famosos/antes
// Deja <prefijo>-<vista>.png e imprime las llamadas de dibujo de cada vista. MC_VISTAS=a,b saca solo esas.
// Usa GPU y calidad real: con otros agentes en la máquina, córrelo con `flock -s /tmp/…/mc-gpu.lock`.
import { run } from './harness.mjs';

const [file, prefijo] = process.argv.slice(2);
if (!file || !prefijo) {
  console.error('uso: node apps/web/tools/capturas-lugares.mjs <html> <prefijo>');
  process.exit(2);
}
const S = 'window.__mc.store.getState()',
  P = 'window.__mc.player';
// Vistas de estación: [nombre, departamento, lugar, hora, cámara local {pos, target, fov}]. Coordenadas locales de
// la estación: +Z mira a la plaza; el edificio queda hacia −Z (su centro en z ≈ −7.5).
const CERCA = { pos: [11, 2.6, 4], target: [-1, 5.5, -8.5], fov: 60 },
  LEJOS = { pos: [-7, 7, 25], target: [0, 6, -8], fov: 52 };
const EST = [
  ['suyapa', 'franciscomorazan', 'suyapa'],
  ['bogran', 'santabarbara', 'bogran'],
  ['ciudadblanca', 'graciasadios', 'ciudadblanca'],
  ['omoa', 'cortes', 'omoa'],
  ['copan-escalinata', 'copan', 'escalinata'],
  ['copan-ruinas', 'copan', 'ruinas'],
  ['comayagua-catedral', 'comayagua', 'catedral'],
];
// Vistas fijas (coordenadas del mundo): [nombre, departamento, hora, jugador [x, z, yaw], cámara]
const FIJAS = [
  ['copan-plaza', 'copan', 15.5, [0, 30, Math.PI], { pos: [10, 7, 22], target: [0, 4, -12], fov: 60 }],
  ['copan-pelota', 'copan', 15.5, [20, 14, Math.PI], { pos: [27, 6, 18], target: [27, 1.5, -4], fov: 60 }],
  ['comayagua-zona', 'comayagua', 15.5, [0, 10, Math.PI], { pos: [6, 6, 14], target: [0, 5, -11], fov: 60 }],
  ['tegus-catedral', 'franciscomorazan', 15.5, [-36, 66, 1.6], { pos: [-20, 4.5, 76], target: [-46, 5, 63], fov: 55 }],
  [
    'tegus-calle-noche',
    'franciscomorazan',
    20.5,
    [-3, 78, 0],
    { pos: [-0.6, 3.6, 71], target: [-8.5, 2.2, 101], fov: 60 },
  ],
  ['tegus-noche', 'franciscomorazan', 21, [-36, 66, 1.6], { pos: [-20, 4.5, 76], target: [-46, 5, 63], fov: 55 }],
  ['sps-calle-noche', 'cortes', 21, [3, 78, 0], { pos: [0.6, 3.6, 71], target: [8.5, 2.2, 101], fov: 60 }],
];
const VISTAS = [
  ...EST.flatMap(([n, d, l]) => [
    [`${n}-cerca`, d, 15.5, l, CERCA],
    [`${n}-lejos`, d, 15.5, l, LEJOS],
  ]),
  ['suyapa-noche', 'franciscomorazan', 20.5, 'suyapa', LEJOS],
  ...FIJAS,
];
const SOLO = process.env.MC_VISTAS?.split(',');
const EXTRA = process.env.MC_HASH ? `,${process.env.MC_HASH}` : '';
let vuelta = 0;
const hora = (t, h) => t.ev(`location.hash = '#go,fotos,hora=${h},v${vuelta++}${EXTRA}'`);

const ok = await run('capturas-lugares', file, { hash: `#go,fotos${EXTRA}`, width: 1280, height: 720 }, async (t) => {
  await t.waitFor(`${S}.scene.kind==='lobby' && !!window.__mc.gl`, 20000, 'el lobby');
  const tabla = [];
  for (const [nombre, dept, h, a, b] of VISTAS.filter(([n]) => !SOLO || SOLO.some((s) => n.startsWith(s)))) {
    if ((await t.ev(`${S}.scene.id`)) !== dept) {
      await t.ev(`window.__mcTest && (window.__mcTest.lugares = null)`);
      await t.ev(`${S}.travel('${dept}')`);
      await t.waitFor(`${S}.scene.kind==='dept' && ${S}.scene.id==='${dept}'`, 30000, dept);
    }
    await t.sleep(1500);
    let cam, x, z, yaw;
    if (typeof a === 'string') {
      await t.waitFor(`!!window.__mcTest?.lugares`, 20000, 'las estaciones');
      const st = JSON.parse(
        await t.ev(`JSON.stringify(window.__mcTest.lugares.st.find((s) => s.id === '${a}') ?? null)`),
      );
      if (!st) throw new Error(`${dept} no tiene el lugar ${a}`);
      const [px, pz] = st.pos,
        r = st.rot,
        w = ([lx, ly, lz]) => [px + lx * Math.cos(r) + lz * Math.sin(r), ly, pz - lx * Math.sin(r) + lz * Math.cos(r)];
      cam = { pos: w(b.pos), target: w(b.target), fov: b.fov };
      [x, , z] = st.entry;
      yaw = r;
    } else {
      [x, z, yaw] = a;
      cam = b;
    }
    await t.ev(`${P}.teleport(${x}, 0.5, ${z}, ${yaw})`);
    await t.ev(`${P}.fixedCam = ${JSON.stringify(cam)}`);
    await hora(t, h);
    await t.sleep(2500);
    await hora(t, h);
    await t.sleep(600);
    tabla.push([nombre, (await t.calls())?.calls ?? '?']);
    await t.shot(`${prefijo}-${nombre}.png`);
    console.log('captura', `${prefijo}-${nombre}.png`);
  }
  console.log('\nvista                     llamadas');
  for (const [n, c] of tabla) console.log(`${n.padEnd(26)}${c}`);
});
process.exit(ok ? 0 : 1);
