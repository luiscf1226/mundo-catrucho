// Memes: revisa shared/data/memes.json y juega de verdad: frase y meme 3D durante el juego, meme en resultados,
// álbum con fotos de los memes 3D y Rincón de memes en los departamentos.
//   node tools/test-memes.mjs --datos              solo los datos (corre dentro de `pnpm check`)
//   node tools/test-memes.mjs <html> [capturas]    datos + navegador
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (p) => readFileSync(resolve(raiz, p), 'utf8');
const memes = JSON.parse(leer('shared/data/memes.json'));
const depts = new Set(JSON.parse(leer('shared/data/departments.json')).departments.map((d) => d.id));
// Los valores válidos salen de los tipos de src/core/memes.ts: una sola fuente.
const tipos = leer('src/core/memes.ts');
const union = (re) => new Set([...(tipos.match(re)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]));
const ESCENAS = union(/export type Escena =([^;]+);/),
  TEMAS = new Set(['todos', ...union(/MotorComun = Extract<\s*MinigameId,([^>]+)>/)]),
  TIPOS = union(/tipo: ([^;]+);/);
assert.ok(ESCENAS.size >= 18 && TEMAS.size >= 15 && TIPOS.size === 4, 'Se leyeron los tipos de memes.ts');

const largo = (s) => [...String(s ?? '')].length;
const errores = [],
  ids = new Set();
for (const [i, m] of memes.entries()) {
  const q = `memes[${i}] ${m.id ?? ''}`,
    mal = (cond, msg) => cond || errores.push(`${q}: ${msg}`);
  mal(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(m.id ?? ''), 'id en kebab-case');
  mal(!ids.has(m.id), 'id repetido');
  ids.add(m.id);
  mal(m.dept === null || depts.has(m.dept), `dept desconocido «${m.dept}»`);
  mal(TIPOS.has(m.tipo), `tipo desconocido «${m.tipo}»`);
  for (const [k, max] of [
    ['nombre', 30],
    ['frase', 60],
    ['arriba', 40],
    ['abajo', 40],
  ])
    mal(largo(m[k]) > 0 && largo(m[k]) <= max, `${k} entre 1 y ${max} caracteres (tiene ${largo(m[k])})`);
  mal(ESCENAS.has(m.escena), `escena desconocida «${m.escena}»`);
  mal(!/\p{Extended_Pictographic}/u.test(m.arriba + m.abajo), 'arriba y abajo sin emoji (se dibujan en 3D)');
  mal(largo(m.emoji) > 0 && largo(m.emoji) <= 8, 'emoji');
  mal(Array.isArray(m.temas) && m.temas.length > 0 && m.temas.every((t) => TEMAS.has(t)), `temas «${m.temas}»`);
  mal(largo(m.queEs) > 0, 'queEs vacío');
  mal(/^https:\/\/[^\s/]+\.[^\s/]+(\/\S*)?$/.test(m.fuente ?? ''), 'fuente con https://');
}
assert.equal(errores.length, 0, `memes.json:\n  ${errores.join('\n  ')}`);
assert.ok(
  memes.some((m) => m.dept === null),
  'Hay memes de todo Honduras (respaldo de los juegos y muros)',
);
console.log(
  `PASA datos: ${memes.length} memes, ${new Set(memes.map((m) => m.dept).filter(Boolean)).size} departamentos`,
);

const [file, carpeta] = process.argv.slice(2).filter((a) => a !== '--datos');
if (process.argv.includes('--datos')) process.exit(0);
if (!file) throw new Error('Uso: test-memes.mjs <html> [carpeta-capturas] | --datos');

const { run } = await import('./harness.mjs');
const capturas = resolve(carpeta ?? resolve(raiz, '../../capturas/memes'));
const juego = 'cortes.pollo-chuco-en-equilibrio',
  motor = 'cortes.chuco';
const frases = memes
  .filter((m) => m.dept === 'cortes' || (m.dept === null && m.temas.some((t) => t === 'todos' || t === motor)))
  .map((m) => m.frase);
const S = 'window.__mc.store.getState()';
const cuenta = (t) => t.ev(`${S}.profile.memes.length`);
const textoDe = (t, tid) => t.ev(`document.querySelector('[data-testid="${tid}"]').innerText`);

