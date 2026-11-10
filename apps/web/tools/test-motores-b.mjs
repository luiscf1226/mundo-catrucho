// Prueba de los motores pesca / atrapa / cocina: juega de verdad una etapa de cada uno (catálogo y sin tema), hasta mg-result.
//   node tools/test-motores-b.mjs [html] [carpeta-capturas]
import { run } from './harness.mjs';

const file = process.argv[2] || '/tmp/claude-1000/mc-mot-b/mundo-catrucho-hd.html';
const shots = process.argv[3] || '/tmp/claude-1000/mc-mot-b/capturas';
const assert = (v, m) => {
  if (!v) throw Error(m);
};
const st = (t, m) => t.ev(`window.__mcTest.${m}.state()`);
const MG = `window.__mc.store.getState()`;

async function abre(t, { juego, motor, modo }) {
  await t.waitFor(`!!window.__mc`);
  if (modo) await t.ev(`${MG}.setModo('${modo}')`);
  await t.ev(juego ? `${MG}.startJuego('${juego}')` : `${MG}.startMinigame('${motor}')`);
  await t.waitFor(`!!document.querySelector('[data-testid=mg-intro]')`, 15000, 'tarjeta de inicio');
  const intro = await t.text('mg-intro');
  assert(/\S/.test(intro || ''), 'tarjeta de inicio vacía');
  await t.click('mg-start');
  await t.waitFor(`${MG}.mg?.phase==='playing'`, 8000, 'fase playing');
  await t.waitFor(`!!window.__mcTest?.${motor}`, 5000, `gancho __mcTest.${motor}`);
  return intro;
}
async function termina(t, motor) {
  await t.ev(`window.__mcTest.${motor}.skip(9999)`);
  await t.waitFor(`!!document.querySelector('[data-testid=mg-result]')`, 8000, 'mg-result');
  const mg = (await t.state()).mg;
  assert(mg.result && typeof mg.result.score === 'number', 'sin resultado');
  return mg.result;
}
const sinErrores = async (t) => {
  assert(!t.errors.length, `errores de consola: ${t.errors.slice(0, 3).join(' | ')}`);
};

// ------------------------------------------------------------------ atrapa
async function atrapa(t, { prefer = 'malo', segs = 12 } = {}) {
  const fin = Date.now() + segs * 1000;
  while (Date.now() < fin) {
    const s = await st(t, 'atrapa');
    const bajos = s.items.filter((i) => i.y > 1.35).sort((a, b) => a.y - b.y);
    const buenos = bajos.filter((i) => i.kind !== 'malo'),
      malos = bajos.filter((i) => i.kind === 'malo');
    const meta = prefer === 'malo' && s.golpes === 0 && malos[0] ? malos[0] : buenos[0];
    if (meta) await t.ev(`window.__mc.player.teleport(${meta.x},0,${meta.z})`);
    await t.sleep(50);
  }
}
async function pruebaAtrapa(nombre, opts, hash = '#test,go') {
  if (process.env.SOLO && !nombre.includes(process.env.SOLO)) return true;
  return run(nombre, file, { hash }, async (t) => {
    if (opts.tema) await t.ev(`window.__mcTema = ${JSON.stringify({ atrapa: opts.tema })}`);
    await abre(t, opts);
    // movimiento real con el teclado
    const x0 = (await st(t, 'atrapa')).player[0];
    await t.hold('d', 500);
    const x1 = (await st(t, 'atrapa')).player[0];
    assert(x1 > x0 + 0.5, 'WASD no mueve al jugador');
    await atrapa(t, { prefer: opts.golpe ? 'malo' : 'bueno', segs: opts.golpe ? 30 : 12 });
    const s = await st(t, 'atrapa');
    assert(s.atrapadas > 0, 'no atrapó nada');
    if (opts.golpe) assert(s.golpes > 0, 'lo malo no lo golpeó');
    if (opts.modo === 'duo' || opts.modo === 'abierto') assert(s.bots.length >= 1, 'faltan los bots');
    if (opts.shot) {
      await atrapa(t, { prefer: 'bueno', segs: 2 });
      await t.shot(`${shots}/${opts.shot}.png`);
    }
    console.log(
      ' ',
      nombre,
      'estado',
      JSON.stringify({
        score: s.score,
        atrapadas: s.atrapadas,
        golpes: s.golpes,
        mejor: s.best,
        meta: s.meta,
        bots: s.bots,
      }),
    );
    if (!opts.sinFin) {
      const r = await termina(t, 'atrapa');
      console.log('  resultado', JSON.stringify(r));
      assert(r.score > 0, 'puntaje 0');
    }
    await sinErrores(t);
  });
}

