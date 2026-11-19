// Capturas de clima y agua: lluvia y piso mojado (de día y de noche), mar, río, orilla y nubes al atardecer.
// Uso: node apps/web/tools/capturas-clima.mjs <html> <prefijo>
//   p. ej. node apps/web/tools/capturas-clima.mjs apps/web/dist/mundo-catrucho-hd.html capturas/clima-agua/antes
// Las vistas despejadas van primero: el piso tarda en secarse cuando para la lluvia.
// Usa GPU y calidad real (sin #test): con otros agentes en la máquina, córrelo con `flock -s /tmp/…/mc-gpu.lock`.
import { run } from './harness.mjs';

const [file, prefijo] = process.argv.slice(2);
if (!file || !prefijo) {
  console.error('uso: node apps/web/tools/capturas-clima.mjs <html> <prefijo>');
  process.exit(2);
}
const S = 'window.__mc.store.getState()',
  P = 'window.__mc.player';
const CALLE = [[-3, 78, 0], { pos: [-0.6, 3.6, 71], target: [-8.5, 2.2, 101], fov: 60 }];
const TEGUS = [[58, 124, 0.6], { pos: [47, 6, 108], target: [64.6, 3, 134], fov: 55 }];
// [nombre, departamento o null (lobby), hora, clima, jugador [x, z, yaw], cámara]
const VISTAS = [
  ['tegus-calle', 'franciscomorazan', 15.5, 'despejado', ...CALLE],
  ['tegus', 'franciscomorazan', 15.5, 'despejado', ...TEGUS],
  ['olancho', 'olancho', 15.5, 'despejado', [0, 62, Math.PI], { pos: [9, 5, 47], target: [-3, 2.5, 80], fov: 55 }],
  ['rio', 'graciasadios', 15.5, 'despejado', [-8, 30, -1.2], { pos: [-4, 5, 40], target: [16, 0, 18], fov: 55 }],
  ['mar', 'islas', 15.5, 'despejado', [0, -12, Math.PI], { pos: [10, 5, -8], target: [-6, 0, -42], fov: 55 }],
  ['costa', 'atlantida', 15.5, 'despejado', [0, 30, 0], { pos: [10, 4, 0], target: [-30, 3, -17], fov: 55 }],
  ['atardecer', null, 17.7, 'nublado', [-49, 121, 0], { pos: [-40, 6, 125], target: [-90, 6, 118], fov: 55 }],
  ['cielo-tarde', null, 17.2, 'nublado', [-49, 121, 0], { pos: [-40, 3, 125], target: [-80, 24, 100], fov: 60 }],
  // contraluz: el sol de la tarde detrás del monte (rayos de sol en alta)
  ['contraluz', 'copan', 17.2, 'despejado', [0, 42, 0], { pos: [0, 4, 46], target: [-34, 12, 64], fov: 60 }],
  ['contraluz-lobby', null, 17.2, 'despejado', [-49, 121, 0], { pos: [-40, 3, 125], target: [-82, 14, 148], fov: 60 }],
  ['tegus-calle-lluvia', 'franciscomorazan', 15.5, 'lluvia', ...CALLE],
  ['tegus-lluvia', 'franciscomorazan', 15.5, 'lluvia', ...TEGUS],
  ['tegus-calle-lluvia-noche', 'franciscomorazan', 20.5, 'lluvia', ...CALLE],
  ['yoro-lluvia', 'yoro', 15.5, 'lluvia', [0, 62, Math.PI], { pos: [-7, 6, 46], target: [2, 2.5, 80], fov: 55 }],
];
// MC_VISTAS=mar,rio saca solo esas vistas para iterar rápido; MC_HASH agrega marcas a la dirección;
// MC_CALIDAD=media|baja arranca en esa calidad
const SOLO = process.env.MC_VISTAS?.split(',');
const EXTRA = process.env.MC_HASH ? `,${process.env.MC_HASH}` : '';
let vuelta = 0;
const fijar = (t, h, c) => t.ev(`location.hash = '#go,hora=${h},clima=${c},v${vuelta++}${EXTRA}'`);

const ok = await run(
  'capturas-clima',
  file,
  { hash: `#go,clima=despejado${EXTRA}`, width: 1280, height: 720 },
  async (t) => {
    await t.waitFor(`${S}.scene.kind==='lobby' && !!window.__mc.gl`, 20000, 'el lobby');
    // MC_CALIDAD=media|baja: arranca de nuevo en esa calidad (los materiales se arman con la del arranque)
    if (process.env.MC_CALIDAD) {
      await t.ev(`${S}.setSettings({ quality: '${process.env.MC_CALIDAD}', calidadElegida: true })`);
      await t.sleep(800);
      await t.ev('location.reload()');
      await t.sleep(1500);
      await t.waitFor(`${S}.scene.kind==='lobby' && !!window.__mc.gl`, 30000, 'el lobby de nuevo');
      console.log(
        'calidad',
        await t.ev(`${S}.profile.settings.quality`),
        'posproceso',
        await t.ev('window.__mc.post ?? null'),
      );
    }
    const tabla = [];
    for (const [nombre, dept, h, clima, [x, z, yaw], cam] of VISTAS.filter(([n]) => !SOLO || SOLO.includes(n))) {
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
      await fijar(t, h, clima);
      // la lluvia entra de a poco y el piso se moja después
      await t.sleep(clima === 'lluvia' ? 14000 : 3000);
      await fijar(t, h, clima);
      await t.sleep(600);
      tabla.push([nombre, (await t.calls())?.calls ?? '?']);
      await t.shot(`${prefijo}-${nombre}.png`);
      console.log('captura', `${prefijo}-${nombre}.png`);
    }
    console.log('\nvista                     llamadas');
    for (const [n, c] of tabla) console.log(`${n.padEnd(26)}${c}`);
  },
);
process.exit(ok ? 0 : 1);
