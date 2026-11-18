// Capturas fijas de los personajes para comparar antes y después: primer plano del jugador (frente y 3/4), de noche
// y con lluvia, Don Chepe y un bot en la plaza, la fila de looks de la galería, la tienda con un atuendo puesto y un
// emote a media animación. Siempre las mismas vistas, la misma hora y la misma cámara.
// Uso: node apps/web/tools/capturas-personajes.mjs <html> <prefijo>
//   p. ej. node apps/web/tools/capturas-personajes.mjs apps/web/dist/mundo-catrucho-hd.html capturas/realismo-personajes/antes
// Usa GPU y calidad real: con otros agentes en la máquina, córrelo con `flock -s /tmp/…/mc-gpu.lock`.
import { run } from './harness.mjs';

const [file, prefijo] = process.argv.slice(2);
if (!file || !prefijo) {
  console.error('uso: node apps/web/tools/capturas-personajes.mjs <html> <prefijo>');
  process.exit(2);
}
const S = 'window.__mc.store.getState()',
  P = 'window.__mc.player';
let vuelta = 0;
const hora = (t, h, extra = '') => t.ev(`location.hash = '#go,hora=${h}${extra},v${vuelta++}'`);
const tabla = [];
async function foto(t, nombre) {
  tabla.push([nombre, (await t.calls())?.calls ?? '?']);
  await t.shot(`${prefijo}-${nombre}.png`);
  console.log('captura', `${prefijo}-${nombre}.png`);
}
/** cámara a `dist` m del jugador, girada `ang` rad desde su frente, mirando a la altura `mira` */
const cam = (dist, ang, alto, mira, fov = 40) =>
  `(() => { const p = ${P}.pos, y = ${P}.yaw + ${ang}, fx = -Math.sin(y), fz = -Math.cos(y);
    ${P}.fixedCam = { pos: [p[0] + fx * ${dist}, p[1] + ${alto}, p[2] + fz * ${dist}], target: [p[0], p[1] + ${mira}, p[2]], fov: ${fov} }; })()`;
const LOOK = {
  hair: 'pelo_largo',
  hairColor: '#2b1a12',
  face: 'cara_sonrisa',
  shirt: 'camisa_cuadros',
  shirtColor: '#c0392b',
  pants: 'jeans',
  hat: 'sin_sombrero',
  acc: 'mochila',
  skin: '#a56b43',
  body: 'm',
};