async function entrar(t) {
  await t.click('btn-jugar');
  await t.click('ed-done');
  await t.waitFor(`${S}.profile.created && !${S}.panel`);
}
const popVisible = '!!window.__mcTest?.memePop?.visible';
/** Espera el aviso del ticker y el meme 3D pegado a la cámara; devuelve las llamadas de dibujo con el meme a la vista. */
async function esperarPop(t, nombre) {
  await t.waitFor(popVisible, 45000, `meme 3D a la vista en ${nombre}`);
  const id = await t.ev('window.__mcTest.memePop.id');
  assert.ok(
    memes.some((m) => m.id === id),
    `El meme 3D es un meme del álbum (${id})`,
  );
  assert.equal(await t.ev(`${S}.memeAlAire?.id`), id, 'El meme 3D es el del último aviso');
  await cuadros(t, 25);
  const r = await t.calls();
  assert.ok(r && r.calls < 350, `Presupuesto de dibujo con el meme 3D en ${nombre}: ${r?.calls}`);
  console.log(`PASA meme 3D en ${nombre}: ${id} (${r.calls} llamadas de dibujo)`);
  return r.calls;
}
async function jugarEtapa(t, pop) {
  await t.ev(`${S}.startJuego(${JSON.stringify(juego)})`);
  await t.waitFor(`window.__mcTest?.motor?.estado().id === '${motor}' && ${S}.mg.phase === 'intro'`);
  await t.click('mg-start');
  await t.waitFor(`${S}.mg.phase === 'playing'`);
  if (pop) {
    await t.waitFor(
      `[...document.querySelectorAll('[data-testid=toast]')].some((e) => ${JSON.stringify(frases)}.some((f) => e.innerText.includes(f)))`,
      45000,
      'una frase de meme como aviso mientras se juega',
    );
    await esperarPop(t, motor);
    await t.shot(`${capturas}/${pop}`);
  }
  await t.ev('window.__mcTest.motor.jugarBot(); window.__mcTest.motor.avanzar(123)');
  await t.waitFor("!!document.querySelector('[data-testid=mg-meme]')", 15000, 'meme en la pantalla de resultados');
  await t.ev(`${S}.toasts.forEach((x) => ${S}.dropToast(x.id))`);
  await t.waitFor(`!(${popVisible})`, 15000, 'el meme 3D se va al terminar la partida');
}
const caja = (t, tid) =>
  t.ev(`(() => { const b = document.querySelector('[data-testid="${tid}"]').getBoundingClientRect();
    return { top: b.top, bottom: b.bottom, h: b.height, w: b.width, vh: innerHeight }; })()`);
const cuadros = (t, n) =>
  t.ev(`new Promise((r) => { let i = 0; const f = () => (++i > ${n} ? r(i) : requestAnimationFrame(f)); f(); })`);
const foto3d = (tid) => `!!document.querySelector('[data-testid="${tid}"] img[data-foto="3d"]')`;
/** Intervalos entre cuadros durante `ms`: mediana, p95 y el peor. */
const medirCuadros = (t, ms) =>
  t.ev(`new Promise((r) => { const d = []; let a = performance.now(); const s = a;
    const f = (n) => { d.push(n - a); a = n; if (n - s < ${ms}) requestAnimationFrame(f); else {
      d.sort((x, y) => x - y); const q = (k) => +d[Math.min(d.length - 1, Math.floor(d.length * k))].toFixed(1);
      r({ n: d.length, p50: q(0.5), p95: q(0.95), max: +d[d.length - 1].toFixed(1) }); } };
    requestAnimationFrame(f); })`);
async function rincon(t, dept, archivo) {
  await t.ev(`delete window.__mcTest?.muroMemes; ${S}.travel('${dept}')`);
  await t.waitFor(`window.__mcTest?.muroMemes && ${S}.scene.id === '${dept}'`, 30000);
  const muro = await t.ev('window.__mcTest.muroMemes');
  const [x, y, z] = muro.use,
    yaw = Math.atan2(-(muro.pos[0] - x), -(muro.pos[2] - z));
  const [px, py, pz] = muro.pos,
    dx = x - px,
    dz = z - pz;
  await t.ev(`window.__mc.player.teleport(${px + dx * 7}, ${y}, ${pz + dz * 7}, ${yaw})`);
  await t.ev(
    `window.__mc.player.fixedCam = { pos: [${px + dx * 5.2}, ${py + 3.6}, ${pz + dz * 5.2}], target: [${px}, ${py + 2.5}, ${pz}], fov: 50 }`,
  );
  await cuadros(t, 40);
  await t.ev(`${S}.toasts.forEach((x) => ${S}.dropToast(x.id))`);
  await cuadros(t, 10);
  await t.shot(`${capturas}/${archivo}`);
  await t.ev('window.__mc.player.fixedCam = null');
  return { muro, x, y, z, yaw };
}

