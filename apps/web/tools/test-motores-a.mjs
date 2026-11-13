// Prueba de los motores corte, monta, ritmo y ruta (versión hd). Uso: node tools/test-motores-a.mjs <html> [carpeta-capturas] [corte|monta|ritmo|ruta]
import assert from 'node:assert/strict';
import { run } from './harness.mjs';

const file = process.argv[2] ?? '/tmp/claude-1000/mc-mot-a/mundo-catrucho-hd.html',
  out = process.argv[3] ?? '/tmp/claude-1000/mc-mot-a/shots',
  only = process.argv[4];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let all = true;
const abre = async (t, juego, motor, modo) => {
  await t.ev(
    juego
      ? `window.__mc.store.getState().startJuego('${juego}')`
      : `window.__mc.store.getState().startMinigame('${motor}')`,
  );
  await t.waitFor(`!!document.querySelector('[data-testid=mg-start]')`, 15000, 'tarjeta de inicio');
  const card = await t.text('mg-intro');
  assert(card && /\S/.test(card), 'la tarjeta de inicio tiene texto');
  if (modo) await t.click(`mg-modo-${modo}`);
  await t.click('mg-start');
  await t.waitFor(`window.__mc.store.getState().mg?.phase==='playing'`, 8000, 'fase playing');
};
const resultado = async (t, name) => {
  await t.waitFor(`!!document.querySelector('[data-testid=mg-result]')`, 120000, 'mg-result');
  const r = await t.ev(
    `JSON.stringify({won:document.querySelector('[data-testid=mg-result]').dataset.won, label:document.querySelector('[data-testid=mg-result-label]')?.innerText, res:window.__mc.store.getState().mg.result})`,
  );
  console.log(`  ${name}:`, r);
  return JSON.parse(r);
};
const calls = async (t, name) => {
  const c = await t.calls();
  console.log(`  ${name} draw calls:`, c?.calls);
  if (c) assert(c.calls < 350, `${name}: demasiadas llamadas de dibujo (${c.calls})`);
};

const BOT_CORTE = `(()=>{ const T=window.__mcTest.corte, I=window.__mc.input; if(window.__b) clearInterval(window.__b);
  window.__b=setInterval(()=>{ const bad=T.slots.filter(s=>s.on&&!s.cut&&s.bad); const c=T.slots.filter(s=>s.on&&!s.cut&&!s.bad&&s.y>1.0&&!bad.some(b=>Math.hypot(b.x-s.x,b.y-s.y)<1.7)).sort((a,b)=>a.y-b.y)[0];
    if(c){ const [px,py]=T.toNdc(c.x+c.vx*0.05,c.y+c.vy*0.05); I.px=px; I.py=py; I.press('fire'); } },70); })()`;
const BOT_MONTA = `(()=>{ const T=window.__mcTest.monta, I=window.__mc.input; if(window.__b) clearInterval(window.__b);
  window.__b=setInterval(()=>{ const s=T.st; const e=s.ev.find(q=>q.big&&!q.jumped&&!q.fired&&Math.abs(q.t-s.t)<0.2); if(e){ I.press('jump'); }
    I.kx = Math.max(-1,Math.min(1,(s.L*1.4+s.V*0.5))); },16); })()`;

if (!only || only === 'corte')
  all =
    (await run('corte', file, { hash: '#go' }, async (t) => {
      await abre(t, 'lapaz.hornilla', 'corte', 'solo');
      const g = await t.ev(`window.__mc.store.getState().mg.juego`);
      assert.equal(g, 'lapaz.hornilla');
      await t.ev(BOT_CORTE);
      await sleep(14000);
      const s1 = await t.ev(
        `JSON.stringify({score:window.__mcTest.corte.st.score,cuts:window.__mcTest.corte.st.cuts})`,
      );
      console.log('  a los 14 s:', s1);
      assert(JSON.parse(s1).cuts >= 5, 'cortó cosas');
      await t.shot(`${out}/corte-tema.png`);
      await calls(t, 'corte');
      await t.ev(`window.__mcTest.corte.warp(window.__mcTest.corte.dur-3)`);
      const r = await resultado(t, 'corte');
      assert(r.res.score >= 0);
      // motor sin tema, modo duo (pastel de cumpleaños)
      await t.ev(`clearInterval(window.__b); window.__mc.store.getState().goLobby()`);
      await sleep(500);
      await abre(t, null, 'corte', 'duo');
      await t.ev(BOT_CORTE);
      await sleep(9000);
      await t.shot(`${out}/corte-pastel.png`);
      await t.ev(`window.__mcTest.corte.warp(window.__mcTest.corte.dur-2)`);
      await resultado(t, 'corte sin tema');
    })) && all;

if (!only || only === 'monta')
  all =
    (await run('monta', file, { hash: '#go' }, async (t) => {
      await abre(t, 'choluteca.doma', 'monta', 'solo');
      await t.ev(BOT_MONTA);
      await sleep(14000);
      const s1 = await t.ev(
        `JSON.stringify({L:window.__mcTest.monta.st.L,score:window.__mcTest.monta.st.score,t:window.__mcTest.monta.st.t})`,
      );
      console.log('  a los 14 s:', s1);
      await t.shot(`${out}/monta-caballo.png`);
      await calls(t, 'monta');
      await t.ev(`window.__mcTest.monta.warp(window.__mcTest.monta.dur-4)`);
      const r = await resultado(t, 'monta caballo');
      assert(r.res.won, 'el piloto automático aguanta');
      await t.ev(`clearInterval(window.__b); window.__mc.store.getState().goLobby()`);
      await sleep(500);
      await abre(t, 'lapaz.mula', 'monta', 'abierto');
      await sleep(6000);
      await t.shot(`${out}/monta-mula.png`);
      // sin corregir la aguja se cae: derrota
      await resultado(t, 'monta sin corregir (se cae)');
      await t.ev(`clearInterval(window.__b); window.__mc.store.getState().goLobby()`);
      await sleep(500);
      await abre(t, null, 'monta', 'solo');
      await t.ev(BOT_MONTA);
      await sleep(4000);
      await t.shot(`${out}/monta-toro.png`);
      await t.ev(`window.__mcTest.monta.warp(window.__mcTest.monta.dur-2)`);
      await resultado(t, 'monta sin tema');
    })) && all;

