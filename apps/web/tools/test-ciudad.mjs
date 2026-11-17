// Prueba de la ciudad de cada cabecera: lugares reales, pulpería y ambiente (postes, cables enredados, zapatos).
// 1. En los 18 departamentos: caben todos los lugares, no se enciman, no tapan caminos ni estaciones, hay postes,
//    marañas y zapatos colgando, y la escena queda bajo 350 llamadas de dibujo.
// 2. En Tegucigalpa: llega a Polilandia y a la pulpería, aprieta E y lee lo que cuentan.
// Uso: node tools/test-ciudad.mjs <mundo-catrucho-hd.html> [carpeta-capturas]
import { run } from './harness.mjs';

const [file, out] = process.argv.slice(2);
if (!file) {
  console.error('uso: node tools/test-ciudad.mjs <html> [carpeta-capturas]');
  process.exit(2);
}
const S = `window.__mc.store.getState()`;
const DEPTS = [
  'atlantida',
  'choluteca',
  'colon',
  'comayagua',
  'copan',
  'cortes',
  'elparaiso',
  'franciscomorazan',
  'graciasadios',
  'intibuca',
  'islas',
  'lapaz',
  'lempira',
  'ocotepeque',
  'olancho',
  'santabarbara',
  'valle',
  'yoro',
];
const ok = (c, m) => {
  if (!c) throw new Error(m);
};
const distSeg = (x, z, [ax, az], [bx, bz]) => {
  const dx = bx - ax,
    dz = bz - az,
    k = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - ax - k * dx, z - az - k * dz);
};
/** esquinas de la huella girada de un sitio */
const esquinas = (s) =>
  [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
    [0, 0],
  ].map(([a, b]) => {
    const lx = (a * s.w) / 2,
      lz = (b * s.d) / 2,
      c = Math.cos(s.rot),
      n = Math.sin(s.rot);
    return [s.pos[0] + lx * c + lz * n, s.pos[2] - lx * n + lz * c];
  });
const dentro = (pt, s) => {
  const dx = pt[0] - s.pos[0],
    dz = pt[1] - s.pos[2],
    c = Math.cos(-s.rot),
    n = Math.sin(-s.rot),
    lx = dx * c + dz * n,
    lz = -dx * n + dz * c;
  return Math.abs(lx) < s.w / 2 - 0.2 && Math.abs(lz) < s.d / 2 - 0.2;
};

const pasa = await run('ciudad', file, { hash: '#go,test', width: 1280, height: 720 }, async (t) => {
  await t.waitFor(`!!document.querySelector('canvas')`);
  let total = 0;
  for (const id of DEPTS) {
    await t.ev(`${S}.travel('${id}')`);
    await t.waitFor(
      `${S}.scene.id==='${id}' && window.__mcTest?.ciudad?.dept==='${id}' && !!window.__mcTest?.lugares`,
      30000,
      `la ciudad de ${id}`,
    );
    const c = JSON.parse(await t.ev(`JSON.stringify(window.__mcTest.ciudad)`)),
      lug = JSON.parse(await t.ev(`JSON.stringify(window.__mcTest.lugares)`));
    ok(c.faltan.length === 0, `${id}: no cupieron ${c.faltan.join(', ')}`);
    ok(c.sitios.length >= 4, `${id}: solo ${c.sitios.length} lugares`);
    ok(c.sitios[0].id === 'pulperia', `${id}: falta la pulpería`);
    ok(c.postes >= 6 && c.zapatos >= 2 && c.maranas >= 2, `${id}: poco ambiente ${JSON.stringify(c)}`);
    for (const s of c.sitios) {
      for (const o of c.sitios)
        if (o !== s) ok(!esquinas(s).some((p) => dentro(p, o)), `${id}: ${s.id} se encima con ${o.id}`);
      for (const p of esquinas(s)) {
        for (const st of lug.st) {
          const sp = st.sign;
          ok(distSeg(p[0], p[1], lug.c, [st.entry[0], st.entry[2]]) > 2, `${id}: ${s.id} tapa el camino a ${st.id}`);
          ok(Math.hypot(p[0] - sp[0], p[1] - sp[2]) > 3, `${id}: ${s.id} tapa la entrada de ${st.id}`);
        }
        ok(Math.hypot(p[0] - lug.c[0], p[1] - lug.c[1]) > 8, `${id}: ${s.id} está sobre la plaza`);
      }
    }
    const calls = (await t.calls())?.calls ?? 0;
    ok(calls < 350, `${id}: ${calls} llamadas de dibujo`);
    total += c.sitios.length - 1;
    console.log(
      `  ${id}: ${c.sitios.map((s) => s.nombre).join(' · ')} | postes ${c.postes}, zapatos ${c.zapatos} | ${calls} llamadas`,
    );
  }

  // Tegucigalpa: Polilandia y la pulpería se pueden conocer con E
  await t.ev(`${S}.travel('franciscomorazan')`);
  await t.waitFor(`window.__mcTest?.ciudad?.dept==='franciscomorazan'`, 30000);
  for (const [id, nombre] of [
    ['polilandia', 'Polilandia'],
    ['pulperia', 'Pulpería La Bendición'],
  ]) {
    const s = JSON.parse(await t.ev(`JSON.stringify(window.__mcTest.ciudad.sitios.find((s)=>s.id==='${id}'))`));
    ok(s, `no está ${id}`);
    await t.ev(`window.__mc.player.teleport(${s.use[0]}, ${s.use[1] + 0.05}, ${s.use[2]}, ${s.rot + Math.PI})`);
    await t.waitFor(`!!document.querySelector('[data-testid=prompt]')`, 8000, `el aviso de ${nombre}`);
    await t.press('e');
    await t.waitFor(
      `document.querySelector('[data-testid=dialog]')?.textContent.includes(${JSON.stringify(nombre)})`,
      8000,
      `el diálogo de ${nombre}`,
    );
    if (out) await t.shot(`${out}/ciudad-${id}-dialogo.png`);
    await t.click('dialog-close');
    await t.waitFor(`!document.querySelector('[data-testid=dialog]')`);
  }
  console.log(`  ${total} lugares reales en ${DEPTS.length} ciudades`);
});
if (!pasa) process.exit(1);
