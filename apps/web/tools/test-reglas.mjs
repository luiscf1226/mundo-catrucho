// Prueba de reglas compartidas (MC-12) en el juego compilado.
// 1. Premios: para varias partidas de ejemplo, `finishMinigame` (que ahora usa @mundo-catrucho/reglas) da las mismas
//    monedas, XP y niveles que la lógica vieja de store.ts (copiada abajo). También primera visita, recuerdo,
//    moneda suelta y bono de viaje.
// 2. Metas: revisa que cada `defineMotor` del código tenga tope, abre cada motor del kit en la primera y la última etapa y compara metas y reloj con `TOPES` del paquete,
//    para que la validación del servidor no se desfase de lo que el jugador ve. Con MC_GPU=0 solo la primera etapa.
// Uso: node tools/test-reglas.mjs <mundo-catrucho-hd.html>
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { difDe, TOPES } from '@mundo-catrucho/reglas';
import { run } from './harness.mjs';

const [file] = process.argv.slice(2);
if (!file) throw new Error('Uso: test-reglas.mjs <html>');
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REWARDS = JSON.parse(readFileSync(resolve(raiz, 'shared/data/rewards.json'), 'utf8'));
const sinGpu = process.env.MC_GPU === '0';

// todo motor del kit (`defineMotor`) necesita su tope: sin él el servidor usaría el genérico, que deja pasar casi todo
const fuentes = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? fuentes(resolve(dir, d.name)) : d.name.endsWith('.tsx') ? [resolve(dir, d.name)] : [],
  );
