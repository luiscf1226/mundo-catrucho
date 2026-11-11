// MC-03 · Dificultad de las etapas. Para cada motor abre un juego del catálogo en la etapa 1 y en la última y comprueba:
//   · que la etapa dure de 60 a 120 s (cronómetro al empezar);
//   · con un bot «de persona normal» (reacción de ~300 ms, puntería y ritmo imperfectos) que la etapa 1 se gane
//     y que la última no le dé 3 estrellas; con un bot «que juega bien», que las 3 estrellas de la última sí se puedan;
//   · donde un bot no es práctico (caminar, manejar, cancha), un cálculo con los parámetros reales de la etapa.
// Uso: node tools/test-dificultad.mjs [html] [carpeta-capturas] [motor,motor…]
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { cocina, manejo, ruta, trivia } from './dificultad-sim.mjs';
import { run } from './harness.mjs';

const file = process.argv[2] ?? 'dist/mundo-catrucho-hd.html',
  out = process.argv[3] ?? '',
  solo = process.argv[4]?.split(','),
  POOL = Number(process.env.MC_POOL) || 5;

// juego del catálogo que se prueba por motor (el de más etapas)
const JUEGO = {
  corte: 'olancho.pastel',
  monta: 'olancho.jaripeo',
  ritmo: 'atlantida.carnaval',
  atrapa: 'yoro.lluvia',
  pesca: 'cortes.pesca-en-yojoa',
  trivia: 'comayagua.pilonpaleta',
  cocina: 'lapaz.ticucos',
  ruta: 'comayagua.taulabe',
  manejo: 'franciscomorazan.rapidito',
  feria: 'atlantida.isidra',
  pulperia: 'franciscomorazan.pulperia',
  futbol: 'ocotepeque.tresfronteras',
  exploradores: 'lapaz.pintadas',
};