const ok1 = await run('memes', file, { hash: '#test', width: 1280, height: 720 }, async (t) => {
  await entrar(t);
  assert.equal(await cuenta(t), 0, 'Perfil nuevo sin memes');
  await jugarEtapa(t, 'pop-cortes-chuco.png');
  console.log('PASA frase de meme durante el juego');
  const elegido = await t.ev("document.querySelector('[data-testid=mg-meme]').dataset.meme");
  assert.equal(await t.ev("document.querySelector('[data-testid=mg-meme]').dataset.nuevo"), 'true');
  assert.deepEqual(await t.ev(`${S}.profile.memes`), [elegido], 'El meme de la partida entra al álbum');
  const img = await caja(t, 'mg-meme');
  assert.ok(img.h <= 180, `Tarjeta del meme compacta (${img.h}px)`);
  await t.waitFor(foto3d('mg-meme'), 20000, 'foto del meme 3D en los resultados');
  await cuadros(t, 10);
  await t.shot(`${capturas}/resultado-1280x720.png`);
  await t.click('mg-meme-album');
  await t.waitFor("!!document.querySelector('[data-testid=panel-memes]')");
  assert.equal(await textoDe(t, 'meme-count'), `1/${memes.length}`);
  assert.equal(await t.ev(`document.querySelector('[data-testid="meme-${elegido}"]').dataset.on`), 'true');
  await t.waitFor(foto3d(`meme-${elegido}`), 20000, 'foto del meme 3D en el álbum');
  await t.shot(`${capturas}/album.png`);
  await t.click(`meme-${elegido}`);
  await t.waitFor(foto3d('meme-ver'), 20000, 'foto grande del meme 3D');
  await t.shot(`${capturas}/album-grande.png`);
  console.log('PASA fotos del meme 3D en resultados y álbum');
  await t.click('panel-close');
  await t.waitFor("!!document.querySelector('[data-testid=mg-meme]')");
  assert.equal(
    await t.ev("document.querySelector('[data-testid=mg-meme]').dataset.meme"),
    elegido,
    'Volver del álbum no cambia el meme',
  );
  assert.equal(await cuenta(t), 1);

  for (const m of ['corte', 'cocina']) {
    await t.ev(`${S}.startMinigame('${m}')`);
    await t.waitFor(`${S}.mg?.id === '${m}' && ${S}.mg.phase === 'intro'`, 30000);
    await t.click('mg-start');
    await t.waitFor(`${S}.mg.phase === 'playing'`);
    await esperarPop(t, m);
    await t.shot(`${capturas}/pop-${m}.png`);
  }

  const { muro, x, y, z, yaw } = await rincon(t, 'olancho', 'rincon-olancho.png');
  const todos = await t.ev('window.__mcTest.muroMemes.todos()');
  const sin = todos.filter((d) => !d.pos).map((d) => d.id);
  assert.equal(sin.length, 0, `Rincón de memes en los 18 departamentos (faltan: ${sin})`);
  await t.ev(`window.__mc.player.teleport(${x}, ${y}, ${z}, ${yaw})`);
  await t.waitFor(
    "document.querySelector('[data-testid=prompt]')?.innerText.includes('Ver otro meme')",
    15000,
    'aviso E · Ver otro meme',
  );
  const antes = await cuenta(t);
  await t.press('e');
  await t.waitFor(`${S}.profile.memes.length === ${antes + 1}`, 15000, 'E en el rincón desbloquea un meme');
  await t.waitFor(`${S}.toasts.some((x) => x.text === 'Meme nuevo en tu álbum')`);
  const visto = await t.ev('window.__mcTest.muroMemes.meme');
  assert.notEqual(visto, muro.meme, 'E cambia el meme del rincón');
  assert.ok((await t.ev(`${S}.profile.memes`)).includes(visto), 'El meme del rincón queda en el álbum');
  await cuadros(t, 30);
  const render = await t.calls();
  assert.ok(render && render.calls < 300, `Presupuesto de dibujo en el departamento: ${render?.calls}`);
  console.log(`PASA rincón de memes en olancho (${render.calls} llamadas de dibujo)`);
  await t.ev(`${S}.openPanel('pausa')`);
  await t.click('pause-memes');
  await t.waitFor("!!document.querySelector('[data-testid=panel-memes]')");
  assert.equal(await textoDe(t, 'meme-count'), `2/${memes.length}`);
  await t.click('meme-tab-olancho');
  await t.shot(`${capturas}/album-olancho.png`);
  await t.click('panel-close');

  await rincon(t, 'islas', 'rincon-islas.png');
  // Costo de las fotos: el álbum lleno pide todas las de la pestaña a la vez
  await t.ev(`delete window.__mcTest?.muroMemes; ${S}.travel('franciscomorazan')`);
  await t.waitFor(`${S}.scene.id === 'franciscomorazan' && !!window.__mcTest?.muroMemes`, 30000);
  await t.ev(
    `window.__memes = ${JSON.stringify(memes.map((m) => m.id))}; window.__memes.forEach((id) => ${S}.verMeme(id))`,
  );
  await cuadros(t, 30);
  const base = await medirCuadros(t, 3000);
  const hechas = await t.ev('window.__mcTest.fotosMemes.listas()');
  await t.ev(`${S}.openPanel('memes')`);
  await t.waitFor("!!document.querySelector('[data-testid=panel-memes]')");
  await t.click('meme-tab-nacional');
  const album = await medirCuadros(t, 3000);
  const nuevas = (await t.ev('window.__mcTest.fotosMemes.listas()')) - hechas,
    ms = await t.ev('window.__mcTest.fotosMemes.ms.slice()');
  const orden = [...ms].sort((a, b) => a - b),
    p = (k) => orden[Math.min(orden.length - 1, Math.floor(orden.length * k))]?.toFixed(1);
  console.log(
    `MIDE cuadros sin álbum ${JSON.stringify(base)} · con el álbum tomando ${nuevas} fotos ${JSON.stringify(album)}` +
      ` · cada foto (render + lectura + JPEG): mediana ${p(0.5)} ms, p95 ${p(0.95)} ms, peor ${p(1)} ms`,
  );
  await t.waitFor(
    `[...document.querySelectorAll('[data-testid^="meme-"][data-on=true]')].filter((e) => e.getBoundingClientRect().top < innerHeight).every((e) => e.querySelector('img[data-foto="3d"]'))`,
    60000,
    'todas las tarjetas en pantalla con foto 3D',
  );
  await t.shot(`${capturas}/album-lleno.png`);
  console.log('PASA álbum con fotos 3D');
});