// ------------------------------------------------------------------ cocina
async function pruebaCocina(nombre, opts, hash = '#test,go') {
  if (process.env.SOLO && !nombre.includes(process.env.SOLO)) return true;
  return run(nombre, file, { hash }, async (t) => {
    if (opts.tema) await t.ev(`window.__mcTema = ${JSON.stringify({ cocina: opts.tema })}`);
    await abre(t, opts);
    const bins = await t.ev(`window.__mcTest.cocina.bins`),
      slots = await t.ev(`window.__mcTest.cocina.slots`);
    assert(bins.length >= 2, 'faltan recipientes');
    const ve = (k) => bins.find((b) => b.k === k);
    const ir = async (x, z) => {
      await t.ev(`window.__mc.player.teleport(${x},0,${z})`);
      await t.sleep(170);
    };
    await t.waitFor(`window.__mcTest.cocina.state().pedido`, 15000, 'primer pedido');
    // paso equivocado a propósito: pierde tiempo y al perro se le cae algo
    let s = await st(t, 'cocina');
    const mal = bins.find((b) => b.k !== s.pedido.seq[0]);
    await ir(mal.pos[0], mal.pos[2] + 1);
    await t.press('e');
    await t.sleep(200);
    s = await st(t, 'cocina');
    assert(s.errores === 1 && s.prog === 0, 'el paso equivocado no se penalizó');
    assert(s.drops > 0, 'no cayó nada para el perro');
    await t.sleep(1500);
    s = await st(t, 'cocina');
    assert(
      s.perro === 'corre' || s.perro === 'come' || Math.hypot(s.perroPos[0] - 8.6, s.perroPos[1] - 1.6) > 0.3,
      'el perro no reaccionó',
    );
    await t.sleep(1000);
    let servidos = 0;
    for (let o = 0; o < (opts.pedidos ?? 2); o++) {
      await t.waitFor(
        `window.__mcTest.cocina.state().pedido && !window.__mcTest.cocina.state().listo`,
        20000,
        'pedido nuevo',
      );
      const ped = (await st(t, 'cocina')).pedido;
      for (let i = 0; i < ped.seq.length; i++) {
        const b = ve(ped.seq[i]);
        await ir(b.pos[0], b.pos[2] + 1);
        await t.press('e');
        await t.sleep(120);
        s = await st(t, 'cocina');
        assert(s.prog === i + 1 || s.listo, `paso ${ped.seq[i]} no avanzó (prog ${s.prog})`);
        if (opts.shot && o === 0 && i === Math.min(2, ped.seq.length - 1)) {
          await t.sleep(350);
          await t.shot(`${shots}/${opts.shot}.png`);
        }
      }
      s = await st(t, 'cocina');
      assert(s.listo, 'el plato no quedó listo');
      await ir(slots[ped.slot], -3.2);
      await t.press('e');
      await t.sleep(200);
      s = await st(t, 'cocina');
      assert(s.servidos === ++servidos, 'no se entregó el pedido');
    }
    s = await st(t, 'cocina');
    assert(s.score > 0, 'sin puntos');
    await t.ev(`window.__mcTest.cocina.envejece?.()`);
    await t.sleep(300);
    console.log(
      ' ',
      nombre,
      'estado',
      JSON.stringify({
        score: s.score,
        servidos: s.servidos,
        errores: s.errores,
        perro: s.perro,
        meta: s.meta,
        rivales: s.rivales,
        compa: s.compa,
      }),
    );
    if (!opts.sinFin) {
      const r = await termina(t, 'cocina');
      console.log('  resultado', JSON.stringify(r));
    }
    await sinErrores(t);
  });
}

// ------------------------------------------------------------------ pesca
async function pruebaPesca(nombre, opts, hash = '#test,go') {
  if (process.env.SOLO && !nombre.includes(process.env.SOLO)) return true;
  return run(nombre, file, { hash }, async (t) => {
    if (opts.tema) await t.ev(`window.__mcTema = ${JSON.stringify({ pesca: opts.tema })}`);
    await abre(t, opts);
    let s = await st(t, 'pesca'),
      fotos = false,
      vistos = new Set();
    for (let intento = 0; intento < 14 && !(s.n + s.basura > 0 && (!opts.dos || s.n + s.basura > 1)); intento++) {
      await t.up('f');
      await t.waitFor(`['idle'].includes(window.__mcTest.pesca.state().fase)`, 8000, 'volver a idle');
      await t.sleep(150);
      await t.down('f');
      await t.sleep(300 + Math.random() * 700);
      await t.up('f'); // cargar y lanzar
      if (opts.shot && !fotos) {
        /* la captura del lanzamiento se toma abajo */
      }
      try {
        await t.waitFor(`['pica','idle'].includes(window.__mcTest.pesca.state().fase)`, 12000, 'picada');
      } catch {
        continue;
      }
      s = await st(t, 'pesca');
      if (s.fase !== 'pica') continue;
      vistos.add('pica');
      await t.down('f'); // enganchar y mantener
      try {
        await t.waitFor(`['jala','idle'].includes(window.__mcTest.pesca.state().fase)`, 2500, 'enganche');
      } catch {
        /* sigue */
      }
      for (let i = 0; i < 700; i++) {
        s = await st(t, 'pesca');
        vistos.add(s.fase);
        if (s.fase !== 'jala') break;
        if (opts.shot && !fotos && s.dist < 0.7) {
          fotos = true;
          await t.shot(`${shots}/${opts.shot}.png`);
        }
        if (s.tension < 0.58 && !s.tiron && (!s.aviso || s.tension < 0.4)) await t.down('f');
        else await t.up('f');
        await t.sleep(35);
      }
      await t.up('f');
      await t.sleep(300);
      s = await st(t, 'pesca');
    }
    assert(vistos.has('pica') && vistos.has('jala'), `no llegó a enganchar: ${[...vistos]}`);
    assert(s.n + s.basura > 0, 'no sacó nada del agua');
    if (opts.shot && !fotos) await t.shot(`${shots}/${opts.shot}.png`);
    console.log(
      ' ',
      nombre,
      'estado',
      JSON.stringify({
        score: s.score,
        peces: s.n,
        basura: s.basura,
        perdidos: s.perdidos,
        agua: s.agua,
        desde: s.desde,
        meta: s.meta,
        rivales: s.rivales,
      }),
    );
    if (!opts.sinFin) {
      const r = await termina(t, 'pesca');
      console.log('  resultado', JSON.stringify(r));
    }
    await sinErrores(t);
  });
}