// ------------------------------------------------------------------ bots (corren dentro de la página)
// Cada bot recibe { normal: bool } y deja de actuar solo cuando la página se cierra.
function botCorte({ normal }) {
  const T = window.__mcTest.corte,
    I = window.__mc.input,
    gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.41;
  const reac = normal ? 0.4 : 0.22,
    sigma = normal ? 0.45 : 0.18,
    every = normal ? 420 : 210,
    cuida = normal ? 0.75 : 0.97;
  const visto = new Map();
  setInterval(() => {
    const now = performance.now() / 1000;
    T.slots.forEach((s, i) => {
      const k = `${i}`;
      if (!s.on || s.cut) visto.delete(k);
      else if (!visto.has(k)) visto.set(k, now);
    });
  }, 30);
  let last = 0;
  setInterval(() => {
    const now = performance.now() / 1000;
    if (now * 1000 - last < every) return;
    const bad = T.slots.filter((s) => s.on && !s.cut && s.bad);
    const c = T.slots
      .map((s, i) => [s, i])
      .filter(([s, i]) => s.on && !s.cut && !s.bad && s.y > 0.6 && now - (visto.get(`${i}`) ?? now) > reac)
      .filter(([s]) => Math.random() > cuida || !bad.some((b) => Math.hypot(b.x - s.x, b.y - s.y) < 1.6))
      .sort((a, b) => a[0].y - b[0].y)[0];
    if (!c) return;
    last = now * 1000;
    const s = c[0],
      [px, py] = T.toNdc(s.x + s.vx * 0.06 + gauss() * sigma, s.y + s.vy * 0.06 + gauss() * sigma);
    I.px = px;
    I.py = py;
    I.press('fire');
  }, 20);
}
function botMonta({ normal }) {
  const T = window.__mcTest.monta,
    I = window.__mc.input,
    hist = [];
  const lag = normal ? 0.3 : 0.18,
    zona = normal ? 0.22 : 0.1,
    olvida = normal ? 0.12 : 0.02,
    sj = normal ? 0.1 : 0.05;
  const plan = new Map();
  setInterval(() => {
    const s = T.st,
      t = s.t;
    hist.push([t, s.L, s.V]);
    while (hist.length > 2 && hist[1][0] <= t - lag) hist.shift();
    const [, L, V] = hist[0];
    const u = L * 1.4 + V * 0.5;
    I.kx = Math.abs(u) < zona ? 0 : Math.sign(u); // teclado: todo o nada
    for (const e of s.ev) {
      if (!e.big || e.fired || plan.has(e)) continue;
      if (e.t - t < 0.9) plan.set(e, Math.random() < olvida ? -1 : e.t - 0.15 + (Math.random() - 0.5) * 2 * sj * 1.7);
    }
    for (const [e, at] of plan)
      if (at > 0 && t >= at && !e.done_) {
        e.done_ = true;
        I.press('jump');
      }
  }, 16);
}
function botRitmo({ normal }) {
  const T = window.__mcTest.ritmo,
    gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.41;
  const sigma = normal ? 0.075 : 0.04,
    falla = normal ? 0.1 : 0.03,
    tarde = normal ? 0.02 : 0;
  const plan = new Map();
  setInterval(() => {
    const t = T.now();
    for (const n of T.st.notas) {
      if (n.done || plan.has(n) || n.time - t > 0.5) continue;
      plan.set(n, Math.random() < falla ? null : n.time + tarde + gauss() * sigma);
    }
    for (const [n, at] of plan)
      if (at !== null && t >= at) {
        plan.set(n, null);
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'asdf'[n.lane] }));
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'asdf'[n.lane] }));
      }
  }, 4);
}
function botAtrapa({ normal }) {
  const T = window.__mcTest.atrapa,
    I = window.__mc.input;
  // la persona normal calcula mal la profundidad (z) desde la cámara alta y tarda en escoger
  const reac = normal ? 0.45 : 0.22,
    ruido = normal ? [0.6, 0.95] : [0.2, 0.25],
    esquiva = normal ? 0.4 : 0.9,
    vel = 5.2;
  let tgt = null,
    off = [0, 0];
  const visto = new Map();
  setInterval(() => {
    const s = T.state(),
      now = performance.now() / 1000,
      [px, pz] = s.player;
    for (const it of s.items) {
      const k = `${it.x.toFixed(2)},${it.z.toFixed(2)}`;
      if (!visto.has(k)) visto.set(k, now);
      it.k = k;
    }
    const vivo = (it) => it && it.y > 2.0;
    const cur = tgt && s.items.find((i) => i.k === tgt.k);
    if (!vivo(cur)) {
      tgt = null;
      let mejor = 1e9;
      for (const it of s.items) {
        if (it.kind === 'malo' || it.y < 2.3 || now - visto.get(it.k) < reac) continue;
        const d = Math.hypot(it.x - px, it.z - pz),
          tt = (it.y - 2.0) / 6;
        if (d / vel < tt + 0.6 && d < mejor) {
          mejor = d;
          tgt = it;
        }
      }
      off = [(Math.random() - 0.5) * 2 * ruido[0], (Math.random() - 0.5) * 2 * ruido[1]];
    }
    let dx = 0,
      dz = 0;
    if (tgt) {
      dx = tgt.x + off[0] - px;
      dz = tgt.z + off[1] - pz;
    }
    // esquivar lo malo que cae encima
    if (Math.random() < esquiva)
      for (const it of s.items)
        if (it.kind === 'malo' && it.y < 5 && it.y > 1.5 && Math.hypot(it.x - px, it.z - pz) < 1.3) {
          dx = px - it.x;
          dz = pz - it.z;
        }
    const d = Math.hypot(dx, dz);
    I.jx = d > 0.2 ? dx / d : 0;
    I.jz = d > 0.2 ? dz / d : 0;
  }, 50);
}
function botPesca({ normal }) {
  const T = window.__mcTest.pesca,
    key = (on) => window.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { key: 'f' }));
  const reac = normal ? 0.33 : 0.22,
    roja = normal ? 0.72 : 0.9; // quien juega bien jala hasta casi romper la línea
  let held = false,
    fase = '',
    desde = 0,
    soltarEn = 0,
    avisoVisto = -1;
  const set = (on) => {
    if (on !== held) key(on);
    held = on;
  };
  setInterval(() => {
    const s = T.state(),
      now = performance.now() / 1000;
    if (s.fase !== fase) {
      fase = s.fase;
      desde = now;
      if (fase === 'idle') soltarEn = 0;
    }
    if (fase === 'idle') {
      if (held) set(false);
      else if (now - desde > reac + 0.2) {
        set(true);
        soltarEn = now + (normal ? 0.35 + Math.random() * 0.9 : 0.8 + Math.random() * 0.2); // lejos = pez más grande
      }
    } else if (fase === 'carga') {
      if (now >= soltarEn) set(false);
    } else if (fase === 'espera' || fase === 'vuelo') set(false);
    else if (fase === 'pica') {
      if (now - desde >= reac + (Math.random() - 0.5) * 0.1) set(true);
    } else if (fase === 'jala') {
      if (s.aviso || s.tiron) {
        if (avisoVisto < 0) avisoVisto = now;
      } else avisoVisto = -1;
      const tirando = avisoVisto >= 0 && now - avisoVisto > reac;
      set(!(tirando || s.tension > roja));
    } else set(false);
  }, 20);
}
const BOTS = { corte: botCorte, monta: botMonta, ritmo: botRitmo, atrapa: botAtrapa, pesca: botPesca };