const ok2 = await run('memes-telefono', file, { hash: '#test', width: 844, height: 390, touch: true }, async (t) => {
  await entrar(t);
  await jugarEtapa(t, false);
  const r = await caja(t, 'mg-result');
  assert.ok(r.top >= 0 && r.bottom <= r.vh + 1, 'Resultados caben en el teléfono');
  const meme = await caja(t, 'mg-meme');
  assert.ok(meme.h <= 140, `Meme compacto en pantalla baja (${meme.h}px)`);
  await t.waitFor(foto3d('mg-meme'), 20000, 'foto del meme 3D en los resultados');
  await cuadros(t, 10);
  await t.shot(`${capturas}/resultado-telefono.png`);
});

const ok3 = await run('memes-vertical', file, { hash: '#test', width: 390, height: 844, touch: true }, async (t) => {
  await entrar(t);
  await jugarEtapa(t, 'pop-telefono-390x844.png');
  const joy = await caja(t, 'touch-joy').catch(() => null);
  if (joy) console.log(`palanca táctil: arriba en ${Math.round(joy.top)}px de ${joy.vh}px`);
  const id = await t.ev("document.querySelector('[data-testid=mg-meme]').dataset.meme");
  await t.click('mg-meme-album');
  await t.waitFor(foto3d(`meme-${id}`), 20000, 'foto 3D en el álbum del teléfono');
  await t.shot(`${capturas}/album-telefono.png`);
});
process.exitCode = ok1 && ok2 && ok3 ? 0 : 1;