const peces = [
  ['Mojarra', 15, '#9ec7e8'],
  ['Tilapia', 30, '#e57373'],
  ['Pargo rojo', 55, '#e53935'],
  ['Pez vela', 90, '#3f6fd1'],
];
const res = [];
res.push(await pruebaAtrapa('atrapa-catalogo-mangos', { juego: 'comayagua.mangos', motor: 'atrapa', golpe: true }));
res.push(await pruebaAtrapa('atrapa-catalogo-cafe-duo', { juego: 'lapaz.cortecafe', motor: 'atrapa', modo: 'duo' }));
res.push(await pruebaAtrapa('atrapa-sin-tema', { motor: 'atrapa', modo: 'solo' }));
res.push(
  await pruebaCocina('cocina-catalogo-baleadas', { juego: 'franciscomorazan.baleadas', motor: 'cocina', modo: 'duo' }),
);
res.push(
  await pruebaCocina('cocina-catalogo-alfombras', {
    juego: 'comayagua.alfombras',
    motor: 'cocina',
    modo: 'solo',
    pedidos: 1,
  }),
);
res.push(await pruebaCocina('cocina-sin-tema', { motor: 'cocina', modo: 'abierto', pedidos: 1 }));
res.push(await pruebaPesca('pesca-sin-tema', { motor: 'pesca', modo: 'solo' }));
res.push(
  await pruebaPesca('pesca-tema-mar-lancha-duo', {
    motor: 'pesca',
    modo: 'duo',
    tema: { agua: 'mar', desde: 'lancha', peces, basura: ['Llanta', 'Bota vieja'], frases: ['¡Qué pique!'] },
  }),
);
res.push(
  await pruebaPesca('pesca-tema-rio-orilla-abierto', {
    motor: 'pesca',
    modo: 'abierto',
    tema: { agua: 'rio', desde: 'orilla', peces },
  }),
);
// vistas con GPU real (sin #test) para las capturas
res.push(
  await pruebaAtrapa(
    'captura-atrapa-mangos',
    { juego: 'comayagua.mangos', motor: 'atrapa', shot: 'atrapa-mangos', sinFin: true },
    '#go',
  ),
);
res.push(
  await pruebaAtrapa(
    'captura-atrapa-lluvia-de-peces',
    {
      motor: 'atrapa',
      modo: 'abierto',
      shot: 'atrapa-peces',
      sinFin: true,
      tema: {
        fondo: 'pueblo',
        con: 'balde',
        cae: [
          ['Sardina', 'pez', '#b0bec5'],
          ['Bagre', 'pez', '#8d6e63'],
        ],
        evita: [['Piedra', 'piedra']],
      },
    },
    '#go',
  ),
);
res.push(
  await pruebaCocina(
    'captura-cocina-baleadas',
    {
      juego: 'franciscomorazan.baleadas',
      motor: 'cocina',
      modo: 'duo',
      pedidos: 1,
      shot: 'cocina-baleadas',
      sinFin: true,
    },
    '#go',
  ),
);
res.push(
  await pruebaCocina(
    'captura-cocina-alfombras',
    { juego: 'comayagua.alfombras', motor: 'cocina', modo: 'solo', pedidos: 1, shot: 'cocina-alfombras', sinFin: true },
    '#go',
  ),
);
res.push(await pruebaPesca('captura-pesca-muelle', { motor: 'pesca', shot: 'pesca-muelle', sinFin: true }, '#go'));
res.push(
  await pruebaPesca(
    'captura-pesca-lancha-mar',
    { motor: 'pesca', modo: 'duo', shot: 'pesca-lancha', sinFin: true, tema: { agua: 'mar', desde: 'lancha', peces } },
    '#go',
  ),
);
const ok = res.every(Boolean);
console.log(ok ? 'PASA test-motores-b' : 'NO PASA test-motores-b');
process.exit(ok ? 0 : 1);
