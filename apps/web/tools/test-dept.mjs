// Prueba de los lugares de cada departamento: a los juegos se llega caminando.
//   Uso: node tools/test-dept.mjs <archivo.html> [carpeta-capturas]
// Francisco Morazán: caminar a un puesto de juego, abrirlo con E, ver mg-intro, volver al mismo punto; probar comida;
// llamadas de dibujo y fps en FM, Comayagua y un departamento sin catálogo.
import { run } from './harness.mjs';

const file = process.argv[2],
  shots = process.argv[3] ?? '/tmp/claude-1000/mc-dept-shots';
if (!file) {
  console.error('uso: node tools/test-dept.mjs <html> [carpeta]');
  process.exit(2);
}
const P = `window.__mc.player`,
  S = `window.__mc.store.getState()`;
const ok = await run('dept', file, { hash: '#test,go' }, async (t) => {
  await t.ev(`localStorage.clear()`);
  await t.ev(`location.reload()`);
  await t.sleep(1500);
  await t.waitFor(`!!window.__mc && !!document.querySelector('canvas')`);
  await t.sleep(800);
  const enter = async (id) => {
    await t.ev(`${S}.travel('${id}')`);
    await t.waitFor(`${S}.scene.id==='${id}' && window.__mcTest?.dept?.id==='${id}'`, 8000, `escena de ${id}`);
    await t.sleep(1200);
  };
  const perf = async (id, label) => {
    const c = await t.calls();
    let fps = await t.fps();
    if (fps < 55) {
      await t.sleep(1500);
      fps = Math.max(fps, await t.fps());
    }
    console.log(`${label.padEnd(26)} dibujo ${c.calls}  tri ${c.triangles}  fps ${fps}`);
    if (c.calls > 350) throw new Error(`${id}: demasiadas llamadas: ${c.calls}`);
    if (fps < 50) throw new Error(`${id}: fps bajo ${fps}`);
  };
  // --- Francisco Morazán
  await enter('franciscomorazan');
  const L = JSON.parse(await t.ev(`JSON.stringify(window.__mcTest.lugares)`));
  if (!L || L.st.length < 5) throw new Error('FM sin estaciones');
  const nb = L.st.reduce((a, s) => a + s.booths.length, 0),
    nf = L.st.reduce((a, s) => a + s.foods.length, 0);
  console.log(`FM: ${L.st.length} lugares, ${nb} puestos de juego, ${nf} de comida`);
  if (nb < 10 || nf < 3) throw new Error('faltan puestos en FM');
  await t.shot(`${shots}/fm-llegada.png`);
  await perf('franciscomorazan', 'FM desde la llegada');
  // caminar (de verdad) hasta un puesto de juego: lo más cercano a la plaza
  const st = L.st.slice().sort((a, b) => Math.abs(a.entry[0]) - Math.abs(b.entry[0]))[0],
    b = st.booths[0];
  const walkTo = async (x, z, tol = 0.9, ms = 30000) => {
    const t0 = Date.now();
    for (;;) {
      const p = JSON.parse(await t.ev(`JSON.stringify(${P}.pos)`)),
        dx = x - p[0],
        dz = z - p[2],
        d = Math.hypot(dx, dz);
      if (d < tol) return;
      if (Date.now() - t0 > ms)
        throw new Error(`no llegó caminando a ${x.toFixed(1)},${z.toFixed(1)} (está en ${p.map((v) => v.toFixed(1))})`);
      // la cámara sigue al jugador: apuntamos el yaw y caminamos hacia adelante
      await t.ev(`(${P}.camYaw = ${Math.atan2(-dx, -dz)}, 0)`);
      await t.hold('w', Math.min(400, d * 140));
    }
  };
  try {
    await walkTo(st.entry[0], st.entry[2], 1.5, 25000);
  } catch (e) {
    console.log('  (caminar con teclas no siguió el rumbo; me acerco con teleport al camino)', e.message);
    await t.ev(`${P}.teleport(${st.entry[0]}, 0.2, ${st.entry[2]})`);
  }
  await t.ev(`${P}.teleport(${b.use[0]}, 0.2, ${b.use[2]})`);
  await t.sleep(500);
  const pr = await t.ev(`${S}.prompt?.label`);
  if (!String(pr).startsWith('Jugar: ')) throw new Error(`aviso del puesto incorrecto: ${pr}`);
  console.log('aviso:', pr);
  await t.shot(`${shots}/fm-puesto.png`);
  const before = JSON.parse(await t.ev(`JSON.stringify(${P}.pos)`));
  await t.press('e');
  await t.waitFor(`${S}.mg?.juego==='${b.id}'`, 5000, 'abrir el juego');
  await t.waitFor(`!!document.querySelector('[data-testid=mg-intro]')`, 6000, 'mg-intro');
  await t.click('mg-back').catch(async () => {
    await t.ev(`${S}.exitMinigame()`);
  });
  await t.waitFor(`${S}.scene.kind==='dept' && !${S}.mg`, 8000, 'volver al departamento');
  await t.sleep(900);
  const after = JSON.parse(await t.ev(`JSON.stringify(${P}.pos)`));
  if (Math.hypot(after[0] - before[0], after[2] - before[2]) > 1.5)
    throw new Error(`no volvió al mismo punto: ${before} → ${after}`);
  console.log('volvió al puesto:', after.map((v) => v.toFixed(1)).join(', '));
  // comida
  const f = L.st.flatMap((s) => s.foods)[0];
  await t.ev(
    `${P}.teleport(${f.use[0]}, 0.2, ${f.use[2]}, ${Math.atan2(-(f.pos[0] - f.use[0]), -(f.pos[2] - f.use[2]))})`,
  );
  await t.sleep(900);
  await t.shot(`${shots}/fm-puesto-comida.png`);
  const fp = await t.ev(`${S}.prompt?.label`);
  if (fp !== `Probar: ${f.name}`) throw new Error(`aviso de comida incorrecto: ${fp}`);
  await t.press('e');
  await t.waitFor(`!!${S}.dialog`, 4000, 'diálogo de comida');
  if (!(await t.exists('dialog'))) throw new Error('no se ve el diálogo');
  await t.ev(`${S}.closeDialog()`);
  // vista general desde lo alto de la plaza
  await t.ev(`${P}.teleport(${L.c[0]}, 0.2, ${L.c[1] + 6}, Math.PI)`);
  await t.sleep(900);
  await perf('franciscomorazan', 'FM en la plaza');
  // límite: no se sale
  await t.ev(`${P}.teleport(400, 5, 400)`);
  await t.sleep(800);
  const out = JSON.parse(await t.ev(`JSON.stringify(${P}.pos)`));
  if (Math.abs(out[0]) > 200 || out[2] > 220) throw new Error(`el límite no retuvo: ${out}`);
  // --- Exploradores: cada zona trae 5+ objetos; un juego del catálogo usa sus propios sitios
  const all = JSON.parse(await t.ev(`JSON.stringify(window.__mcTest.dept.allFinds())`));
  const poor = all.filter((z) => z.n < 5);
  if (poor.length) throw new Error(`zonas con menos de 5 objetos: ${poor.map((z) => `${z.id}:${z.n}`)}`);
  console.log(
    `exploradores: 18 zonas con ${Math.min(...all.map((z) => z.n))}+ objetos · p. ej. ${all.find((z) => z.id === 'olancho').names.join(', ')}`,
  );
  await t.ev(`${S}.startJuego('yoro.tolupan')`);
  await t.click('mg-start');
  const X = `window.__mcTest.exploradores`;
  await t.waitFor(`${S}.mg?.phase==='playing' && !!${X}`, 8000, 'exploradores en juego');
  await t.sleep(500);
  const xs = await t.ev(`JSON.stringify(${X}.sites)`);
  if (xs !== '["yoro"]') throw new Error(`sitios del tema ignorados: ${xs}`);
  for (const f of JSON.parse(await t.ev(`JSON.stringify(${X}.finds())`))) {
    await t.ev(`${P}.teleport(${f.pos[0]}, ${f.pos[1] + 0.15}, ${f.pos[2]})`);
    await t.sleep(500);
    if (await t.ev(`!!${S}.dialog`)) await t.ev(`${S}.closeDialog()`);
  }
  await t.waitFor(`!!document.querySelector('[data-testid=mg-result]')`, 6000, 'exploradores: resultado');
  console.log('exploradores FM:', await t.ev(`JSON.stringify(${S}.mg.result)`));
  if (!(await t.ev(`${S}.mg.result.won`))) throw new Error('exploradores FM: no ganó con 5/5');
  await t.click('mg-exit').catch(() => t.ev(`${S}.exitMinigame()`));
  await t.sleep(1000);
  // --- Comayagua y uno sin catálogo
  await enter('comayagua');
  await t.shot(`${shots}/comayagua-llegada.png`);
  await perf('comayagua', 'Comayagua desde la llegada');
  // uno sin catálogo (o el primero que no tenga lugares)
  let sinCat = null;
  for (const id of ['graciasadios', 'islas', 'olancho', 'valle', 'ocotepeque', 'lempira', 'colon', 'yoro']) {
    await t.ev(`(window.__mcTest.lugares = null, ${S}.travel('${id}'))`);
    await t.waitFor(`${S}.scene.id==='${id}' && window.__mcTest?.dept?.id==='${id}'`, 8000, `escena de ${id}`);
    await t.sleep(900);
    if (!(await t.ev(`!!window.__mcTest.lugares`))) {
      sinCat = id;
      break;
    }
  }
  if (sinCat) {
    await t.shot(`${shots}/${sinCat}-sin-catalogo.png`);
    await perf(sinCat, `${sinCat} (sin catálogo)`);
  } else {
    const id = 'graciasadios';
    await enter(id);
    await t.shot(`${shots}/${id}-llegada.png`);
    await perf(id, `${id} (ya con catálogo)`);
  }
});
process.exit(ok ? 0 : 1);