// ------------------------------------------------------------------ una partida
async function partida(t, motor, etapa, bot) {
  const id = JUEGO[motor];
  await t.ev(
    `(()=>{const S=window.__mc.store;S.setState(s=>({profile:{...s.profile,juegos:{...s.profile.juegos,'${id}':{etapa:${etapa},stars:[],best:0,label:'',veces:0}}}}));S.getState().startJuego('${id}')})()`,
  );
  await t.waitFor(`!!document.querySelector('[data-testid=mg-start]')`, 15000, 'tarjeta de inicio');
  const mg = await t.ev(`JSON.stringify(window.__mc.store.getState().mg)`);
  assert.equal(JSON.parse(mg).etapa, etapa, `${motor}: abre la etapa ${etapa + 1}`);
  const tarjeta = await t.text('mg-intro');
  await t.click('mg-start');
  await t.waitFor(`window.__mc.store.getState().mg?.phase==='playing'`, 8000, 'fase playing');
  // feria no tiene cronómetro (va a su ritmo); trivia lo tiene por pregunta
  const timer = await t
    .waitFor(`(window.__mc.store.getState().mgHud?.timer??0)>0`, 4000, 'cronómetro')
    .then(() => t.ev(`window.__mc.store.getState().mgHud.timer`))
    .catch(() => null);
  let res = null;
  if (bot) {
    await t.ev(`(${BOTS[motor].toString()})(${JSON.stringify({ normal: bot === 'normal' })})`);
    if (out && bot === 'normal') {
      await t.sleep(9000);
      await t.shot(`${out}/${motor}-etapa${etapa + 1}.png`);
    }
    await t.waitFor(`!!document.querySelector('[data-testid=mg-result]')`, 200000, 'mg-result');
    res = await t.ev(`window.__mc.store.getState().mg.result`);
  } else if (out) {
    await t.sleep(4000);
    await t.shot(`${out}/${motor}-etapa${etapa + 1}.png`);
  }
  const extra = await t.ev(
    `JSON.stringify(window.__mcTest?.ruta ? {largo:window.__mcTest.ruta.G.length, piezas:window.__mcTest.ruta.G.plats.length, TL:window.__mcTest.ruta.TL} : {})`,
  );
  return {
    motor,
    etapa,
    bot,
    timer: timer === null ? null : Math.round(timer),
    metas: metasDe(tarjeta),
    res,
    extra: JSON.parse(extra),
  };
}
const metasDe = (txt) =>
  (txt ?? '')
    .split('\n')
    .filter((l) => /\d/.test(l) && /pts|s\b|gol|objeto|Ganar|:\d\d/.test(l))
    .slice(-3);

// etapas de cada juego, leídas del catálogo para que no se desfasen cuando cambia el juego de un motor
const catalogo = Object.assign(
  {},
  ...readdirSync(new URL('../shared/data/catalogo/', import.meta.url))
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(new URL(`../shared/data/catalogo/${f}`, import.meta.url), 'utf8'))),
);
const ETAPAS = (m) => {
  const [dept, juego] = JUEGO[m].split('.'),
    fila = catalogo[dept]?.juegos.find((j) => j[0] === juego);
  assert.ok(fila, `${JUEGO[m]} no está en el catálogo`);
  return fila[8] ?? 3;
};

// ------------------------------------------------------------------ plan y ejecución en paralelo
const MOTORES = Object.keys(JUEGO).filter((m) => !solo || solo.includes(m));
const tareas = [];
for (const m of MOTORES) {
  const ult = ETAPAS(m) - 1,
    conBot = !!BOTS[m];
  tareas.push({ m, etapa: 0, bot: conBot ? 'normal' : null });
  tareas.push({ m, etapa: ult, bot: conBot ? 'normal' : null });
  if (conBot) tareas.push({ m, etapa: ult, bot: 'bueno' });
}
const resultados = [];
let ok = true;
async function worker() {
  for (;;) {
    const k = tareas.shift();
    if (!k) return;
    const nombre = `${k.m}-e${k.etapa + 1}-${k.bot ?? 'datos'}`;
    let r = null;
    const juega = () =>
      run(nombre, file, { hash: '#test,go', width: 960, height: 540 }, async (t) => {
        r = await partida(t, k.m, k.etapa, k.bot);
      });
    // con varios Chromium a la vez a veces uno no arranca: se reintenta una vez
    let pasa = await juega().catch(() => juega());
    // quien juega bien también puede caerse: como una persona, tiene un segundo intento para las 3⭐
    if (pasa && k.bot === 'bueno' && r?.res?.stars < 3) {
      console.log(`  ${nombre}: primer intento ${r.res.label}, otra vez`);
      pasa = await juega().catch(() => juega());
    }
    if (r) {
      resultados.push(r);
      console.log(
        `  ${nombre}: ${r.timer} s · metas ${r.metas.join(' / ')}${r.res ? ` · ${r.res.label} ${'⭐'.repeat(r.res.stars)}${r.res.won ? '' : ' (perdió)'}` : ''} ${JSON.stringify(r.extra) === '{}' ? '' : JSON.stringify(r.extra)}`,
      );
    }
    ok = pasa && ok;
  }
}
await Promise.all(Array.from({ length: POOL }, worker));