if (!only || only === 'ritmo')
  all =
    (await run('ritmo', file, { hash: '#go' }, async (t) => {
      await abre(t, 'lapaz.guancasco', 'ritmo', 'solo');
      await t.ev(`window.__mcTest.ritmo.auto(0)`);
      await sleep(11000);
      const s1 = await t.ev(
        `JSON.stringify({score:window.__mcTest.ritmo.st.score,combo:window.__mcTest.ritmo.st.combo,mode:window.__mcTest.ritmo.st.mode,total:window.__mcTest.ritmo.st.total})`,
      );
      console.log('  a los 11 s:', s1);
      assert(JSON.parse(s1).score > 0, 'las teclas A S D F puntúan');
      await t.shot(`${out}/ritmo-tambor.png`);
      await calls(t, 'ritmo');
      const r = await resultado(t, 'ritmo guancasco (autoplay)');
      assert(r.res.won, 'autoplay perfecto gana');
      await t.ev(`window.__mcTest.ritmo.stop(); window.__mc.store.getState().goLobby()`);
      await sleep(500);
      await abre(t, 'valle.marimba', 'ritmo', 'abierto');
      await t.ev(`window.__mcTest.ritmo.auto(20)`);
      await sleep(8000);
      await t.shot(`${out}/ritmo-marimba.png`);
      assert(await t.ev(`window.__mcTest.ritmo.st.score>0`), 'marimba puntúa');
      await t.ev(`window.__mcTest.ritmo.stop(); window.__mc.store.getState().goLobby()`);
      await sleep(500);
      await abre(t, null, 'ritmo', 'duo');
      await t.ev(`window.__mcTest.ritmo.auto(0)`);
      await sleep(5000);
      assert(await t.ev(`window.__mcTest.ritmo.st.score>0`), 'ritmo sin tema puntúa');
      await t.ev(`window.__mcTest.ritmo.stop()`);
    })) && all;

const PILOTO_RUTA = `(()=>{ const T=window.__mcTest.ruta, M=window.__mc, g=T.G; let i=0; if(window.__b) clearInterval(window.__b);
  window.__b=setInterval(()=>{ const q=g.plats[Math.min(i,g.plats.length-1)]; if(i>=g.plats.length) return; M.player.teleport(q.x,q.y+0.2,q.z+q.len*0.3,0); i++; },110); })()`;
if (!only || only === 'ruta')
  all =
    (await run('ruta', file, { hash: '#go' }, async (t) => {
      await abre(t, 'lapaz.estanzuela', 'ruta', 'solo');
      await t.press(' ');
      await sleep(200);
      assert(await t.ev(`window.__mc.player.pos[1]>0.3`), 'Espacio salta');
      await sleep(900);
      const p0 = await t.ev(`window.__mc.player.pos[2]`);
      await t.hold('w', 500);
      const p1 = await t.ev(`window.__mc.player.pos[2]`);
      assert(p1 < p0 - 1, `W mueve al jugador (${p0} → ${p1})`);
      // caída: vuelve al punto de control
      await t.ev(`window.__mc.player.teleport(0,-60,-20,0)`);
      await sleep(600);
      assert(await t.ev(`window.__mc.player.pos[1]>-5`), 'reaparece tras caer');
      console.log(
        '  piezas:',
        await t.ev(
          `JSON.stringify({n:window.__mcTest.ruta.G.plats.length,len:Math.round(window.__mcTest.ruta.G.length),cps:window.__mcTest.ruta.G.cps.length-1,est:window.__mcTest.ruta.est,tipos:[...new Set(window.__mcTest.ruta.G.plats.map(p=>p.tipo))]})`,
        ),
      );
      await t.ev(PILOTO_RUTA);
      await sleep(3500);
      await t.shot(`${out}/ruta-picacho.png`);
      await calls(t, 'ruta');
      const r = await resultado(t, 'ruta picacho');
      assert(r.res.won, 'llegó a la meta');
      await t.ev(`clearInterval(window.__b); window.__mc.store.getState().goLobby()`);
      await sleep(500);
      await abre(t, 'santabarbara.pencaligue', 'ruta', 'abierto');
      await sleep(1500);
      await t.hold('w', 800);
      await t.shot(`${out}/ruta-pencaligue.png`);
      await t.ev(`window.__mcTest.ruta.warp(window.__mcTest.ruta.TL+1)`);
      const r2 = await resultado(t, 'ruta pencaligue (se acaba el tiempo)');
      assert(!r2.res.won, 'sin llegar, pierde');
      await t.ev(`window.__mc.store.getState().goLobby()`);
      await sleep(500);
      await abre(t, null, 'ruta', 'duo');
      await t.ev(PILOTO_RUTA);
      await resultado(t, 'ruta sin tema');
      await t.ev(`clearInterval(window.__b)`);
    })) && all;

console.log(all ? 'PASA test-motores-a' : 'NO PASA test-motores-a');
process.exit(all ? 0 : 1);
