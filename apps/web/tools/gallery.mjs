// Capturas de la galería de arte en 4 hojas: looks.png, anims.png, props.png, mats.png.
// Uso: node tools/gallery.mjs <archivo.html> <carpeta-salida> [extras del hash: noche | tarde | lluvia | auto]
import { execFileSync } from 'node:child_process';
import { run } from './harness.mjs';
const [file, out, extra = ''] = process.argv.slice(2);
if (!file || !out) { console.error('uso: node tools/gallery.mjs <html> <salida> [noche|tarde|lluvia|auto]'); process.exit(2); }
const groups = {
  looks: [-9, 0, 9].map(x => ({ pos: [x, 1.7, 4.6], target: [x, 1.05, 0] })),
  anims: [-18, -9, 0, 9, 18].map(x => ({ pos: [x, 1.7, -1.4], target: [x, 1.05, -6] })),
  props: [{ pos: [-21, 4, -5], target: [-21, 1.6, -16] }, { pos: [4, 3.2, -6], target: [4, 1.2, -16] }, { pos: [19, 2.4, -9], target: [20, 0.9, -16] }, { pos: [-19, 6, -15], target: [-19, 2, -28] }, { pos: [8, 6, -15], target: [8, 2, -28] }, { pos: [26, 5, -17], target: [26, 2.5, -28] }, { pos: [-18, 5, -31], target: [-18, 1.2, -42] }, { pos: [2, 4, -32], target: [2, 1.2, -42] }],
  mats: [-21, -7, 7, 21].map(x => ({ pos: [x, 3.2, 21.5], target: [x, 1, 30] })),
};
const ok = await run('galeria', file, { hash: '#go,galeria,nohud' + (extra ? ',' + extra : ''), width: 960, height: 600 }, async t => {
  await t.waitFor(`!!document.querySelector('canvas')`); await t.sleep(2500);
  for (const [name, cams] of Object.entries(groups)) {
    const files = [];
    for (let i = 0; i < cams.length; i++) { await t.ev(`window.__mc.player.fixedCam=${JSON.stringify({ ...cams[i], fov: 55 })}`); await t.sleep(900); files.push(await t.shot(`${out}/.${name}-${i}.png`)); }
    execFileSync('magick', ['montage', ...files, '-tile', name === 'props' ? '2x' : name === 'mats' ? '2x' : '3x', '-geometry', '+4+4', '-background', '#111', `${out}/${name}.png`]);
    for (const f of files) execFileSync('rm', ['-f', f]);
  }
  console.log('dibujo:', await t.calls(), 'fps', await t.fps());
});
process.exit(ok ? 0 : 1);