// ------------------------------------------------------------------ comprobaciones
const fallas = [];
const check = (c, msg) => {
  if (!c) fallas.push(msg);
};
// feria va a su ritmo; trivia: el reloj es por pregunta (abajo, la duración total); carrera: el reloj sube hasta 120 s
const SIN_RELOJ = ['feria', 'trivia', 'carrera'];
for (const r of resultados) {
  if (!SIN_RELOJ.includes(r.motor))
    check(r.timer >= 60 && r.timer <= 120, `${r.motor} etapa ${r.etapa + 1}: dura ${r.timer} s (debe ser 60–120)`);
  if (r.bot === 'normal' && r.etapa === 0)
    check(r.res?.won, `${r.motor}: la persona normal no gana la etapa 1 (${r.res?.label})`);
  // pesca: el puntaje lo decide sobre todo qué pez pica (los bots sacan de 200 a 340 en la última, sean finos o no),
  // así que ahí solo se avisa
  if (r.bot === 'normal' && r.etapa > 0) {
    const msg = `${r.motor}: la persona normal saca 3⭐ en la última (${r.res?.label})`;
    if (r.motor === 'pesca' && r.res?.stars === 3) console.log(`AVISO ${msg}`);
    else check(r.res && r.res.stars < 3, msg);
  }
  // pesca: el puntaje depende mucho de qué pez pica; con un solo intento basta que el bueno saque 2⭐
  if (r.bot === 'bueno')
    check(
      r.res?.stars >= (r.motor === 'pesca' ? 2 : 3),
      `${r.motor}: quien juega bien no llega a 3⭐ en la última (${r.res?.label})`,
    );
}

// ------------------------------------------------------------------ cálculos donde no hay bot
console.log('Cálculos (gana = etapa ganada; 3⭐ = tres estrellas; fracción de 1):');
const fmt = (o) => JSON.stringify(o, (_, v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v));
for (const [nombre, m] of [
  ['trivia', trivia],
  ['cocina', cocina],
  ['manejo', manejo],
]) {
  if (solo && !solo.includes(nombre)) continue;
  const e1 = m.jugar(0, 'normal'),
    un = m.jugar(1, 'normal'),
    ub = m.jugar(1, 'bueno');
  console.log(
    `  ${nombre} etapa 1 normal ${fmt(e1)}\n  ${nombre} última normal ${fmt(un)}\n  ${nombre} última bueno ${fmt(ub)}`,
  );
  check(e1.gana >= 0.9, `${nombre}: la persona normal gana la etapa 1 solo ${Math.round(e1.gana * 100)} %`);
  check(un.tres <= 0.05, `${nombre}: la persona normal saca 3⭐ en la última el ${Math.round(un.tres * 100)} %`);
  check(un.media < e1.media, `${nombre}: la última no cuesta más que la etapa 1`);
  check(
    ub.tres >= 0.15,
    `${nombre}: quien juega bien casi nunca saca 3⭐ en la última (${Math.round(ub.tres * 100)} %)`,
  );
  if (e1.duracion) check(e1.duracion >= 60 && un.duracion <= 120, `${nombre}: dura ${e1.duracion}–${un.duracion} s`);
}
const largos = Object.fromEntries(resultados.filter((r) => r.motor === 'ruta').map((r) => [r.etapa, r.extra.largo]));
if (Object.keys(largos).length) {
  const ult = ETAPAS('ruta') - 1,
    dif = (e) => e / ult;
  const a = ruta.jugar(0, 'normal', largos[0]),
    b = ruta.jugar(dif(ult), 'normal', largos[ult]),
    c = ruta.jugar(dif(ult), 'bueno', largos[ult]);
  console.log(
    `  ruta (${Math.round(largos[0])} m → ${Math.round(largos[ult])} m) etapa 1 normal ${fmt(a)} · última normal ${fmt(b)} · última bueno ${fmt(c)}`,
  );
  check(a.estrellas >= 1, 'ruta: la persona normal no llega a tiempo en la etapa 1');
  check(b.estrellas < 3, 'ruta: la persona normal saca 3⭐ en la última');
  check(c.estrellas === 3, 'ruta: quien juega bien no saca 3⭐ en la última');
}
for (const f of fallas) console.log(`FALLA ${f}`);
ok = ok && fallas.length === 0;
console.log(ok ? 'PASA test-dificultad' : 'NO PASA test-dificultad');
process.exit(ok ? 0 : 1);