const delKit = fuentes(resolve(raiz, 'src/game/minigames')).flatMap((f) =>
  [...readFileSync(f, 'utf8').matchAll(/defineMotor(?:<[^>]*>)?\(\{\s*id:\s*'([^']+)'/g)].map((m) => m[1]),
);
assert.ok(delKit.length >= 30, `solo encontré ${delKit.length} motores del kit`);
const sinTope = delKit.filter((id) => !TOPES[id]?.reloj);
assert.deepEqual(sinTope, [], `motores del kit sin tope en packages/reglas/src/topes.ts: ${sinTope.join(', ')}`);
console.log(`PASA los ${delKit.length} motores del kit tienen tope`);

// ---- lógica vieja, copiada de apps/web/src/core/store.ts y data.ts (ola 4, antes de MC-12)
const xpForLevel = (n) => REWARDS.level.base + (n - 1) * REWARDS.level.perLevel;
function viejoGainXp(p, n) {
  p.xp += n;
  let up = false;
  while (p.level < REWARDS.level.max && p.xp >= xpForLevel(p.level)) {
    p.xp -= xpForLevel(p.level);
    p.level++;
    p.coins += REWARDS.levelUp.coins;
    p.stats.coinsEarned += REWARDS.levelUp.coins;
    up = true;
  }
  return up;
}
const viejoGainCoins = (p, n) => {
  p.coins += n;
  if (n > 0) p.stats.coinsEarned += n;
};
function viejoFinish(p, r) {
  const R = REWARDS.minigame,
    stars = Math.max(0, Math.min(3, r.stars));
  const coins = r.won ? R.win.coins + stars * R.perStar.coins : R.lose.coins;
  const xp = r.won ? R.win.xp + stars * R.perStar.xp : R.lose.xp;
  viejoGainCoins(p, coins);
  const leveledUp = viejoGainXp(p, xp);
  return { coins, xp, leveledUp, stars };
}

const PARTIDAS = [
  { level: 1, xp: 0, coins: 100, r: { won: true, stars: 3, score: 520 } },
  { level: 1, xp: 0, coins: 100, r: { won: false, stars: 0, score: 40 } },
  { level: 1, xp: 90, coins: 7, r: { won: true, stars: 1, score: 150 } },
  { level: 4, xp: 240, coins: 300, r: { won: true, stars: 2, score: 300 } },
  { level: 2, xp: 140, coins: 0, r: { won: true, stars: 5, score: 999 } },
  { level: 3, xp: 0, coins: 50, r: { won: false, stars: 2, score: 10 } },
  { level: 49, xp: 2490, coins: 9000, r: { won: true, stars: 3, score: 600 } },
  { level: 50, xp: 12, coins: 1, r: { won: true, stars: 2, score: 300 } },
  { level: 7, xp: 399, coins: 80, r: { won: true, stars: -1, score: 120 } },
];

const ok = await run('reglas', file, { hash: '#test', width: 1280, height: 800 }, async (t) => {
  await t.click('btn-jugar');
  await t.click('ed-done');
  await t.waitFor('window.__mc.store.getState().profile.created && !window.__mc.store.getState().panel');
  const LOGROS = await t.ev(`(() => {
    const s = window.__mc.store;
    window.__prep = (p) => s.setState((st) => ({ profile: { ...st.profile, ...p,
      stats: { ...st.profile.stats, coinsEarned: 0 } } }));
    return true;
  })()`);
  assert.ok(LOGROS);
  // los logros también pagan monedas: se marcan todos como ganados para medir solo el premio de la partida
  await t.ev(
    `window.__prep({ achievements: ${JSON.stringify(
      JSON.parse(readFileSync(resolve(raiz, 'shared/data/progress.json'), 'utf8')).achievements.map((a) => a.id),
    )} })`,
  );

  for (const [i, c] of PARTIDAS.entries()) {
    const nuevo = await t.ev(`(() => {
      const s = window.__mc.store;
      window.__prep({ level: ${c.level}, xp: ${c.xp}, coins: ${c.coins} });
      s.setState({ mg: { id: 'feria', run: ${i}, phase: 'playing', etapa: 0, modo: 'solo', origen: { kind: 'lobby' } } });
      s.getState().finishMinigame(${JSON.stringify({ ...c.r, label: `${c.r.score} pts` })});
      const { profile: p, mg } = s.getState();
      return { level: p.level, xp: p.xp, coins: p.coins, coinsEarned: p.stats.coinsEarned, rewards: mg.rewards, stars: mg.result.stars };
    })()`);
    const p = { level: c.level, xp: c.xp, coins: c.coins, stats: { coinsEarned: 0 } },
      v = viejoFinish(p, c.r);
    assert.deepEqual(
      nuevo,
      {
        level: p.level,
        xp: p.xp,
        coins: p.coins,
        coinsEarned: p.stats.coinsEarned,
        rewards: { coins: v.coins, xp: v.xp, leveledUp: v.leveledUp, newAchievements: [] },
        stars: v.stars,
      },
      `partida ${i}: ${JSON.stringify(c)}`,
    );
  }
  console.log(`PASA premios de ${PARTIDAS.length} partidas iguales a la lógica vieja`);

  // mundo: primera visita, recuerdo, moneda suelta y bono de viaje
  const mundo = await t.ev(`(() => {
    const s = window.__mc.store, g = () => s.getState(), foto = () => ({ coins: g().profile.coins, xp: g().profile.xp, level: g().profile.level });
    window.__prep({ level: 1, xp: 0, coins: 0, visited: [], collected: [] });
    const out = {};
    g().pickupCoin(); out.moneda = foto();
    g().collect('olancho'); out.recuerdo = foto();
    s.setState({ scene: { kind: 'viaje', veh: 'bus', to: 'olancho', from: 'franciscomorazan' } });
    g().llegarViaje(41.6); out.viaje = foto();
    g().goLobby();
    return out;
  })()`);
  const m = { level: 1, xp: 0, coins: 0, stats: { coinsEarned: 0 } },
    foto = () => ({ coins: m.coins, xp: m.xp, level: m.level });
  viejoGainCoins(m, REWARDS.world.coinPickup);
  const moneda = foto();
  viejoGainCoins(m, REWARDS.world.collectible.coins);
  viejoGainXp(m, REWARDS.world.collectible.xp);
  const recuerdo = foto();
  viejoGainCoins(m, Math.min(30, Math.round(41.6)));
  viejoGainCoins(m, REWARDS.world.firstVisit.coins);
  viejoGainXp(m, REWARDS.world.firstVisit.xp);
  assert.deepEqual(mundo, { moneda, recuerdo, viaje: foto() }, 'premios del mundo');
  console.log('PASA primera visita, recuerdo, moneda suelta y bono de viaje iguales a la lógica vieja');

  // metas y reloj de cada motor del kit contra TOPES
  const juegos = readdirSync(resolve(raiz, 'shared/data/catalogo'))
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) =>
      Object.entries(JSON.parse(readFileSync(resolve(raiz, 'shared/data/catalogo', f), 'utf8'))).flatMap(([dept, c]) =>
        c.juegos.map((j) => ({ id: `${dept}.${j[0]}`, motor: j[2], etapas: j[8] ?? 3, tema: j[7] ?? {} })),
      ),
    );
  let revisadas = 0;
  for (const [motor, tope] of Object.entries(TOPES)) {
    if (!tope.kit) continue;
    const j = juegos.find((x) => x.motor === motor);
    assert.ok(j, `${motor} no tiene juego en el catálogo`);
    for (const etapa of sinGpu ? [0] : [0, j.etapas - 1]) {
      await t.ev(`(() => {
        const s = window.__mc.store;
        s.getState().goLobby();
        s.setState((st) => ({ profile: { ...st.profile, juegos: { ...st.profile.juegos,
          ${JSON.stringify(j.id)}: { etapa: ${etapa}, stars: [], best: 0, label: '', veces: 0 } } } }));
        s.getState().startJuego(${JSON.stringify(j.id)});
      })()`);
      await t.waitFor(
        `window.__mcTest?.motor?.estado().id === ${JSON.stringify(motor)} && window.__mcTest.motor.estado().etapa === ${etapa}`,
      );
      const e = await t.ev('window.__mcTest.motor.estado()');
      const dif = difDe(e.etapa, e.etapas);
      assert.equal(e.etapas, j.etapas);
      assert.deepEqual(e.metas, tope.metas(dif), `${motor} etapa ${etapa}: metas`);
      assert.ok(Math.abs(e.duracion - tope.reloj(dif)) < 1e-9, `${motor} etapa ${etapa}: reloj ${e.duracion}`);
      revisadas++;
    }
  }
  await t.ev('window.__mc.store.getState().goLobby()');
  console.log(`PASA metas y reloj de ${revisadas} etapas de motores del kit iguales a TOPES`);

  // motores propios con metas en la intro: corte, ritmo y pesca dicen «N pts»; monta y ruta, segundos y estilo.
  // Ritmo y pesca dependen del tema: se revisan todos sus juegos. Las de ritmo en TOPES son una cota inferior.
  const metasIntro = async (j, etapa) => {
    await t.ev('window.__mc.store.getState().goLobby()');
    await t.waitFor(`!document.querySelector('[data-testid=mg-intro]')`);
    await t.ev(`(() => {
      const s = window.__mc.store;
      s.setState((st) => ({ profile: { ...st.profile, juegos: { ...st.profile.juegos,
        ${JSON.stringify(j.id)}: { etapa: ${etapa}, stars: [], best: 0, label: '', veces: 0 } } } }));
      s.getState().startJuego(${JSON.stringify(j.id)});
    })()`);
    await t.waitFor(
      `!!document.querySelector('[data-testid=mg-meta-2]') && window.__mc.store.getState().mg?.etapa === ${etapa}`,
    );
    return t.ev(
      `[0, 1, 2].map((i) => Number(document.querySelector('[data-testid=mg-meta-' + i + ']').innerText.match(/[\\d.]+/g).pop()))`,
    );
  };
  let propias = 0;
  for (const motor of ['corte', 'ritmo', 'pesca', 'monta', 'ruta']) {
    const deMotor = juegos.filter((x) => x.motor === motor);
    for (const j of ['ritmo', 'pesca'].includes(motor) ? deMotor : deMotor.slice(0, 1))
      for (const etapa of sinGpu ? [0] : [0, j.etapas - 1]) {
        const intro = await metasIntro(j, etapa),
          dif = difDe(etapa, j.etapas),
          tope = TOPES[motor];
        if (motor === 'monta') {
          // «Aguantar N s», «m2 pts de estilo», «m3 pts de estilo»
          const [, m2, m3] = tope.metas(dif, j.tema);
          assert.deepEqual([intro[1], intro[2]], [m2, m3], `${j.id} etapa ${etapa}: estilo`);
          assert.equal(tope.duracionMin({ puntos: 0, dif, gano: true }), intro[0], `${j.id}: aguantar`);
        } else if (motor === 'ruta') {
          // «Llegar a la meta en TL s»: perder es agotar ese reloj
          assert.equal(tope.duracionMin({ puntos: 0, dif, gano: false }), intro[0], `${j.id}: límite`);
        } else {
          const m = tope.metas(dif, j.tema);
          if (motor === 'ritmo')
            m.forEach((x, i) => assert.ok(x <= intro[i], `${j.id} etapa ${etapa}: meta ${i} ${x} > ${intro[i]}`));
          else assert.deepEqual(m, intro, `${j.id} etapa ${etapa}: metas`);
        }
        propias++;
      }
  }
  await t.ev('window.__mc.store.getState().goLobby()');
  console.log(`PASA metas de ${propias} etapas de corte, ritmo, pesca, monta y ruta cuadran con TOPES`);
  assert.equal(t.errors.length, 0, 'Sin excepciones ni red no permitida');
});
process.exitCode = ok ? 0 : 1;
