// Prueba del motor 'trivia' («¿Cómo se dice?»): un juego del catálogo y el motor sin tema, una etapa completa cada uno.
//   Uso: node tools/test-trivia.mjs <archivo.html> [carpeta-capturas]
import { run } from './harness.mjs';

const file = process.argv[2],
  shots = process.argv[3] ?? '/tmp/claude-1000/mc-trivia-shots';
if (!file) {
  console.error('uso: node tools/test-trivia.mjs <html> [carpeta]');
  process.exit(2);
}
const P = `window.__mc.player`,
  S = `window.__mc.store.getState()`,
  Q = `window.__mcTest?.trivia`;
const ok = await run('trivia', file, { hash: '#test,go' }, async (t) => {
  await t.waitFor(`!!window.__mc && !!document.querySelector('canvas')`);
  await t.sleep(800);
  const etapa = async (open, label, modo, fallar) => {
    await t.ev(`window.__mcTest && (window.__mcTest.trivia = null)`);
    await t.ev(open);
    await t.waitFor(`!!document.querySelector('[data-testid=mg-intro]')`, 8000, `${label}: mg-intro`);
    if (modo) await t.click(`mg-modo-${modo}`).catch(() => console.log(`  (sin botón mg-modo-${modo})`));
    await t.click('mg-start');
    await t.waitFor(`${S}.mg?.phase==='playing' && !!${Q}`, 8000, `${label}: empezar`);
    let shot = false,
      n = 0;
    for (let guard = 0; guard < 60; guard++) {
      if (await t.ev(`${S}.mg?.phase==='ended'`)) break;
      const q = JSON.parse(await t.ev(`JSON.stringify(${Q})`));
      if (q.fase !== 'pregunta') {
        await t.sleep(250);
        continue;
      }
      if (!shot) {
        console.log(`  ${label}: «${q.q}» → ${q.ops.join(' | ')} (bots ${q.bots})`);
      }
      const wrong = fallar.includes(q.qi),
        x = wrong ? (q.ok === 0 ? 5.4 : -5.4 + 0) : q.pad[0];
      const tx = wrong ? [-5.4, 0, 5.4][(q.ok + 1) % 3] : x;
      await t.ev(`${P}.teleport(${tx}, 0.3, ${q.pad[1]}, 0)`);
      if (!shot) {
        await t.sleep(700);
        await t.shot(`${shots}/${label}-pregunta.png`);
        shot = true;
      }
      await t.waitFor(`${Q}.qi!==${q.qi} || ${S}.mg?.phase==='ended'`, 20000, `${label}: pasar de la pregunta ${q.qi}`);
      n++;
    }
    await t.waitFor(`!!document.querySelector('[data-testid=mg-result]')`, 8000, `${label}: mg-result`);
    const r = JSON.parse(await t.ev(`JSON.stringify(${S}.mg.result)`)),
      won = await t.ev(`document.querySelector('[data-testid=mg-result]').dataset.won`);
    console.log(`  ${label}: ${n} preguntas · ${r.label} · ${r.stars}★ · ganó=${won}`);
    if (n < 8 || n > 10) throw new Error(`${label}: se esperaban 8–10 preguntas, hubo ${n}`);
    if (!/ pts$/.test(r.label)) throw new Error(`${label}: etiqueta sin pts`);
    return r;
  };
  const r1 = await etapa(`${S}.startJuego('yoro.huelga')`, 'yoro', 'duo', [2, 5]);
  if (!r1.won) throw new Error('yoro: acertando casi todas debía ganar');
  await t.shot(`${shots}/yoro-resultado.png`);
  await t.click('mg-exit').catch(() => t.ev(`${S}.exitMinigame()`));
  await t.sleep(1200);
  const r2 = await etapa(`${S}.startMinigame('trivia')`, 'sin-tema', 'abierto', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  if (r2.won) throw new Error('sin tema: fallando todas no debía ganar');
});
process.exit(ok ? 0 : 1);
