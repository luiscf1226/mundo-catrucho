// Prueba del minijuego Exploradores de Honduras: partida completa (15/15, 3 estrellas) viajando por los arcos
// reales, partida a medias (8 objetos → bronce) y partida perdida por tiempo.
// Uso: node tools/test-exploradores.mjs <archivo.html>
import { run } from './harness.mjs';

const file = process.argv[2];
if (!file) {
  console.error('uso: node tools/test-exploradores.mjs <html>');
  process.exit(2);
}
const P = `window.__mc.player`,
  S = `window.__mc.store.getState()`,
  X = `window.__mcTest.exploradores`;
const ok = await run('exploradores', file, { hash: '#test,go' }, async (t) => {
  await t.ev(`localStorage.clear()`);
  await t.ev(`location.reload()`);
  await t.sleep(1500);
  await t.waitFor(`!!window.__mc && !!document.querySelector('canvas')`);
  await t.sleep(600);
  const state = async () => JSON.parse(await t.ev(`JSON.stringify(${X}.state())`));
  const begin = async () => {
    await t.waitFor(`!!document.querySelector('[data-testid=mg-intro]')`, 8000, 'tarjeta de inicio');
    await t.click('mg-start');
    await t.waitFor(`${S}.mg?.phase==='playing' && !!${X}`, 8000, 'fase de juego');
    await t.sleep(500);
  };
  /** recoge hasta n objetos del sitio actual teletransportándose encima */
  const collect = async (n = 5) => {
    const finds = JSON.parse(await t.ev(`JSON.stringify(${X}.finds())`))
      .filter((f) => !f.found)
      .slice(0, n);
    for (const f of finds) {
      const before = (await state()).found;
      await t.ev(`${P}.teleport(${f.pos[0]}, ${f.pos[1] + 0.15}, ${f.pos[2]})`);
      await t.waitFor(`${X}.state().found===${before + 1} || ${S}.mg?.phase==='ended'`, 5000, `recoger ${f.id}`);
      if (await t.ev(`!!${S}.dialog`)) {
        if (!(await t.ev(`${S}.dialog.text.length > 20`)))
          throw new Error('el diálogo del primer hallazgo no trae dato');
        await t.ev(`${S}.closeDialog()`);
      }
      await t.sleep(120);
    }
    return finds.length;
  };
  const travel = async (dir, label) => {
    const p = JSON.parse(await t.ev(`JSON.stringify(${X}.portal(${dir}))`)),
      s0 = await state();
    await t.ev(`${P}.teleport(${p[0]}, ${p[1] + 0.2}, ${p[2]})`);
    await t.sleep(400);
    const prompt = await t.ev(`${S}.prompt?.label`);
    if (prompt !== label) throw new Error(`aviso del arco: se esperaba «${label}», hay «${prompt}»`);
    await t.press('e');
    await t.waitFor(`${X}.state().site===${s0.site + dir}`, 5000, `viajar (${label})`);
    await t.sleep(900);
    const s1 = await state();
    if (!(s1.time < s0.time)) throw new Error('el reloj no siguió corriendo durante el viaje');
    const g = JSON.parse(await t.ev(`JSON.stringify({g:${P}.body.grounded,y:${P}.pos[1]})`));
    if (!g.g || g.y < -5) throw new Error(`mal aterrizaje en el sitio nuevo: ${JSON.stringify(g)}`);
  };
  const result = async () => {
    await t.waitFor(`${S}.mg?.phase==='ended'`, 8000, 'fin de la partida');
    await t.waitFor(`!!document.querySelector('[data-testid=mg-result]')`);
    return (await t.state()).mg.result;
  };

  // 1) partida completa: Copán → Yojoa → (vuelta a Copán y regreso) → Roatán
  await t.ev(`${S}.startMinigame('exploradores')`);
  await begin();
  const s0 = await state();
  if (s0.site !== 0 || s0.found !== 0 || Math.abs(s0.time - 240) > 3)
    throw new Error(`estado inicial raro: ${JSON.stringify(s0)}`);
  if ((await collect()) !== 5) throw new Error('Copán no tiene 5 objetos');
  const score = await t.text('mg-score');
  if (!String(score).includes('5/15')) throw new Error(`marcador: ${score}`);
  const timer = await t.text('mg-timer');
  if (!timer) throw new Error('no se ve el cronómetro');
  console.log(
    'copán 5/5 · HUD',
    JSON.stringify(await t.ev(`${S}.mgHud`)),
    'dibujo',
    JSON.stringify(await t.calls()),
    'fps',
    await t.fps(),
  );
  await travel(1, 'Ir a Lago de Yojoa');
  await travel(-1, 'Volver a Copán Ruinas');
  await travel(1, 'Ir a Lago de Yojoa');
  if ((await collect()) !== 5) throw new Error('Yojoa no tiene 5 objetos');
  console.log('yojoa 5/5 · dibujo', JSON.stringify(await t.calls()), 'fps', await t.fps());
  await travel(1, 'Ir a Roatán');
  console.log('roatán · dibujo', JSON.stringify(await t.calls()), 'fps', await t.fps());
  if ((await collect()) !== 5) throw new Error('Roatán no tiene 5 objetos');
  let r = await result();
  if (!r.won || r.stars !== 3 || r.score !== 15 || r.label !== '15/15 objetos')
    throw new Error(`resultado de partida completa: ${JSON.stringify(r)}`);
  if ((await t.ev(`document.querySelector('[data-testid=mg-result]').dataset.won`)) !== 'true')
    throw new Error('la pantalla de resultados no marca victoria');
  console.log('completa →', JSON.stringify(r));

  // 2) 8 objetos y se acaba el tiempo: gana con bronce
  await t.click('mg-replay');
  await begin();
  await collect(5);
  await travel(1, 'Ir a Lago de Yojoa');
  await collect(3);
  await t.ev(`${X}.setTime(1.2)`);
  r = await result();
  if (!r.won || r.stars !== 1 || r.score !== 8 || r.label !== '8/15 objetos')
    throw new Error(`resultado con 8 objetos: ${JSON.stringify(r)}`);
  console.log('8 objetos →', JSON.stringify(r));

  // 3) muy pocos objetos y se acaba el tiempo: pierde
  await t.click('mg-replay');
  await begin();
  await collect(2);
  await t.ev(`${X}.setTime(1.2)`);
  r = await result();
  if (r.won || r.stars !== 0 || r.score !== 2 || r.label !== '2/15 objetos')
    throw new Error(`resultado sin tiempo: ${JSON.stringify(r)}`);
  if ((await t.ev(`document.querySelector('[data-testid=mg-result]').dataset.won`)) !== 'false')
    throw new Error('la pantalla de resultados no marca derrota');
  console.log('sin tiempo →', JSON.stringify(r));
});
process.exit(ok ? 0 : 1);