const ok = await run('capturas-personajes', file, { hash: '#go', width: 1280, height: 720 }, async (t) => {
  await t.waitFor(`${S}.scene.kind==='lobby' && !!window.__mc.gl`, 20000, 'el lobby');
  await t.ev(`window.__mc.store.setState((s) => ({ profile: { ...s.profile, emotes: ['emote_punta'] } }))`);
  await hora(t, 15.5);
  await t.sleep(1500);
  // el jugador mira hacia +z con yaw 0 (la cámara se pone delante)
  await t.ev(`${P}.teleport(-7, 1, 24.5, Math.PI)`);
  await t.sleep(1500);
  await t.ev(cam(1.9, 0, 1.55, 1.45, 38));
  await t.sleep(1500);
  await foto(t, 'cerca-frente');
  await t.ev(cam(2.1, 0.75, 1.5, 1.2, 40));
  await t.sleep(600);
  await foto(t, 'cerca-34');
  // la cara de cerca (encuadre que sirve para la cabeza vieja y la nueva)
  await t.ev(cam(0.9, 0.05, 1.55, 1.52, 36));
  await t.sleep(600);
  await foto(t, 'cara-frente');
  await t.ev(cam(0.95, 0.7, 1.56, 1.52, 36));
  await t.sleep(600);
  await foto(t, 'cara-34');
  // cuello, hombros y escote de 3/4, un poco desde arriba
  await t.ev(cam(1.25, 0.6, 1.62, 1.36, 36));
  await t.sleep(600);
  await foto(t, 'hombros-34');
  // otro tono de piel (claro) en el mismo hombre
  await t.ev(
    `window.__mc.store.setState((s) => ({ profile: { ...s.profile, avatar: { ...s.profile.avatar, skin: '#e8b98a' } } }))`,
  );
  await t.sleep(1200);
  await t.ev(cam(0.95, -0.7, 1.56, 1.52, 36));
  await t.sleep(600);
  await foto(t, 'cara-clara-34');
  await t.ev(
    `window.__mc.store.setState((s) => ({ profile: { ...s.profile, avatar: { ...s.profile.avatar, ...${JSON.stringify(LOOK)} } } }))`,
  );
  await t.sleep(1200);
  await t.ev(cam(2.3, -0.6, 1.4, 1.1, 40));
  await t.sleep(600);
  await foto(t, 'cerca-ella');
  await t.ev(cam(0.85, 0.05, 1.52, 1.49, 36));
  await t.sleep(600);
  await foto(t, 'cara-ella-frente');
  await t.ev(cam(0.9, 0.7, 1.52, 1.48, 36));
  await t.sleep(600);
  await foto(t, 'cara-ella-34');
  // piel oscura en ella
  await t.ev(
    `window.__mc.store.setState((s) => ({ profile: { ...s.profile, avatar: { ...s.profile.avatar, skin: '#4f2f1c' } } }))`,
  );
  await t.sleep(1200);
  await t.ev(cam(0.9, -0.6, 1.52, 1.48, 36));
  await t.sleep(600);
  await foto(t, 'cara-oscura-34');
  await t.ev(
    `window.__mc.store.setState((s) => ({ profile: { ...s.profile, avatar: { ...s.profile.avatar, skin: '${LOOK.skin}' } } }))`,
  );
  await t.sleep(1000);
  // plaza: el jugador junto a Don Chepe, cámara de juego más abierta
  await t.ev(`${P}.teleport(-5.8, 1, 21.6, 2.6)`);
  await t.sleep(800);
  await t.ev(`${P}.fixedCam = { pos: [-9.5, 2.2, 25.5], target: [-6.4, 1.0, 20.8], fov: 50 }`);
  await t.sleep(1200);
  await foto(t, 'plaza');
  // emote a media animación (punta)
  await t.ev(`${P}.teleport(-7, 1, 24.5, Math.PI)`);
  await t.sleep(800);
  await t.ev(cam(3.2, 0.35, 1.3, 0.95, 45));
  await t.press('b');
  await t.click('emote-emote_punta');
  await t.sleep(1300);
  await foto(t, 'emote');
  // la cara con gesto: aplaudiendo (sonrisa, boca entreabierta) y asombro (cejas arriba, boca abierta)
  await t.ev(`${P}.emote = null`);
  await t.sleep(500);
  await t.ev(cam(0.95, 0.35, 1.56, 1.5, 36));
  await t.ev(`${P}.emote = { anim: 'clap', until: performance.now() + 6000 }`);
  await t.sleep(1200);
  await foto(t, 'emote-cara');
  await t.ev(`${P}.emote = { anim: 'asombro', until: performance.now() + 6000 }`);
  await t.sleep(700);
  await foto(t, 'emote-asombro');
  await t.ev(`${P}.emote = null`);
  // noche
  await t.ev(cam(2.1, 0.4, 1.5, 1.25, 40));
  await hora(t, 21);
  await t.sleep(2500);
  await foto(t, 'noche');
  // tienda con un atuendo puesto
  await t.ev(`${S}.addCoins(5000)`);
  await t.ev(`${S}.openPanel('tienda')`);
  await t.click('shop-tab-atuendo');
  await t.click('shop-try-at_motagua');
  await t.sleep(2500);
  await foto(t, 'tienda');
  await t.ev(`${S}.closePanel?.()`);
  // lluvia en Yoro
  await t.ev(`${P}.fixedCam = null`);
  await t.ev(`${S}.travel('yoro')`);
  await t.waitFor(`${S}.scene.kind==='dept' && ${S}.scene.id==='yoro'`, 30000, 'yoro');
  await hora(t, 15.5);
  await t.sleep(1500);
  await t.ev(`${P}.teleport(0, 0.5, 62, Math.PI)`);
  await t.sleep(1000);
  await t.ev(cam(2.2, 0.5, 1.5, 1.2, 40));
  await t.sleep(9000);
  await hora(t, 15.5);
  await t.sleep(600);
  await foto(t, 'lluvia');
  console.log('\nvista           llamadas');
  for (const [n, c] of tabla) console.log(`${n.padEnd(16)}${c}`);
});
// la fila de looks de la galería: nueve personajes juntos, de frente y de lado
const ok2 = await run(
  'capturas-galeria',
  file,
  { hash: '#go,galeria,nohud,tarde', width: 1280, height: 720 },
  async (t) => {
    await t.waitFor(`!!document.querySelector('canvas') && !!window.__mc?.player`);
    await t.sleep(2500);
    await t.ev(`${P}.fixedCam = { pos: [-1.5, 1.6, 5.4], target: [-1.5, 1.05, 0], fov: 50 }`);
    await t.sleep(1200);
    await foto(t, 'grupo');
    await t.ev(`${P}.fixedCam = { pos: [-12.5, 1.6, 4.2], target: [-4.5, 1.0, 0], fov: 50 }`);
    await t.sleep(900);
    await foto(t, 'grupo-lado');
    await t.ev(`${P}.fixedCam = { pos: [-9, 1.6, -2.6], target: [-9, 1.0, -6], fov: 50 }`);
    await t.sleep(900);
    await foto(t, 'anims');
  },
);
// la tienda en celular (vertical y acostado)
let ok3 = true;
for (const [w, h, n] of [
  [390, 844, 'tienda-cel'],
  [844, 390, 'tienda-cel-acostado'],
]) {
  ok3 =
    (await run('capturas-tienda-celular', file, { hash: '#go', width: w, height: h, touch: true }, async (t) => {
      await t.waitFor(`${S}.scene.kind==='lobby' && !!window.__mc.gl`, 20000, 'el lobby');
      await t.ev(`${S}.addCoins(5000)`);
      await t.ev(`${S}.openPanel('tienda')`);
      await t.click('shop-tab-atuendo');
      await t.click('shop-try-at_motagua');
      await t.sleep(2500);
      await t.shot(`${prefijo}-${n}.png`);
      console.log('captura', `${prefijo}-${n}.png`);
    })) && ok3;
}
process.exit(ok && ok2 && ok3 ? 0 : 1);
