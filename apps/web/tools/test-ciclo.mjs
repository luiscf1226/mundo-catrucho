// Ciclo de día y noche: el mapa gigante y un viaje a varias horas no deben quedar oscuros.
// Mide brillo medio, contraste (desviación) y cuánto de la imagen es casi negro en cada captura.
//   node tools/test-ciclo.mjs [html] [carpeta-capturas]
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { run } from './harness.mjs';

const file = process.argv[2] ?? 'dist/mundo-catrucho-hd.html';
const shots = process.argv[3] ?? '/tmp/mc-ciclo';
const HORAS = [
  ['dia', 10],
  ['tarde', 16.9],
  ['atardecer', 18],
  ['ocaso', 18.15],
  ['anochecer', 19],
  ['noche', 22],
  ['madrugada', 3],
  ['amanecer', 5.8],
];
// mínimos por captura: brillo medio (0..255), desviación y fracción de píxeles casi negros (luma < 16).
// Antes de MC-05 la noche del viaje medía brillo ~25, contraste ~11 y hasta 55 % casi negro al anochecer.
const MIN_BRILLO = 50,
  MIN_CONTRASTE = 14,
  MAX_NEGRO = 0.05,
  MIN_BRILLO_DIA = 120;

/** brillo de un PNG: se decodifica en la página (data: no cuenta como red) */
const medir = (t, png) =>
  t
    .ev(`(async () => {
      const img = new Image();
      img.src = 'data:image/png;base64,${readFileSync(png).toString('base64')}';
      await img.decode();
      const W = 320, H = 180, c = document.createElement('canvas');
      c.width = W; c.height = H;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0, W, H);
      const d = x.getImageData(0, 0, W, H).data;
      let s = 0, s2 = 0, negro = 0, cs = 0, cn = 0, R = 0, B = 0;
      for (let i = 0; i < d.length; i += 4) {
        const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        s += l; s2 += l * l; R += d[i]; B += d[i + 2]; if (l < 16) negro++;
        const p = i / 4, px = p % W, py = (p / W) | 0;
        if (px > W * 0.3 && px < W * 0.7 && py > H * 0.35 && py < H * 0.9) { cs += l; cn++; }
      }
      const n = d.length / 4, m = s / n;
      return JSON.stringify({ brillo: +m.toFixed(1), contraste: +Math.sqrt(s2 / n - m * m).toFixed(1),
        negro: +(negro / n).toFixed(3), centro: +(cs / cn).toFixed(1), rb: +((R - B) / n).toFixed(1) });
    })()`)
    .then(JSON.parse);

const hora = async (t, h) => {
  await t.ev(`location.hash = '#go,nohud,hora=${h}'`);
  await t.waitFor(`Math.abs(window.__mc.env.hour - ${h}) < 0.2`, 8000, `hora ${h}`);
  // el mapa de entorno se regenera cada 1.5 s como mucho: dejamos que alcance
  await t.sleep(1800);
};

const tabla = [];
const ok = await run('ciclo', file, { hash: '#go,nohud,hora=10' }, async (t) => {
  await t.waitFor(`window.__mc.store.getState().scene.kind === 'lobby' && !!window.__mc.gl`, 20000);
  await t.sleep(2500);
  const escenas = [
    ['lobby', async () => {}],
    [
      'viaje',
      async () => {
        await t.ev(
          `window.__mc.store.getState().addCoins(100); window.__mc.store.getState().startViaje('bus', 'lapaz')`,
        );
        await t.waitFor(`window.__mc.store.getState().scene.kind === 'viaje'`);
        await t.sleep(2500);
      },
    ],
    [
      'depto',
      async () => {
        await t.ev(`window.__mc.store.getState().travel('franciscomorazan')`);
        await t.waitFor(`window.__mc.store.getState().scene.kind === 'dept'`, 20000);
        await t.sleep(3000);
      },
    ],
  ];
  for (const [escena, entrar] of escenas) {
    await entrar();
    for (const [nombre, h] of HORAS) {
      await hora(t, h);
      if (escena === 'viaje')
        assert.equal(
          await t.ev(`window.__mc.store.getState().scene.kind`),
          'viaje',
          'el viaje terminó antes de tiempo',
        );
      const png = await t.shot(`${shots}/${escena}-${nombre}.png`);
      const m = await medir(t, png);
      tabla.push({ escena, nombre, hora: h, ...m });
      console.log(
        `${escena.padEnd(6)} ${nombre.padEnd(10)} ${String(h).padStart(4)}h  brillo ${m.brillo}  contraste ${m.contraste}  negro ${m.negro}  centro ${m.centro}  rojo-azul ${m.rb}`,
      );
    }
    const calls = await t.calls();
    console.log(`${escena} llamadas de dibujo: ${calls?.calls}`);
    assert.ok(!calls || calls.calls < 350, `Llamadas excesivas en ${escena}: ${calls?.calls}`);
  }
  if (process.env.MC_CICLO_SOLO_MEDIR) return;
  for (const r of tabla) {
    const id = `${r.escena} ${r.nombre}`;
    assert.ok(r.brillo >= MIN_BRILLO, `${id}: muy oscuro (brillo ${r.brillo} < ${MIN_BRILLO})`);
    assert.ok(r.contraste >= MIN_CONTRASTE, `${id}: sin contraste (${r.contraste} < ${MIN_CONTRASTE})`);
    assert.ok(r.negro <= MAX_NEGRO, `${id}: demasiado negro (${r.negro} > ${MAX_NEGRO})`);
    if (r.nombre === 'dia') assert.ok(r.brillo >= MIN_BRILLO_DIA, `${id}: el día perdió brillo (${r.brillo})`);
  }
  // el atardecer tiene que verse cálido (más rojo que azul) y la noche azulada (más azul que rojo)
  for (const r of tabla) {
    if (r.nombre === 'atardecer') assert.ok(r.rb > 0, `${r.escena} atardecer: no se ve cálido (rojo-azul ${r.rb})`);
    if (r.nombre === 'noche' || r.nombre === 'madrugada')
      assert.ok(r.rb < 0, `${r.escena} ${r.nombre}: no se ve azulada (rojo-azul ${r.rb})`);
  }
});
process.exitCode = ok ? 0 : 1;
