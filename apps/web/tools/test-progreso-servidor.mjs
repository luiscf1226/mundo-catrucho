// MC-15, MC-16 y MC-17 de punta a punta contra el Convex de desarrollo: etapas, visitas y marcas al cerrar la
// partida, misiones del día, logros, clasificación con jugadores de verdad y el avance local que sube sin premios.
// Sin .env.local imprime SALTA. No la corras contra producción. Borra a sus invitados al terminar.
//   node apps/web/tools/test-progreso-servidor.mjs        (deja capturas en capturas/mc-17/)
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference as ref } from 'convex/server';
import { raiz } from '../../../scripts/catalogo.mjs';
import { run } from './harness.mjs';

const envPath = join(raiz, '.env.local');
if (!existsSync(envPath)) {
  console.log('SALTA progreso-servidor: no hay .env.local');
  process.exit(0);
}
const { CONVEX_URL } = parseEnv(readFileSync(envPath, 'utf8'));
if (!CONVEX_URL) throw new Error('Falta CONVEX_URL en .env.local');
const capturas = join(raiz, 'capturas/mc-17');
const out = mkdtempSync(join(tmpdir(), 'mc-progreso-'));
const convex = new ConvexHttpClient(CONVEX_URL, { logger: false });
const datos = (f) => JSON.parse(readFileSync(join(raiz, 'apps/web/shared/data', f), 'utf8'));
const { achievements: LOGROS, missions: MISIONES } = datos('progress.json');
const R = datos('rewards.json');
const coins = (id) => LOGROS.find((l) => l.id === id).coins;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fn = {
  entrar: ref('tienda:entrar'),
  perfil: ref('tienda:miPerfil'),
  abrir: ref('partidas:abrirPartida'),
  cerrar: ref('partidas:cerrarPartida'),
  estado: ref('progreso:estado'),
  visitar: ref('progreso:visitar'),
  recoger: ref('progreso:recoger'),
  monedas: ref('progreso:recogerMonedas'),
  emote: ref('progreso:registrarEmote'),
  cobrar: ref('progreso:cobrarMision'),
  salir: ref('progreso:salirDeViaje'),
  llegar: ref('progreso:llegarViaje'),
  porJuego: ref('clasificacion:porJuego'),
  porDepto: ref('clasificacion:porDepto'),
};
const m = (f, args) => convex.mutation(f, args);
const q = (f, args) => convex.query(f, args);
const nuevo = () => randomBytes(32).toString('hex');
/** Abre una partida, deja pasar `seg` segundos de verdad (la duración la mide el servidor) y la cierra. */
async function partida(invitado, { motor, juegoId, etapa = 0, seg, puntos, estrellas, gano }) {
  const a = await m(fn.abrir, { invitado, motor, etapa, ...(juegoId ? { juegoId } : {}) });
  assert(a.ok, `abrir ${juegoId ?? motor}: ${a.motivo}`);
  await sleep(seg * 1000);
  return m(fn.cerrar, { invitado, partidaId: a.id, puntos, estrellas, gano });
}
/** Hace lo que pida una misión del día (con motores sueltos y mutaciones directas). */
async function cumplir(invitado, id) {
  const mi = MISIONES.find((x) => x.id === id);
  for (let i = 0; i < (['play', 'win'].includes(mi.type) ? mi.count : 1); i++) {
    if (mi.type === 'play')
      await partida(invitado, { motor: mi.target ?? 'trivia', seg: 6, puntos: 0, estrellas: 0, gano: false });
    // trivia suelta (una etapa, dificultad 0.35): la primera meta son 480 pts
    if (mi.type === 'win') await partida(invitado, { motor: 'trivia', seg: 10, puntos: 500, estrellas: 1, gano: true });
    if (mi.type === 'score')
      await partida(invitado, { motor: mi.target, seg: 6, puntos: mi.count, estrellas: 0, gano: false });
    if (mi.type === 'goals')
      await partida(invitado, { motor: 'futbol', seg: 6, puntos: mi.count, estrellas: 0, gano: false });
    if (mi.type === 'visit') for (const d of ['olancho', 'copan']) await m(fn.visitar, { invitado, deptId: d });
    if (mi.type === 'collect') {
      await m(fn.visitar, { invitado, deptId: 'valle' });
      assert((await m(fn.recoger, { invitado, deptId: 'valle' })).ok);
    }
    if (mi.type === 'pickup') {
      const r = await m(fn.monedas, { invitado, cantidad: 100 });
      assert.equal(r.pagadas, 20, 'de golpe solo paga lo que cabe en el ritmo');
    }
    if (mi.type === 'emote')
      for (let k = 0; k < mi.count; k++) {
        await m(fn.emote, { invitado });
        await sleep(2100);
      }
  }
}

const sufijo = randomBytes(2).toString('hex');
const nombreA = `PruebaA-${sufijo}`,
  nombreB = `PruebaB-${sufijo}`;
const secretoA = nuevo(),
  secretoB = nuevo(),
  secretoC = nuevo();
const olvidar = [secretoA, secretoB, secretoC];

let ok = false;
try {
  execFileSync('node', ['apps/web/tools/build.mjs', 'hd', '--out', out], {
    cwd: raiz,
    stdio: 'inherit',
    env: { ...process.env, VITE_CONVEX_URL: CONVEX_URL },
  });
  // el cron reparte las misiones de hoy: las mismas para todos (semilla por fecha de Honduras)
  const reparto = JSON.parse(
    execFileSync('npx', ['convex', 'run', 'misiones:repartir', '{}'], { cwd: raiz, encoding: 'utf8' }),
  );
  assert.equal(reparto.ids.length, datos('progress.json').dailyCount);

  const origen = new URL(CONVEX_URL).origin;
  const red = new RegExp(`^${origen.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`);
  ok = await run('progreso-servidor', join(out, 'mundo-catrucho-hd.html'), { hash: '#test,go', red }, async (t) => {
    const S = 'window.__mc.store.getState()';
    const st = async (e) => JSON.parse(await t.ev(`(()=>{const s=${S};return JSON.stringify(${e})})()`));
    await t.waitFor(`${S}.sincronizar().then(Boolean)`, 20000, 'entrar al servidor');
    olvidar.push(await t.ev(`localStorage.getItem('mundo-catrucho-invitado')`));

    // 1. avance local inventado: sube etapas y visitas posibles, pero no da premios ni marcas
    const local = {
      name: nombreA,
      created: true,
      coins: 99999,
      xp: 9000,
      level: 49,
      visited: ['lapaz', 'cortes', 'marte'],
      collected: ['lapaz', 'olancho'],
      achievements: LOGROS.map((l) => l.id),
      juegos: {
        'santabarbara.cuando-caen-las-tres': { etapa: 2, stars: [3, 9], best: 1e9, label: 'mil millones', veces: 1e6 },
        'inventado.juego': { etapa: 3, stars: [3, 3, 3], best: 5, label: '5', veces: 3 },
      },
      daily: {
        date: '2000-1-1',
        missions: reparto.ids.map((id) => ({ id, progress: 999, claimed: false })),
      },
    };
    await t
      .ev(`(() => {
      const prev = JSON.parse(localStorage.getItem('mundo-catrucho-v1') || '{}');
      localStorage.setItem('mundo-catrucho-v1', JSON.stringify({ ...prev, ...${JSON.stringify(local)} }));
      localStorage.setItem('mundo-catrucho-invitado', '${secretoA}');
      location.reload();
    })()`)
      .catch(() => {});
    await t.sleep(1500);
    await t.waitFor(`!!window.__mc?.store`, 30000, 'recargar');
    await t.waitFor(`${S}.sincronizar().then(Boolean)`, 20000, 'entrar con avance local');
    const e1 = await q(fn.estado, { invitado: secretoA });
    assert.equal(e1.migrado, true);
    assert.deepEqual(e1.visitas.sort(), ['cortes', 'lapaz']);
    assert.deepEqual(e1.recuerdos, ['lapaz']);
    // el avance local no desbloquea etapas en el servidor: solo cuenta las veces
    assert.deepEqual(e1.juegos, [
      { juegoId: 'santabarbara.cuando-caen-las-tres', etapa: 0, estrellas: [], mejor: 0, veces: 500 },
    ]);
    assert.deepEqual(e1.logros, ['primer_paso'], 'solo el logro de entrar; nada del avance inventado');
    const p1 = await q(fn.perfil, { invitado: secretoA });
    assert.equal(p1.monedas, 100 + coins('primer_paso'), 'el saldo inventado no sube');
    assert.equal(p1.nivel, 1);
    assert.equal(await st('s.profile.coins'), p1.monedas);
    assert.deepEqual(await st('s.profile.achievements'), ['primer_paso']);
    assert.equal(await st(`s.profile.juegos['santabarbara.cuando-caen-las-tres'].etapa`), 0);
    assert.equal(await st(`s.profile.juegos['inventado.juego'] ?? null`), null);
    assert.equal(
      (await q(fn.porJuego, { juegoId: 'santabarbara.cuando-caen-las-tres' })).filas.some((f) => f.nombre === nombreA),
      false,
    );
    // las misiones son las del servidor: sin progreso, no se cobran
    assert.deepEqual(
      e1.misiones.misiones.map((x) => x.id),
      reparto.ids,
    );
    assert.deepEqual(await st('s.profile.daily.missions.map((x) => x.progress)'), [0, 0, 0]);
    const inc = await m(fn.cobrar, { invitado: secretoA, misionId: reparto.ids[0] });
    assert.equal(inc.ok, false);
    assert.equal(inc.motivo, 'incompleta');
    // una etapa todavía bloqueada no se abre
    assert.deepEqual(
      await m(fn.abrir, { invitado: secretoA, motor: 'yoro.acuerdos', juegoId: 'yoro.tres-pruebas-del-54', etapa: 1 }),
      {
        ok: false,
        motivo: 'etapa bloqueada',
      },
    );

    // 2. cerrar una partida guarda etapa, estrellas, visita y marca, y da «Primera victoria» una vez
    await t.sleep(1100);
    await t.ev(`${S}.startJuego('yoro.tres-pruebas-del-54')`);
    await t.waitFor(`${S}.mg?.phase === 'intro'`);
    await t.ev(`${S}.beginMinigame()`);
    await t.sleep(9500);
    await t.ev(`${S}.finishMinigame({ won: true, stars: 1, score: 300, label: '300 pts' })`);
    await t.waitFor(`${S}.mg?.pago === 'pagado'`, 20000, 'pago del servidor');
    assert.deepEqual(await st('s.mg.rewards.newAchievements'), ['primera_victoria']);
    assert.equal(await st('s.mg.avance'), true);
    assert.equal(await st(`s.profile.juegos['yoro.tres-pruebas-del-54'].etapa`), 1);
    await t.waitFor(`!!document.querySelector('[data-testid=mg-ach-primera_victoria]')`);
    await t.sleep(2500); // que terminen de contar los premios
    await t.shot(join(capturas, '01-logro-del-servidor.png'));
    const e2 = await q(fn.estado, { invitado: secretoA });
    assert.deepEqual(
      e2.juegos.find((j) => j.juegoId === 'yoro.tres-pruebas-del-54'),
      { juegoId: 'yoro.tres-pruebas-del-54', etapa: 1, estrellas: [1], mejor: 300, veces: 1 },
    );
    assert(e2.visitas.includes('graciasadios'), 'la partida cuenta como visita');
    const premioGanar = R.minigame.win.coins + R.minigame.perStar.coins,
      primeraVisita = R.world.firstVisit.coins;
    const xpGanada = R.minigame.win.xp + R.minigame.perStar.xp + R.world.firstVisit.xp,
      subio = xpGanada >= R.level.base ? R.levelUp.coins : 0;
    const p2 = await q(fn.perfil, { invitado: secretoA });
    assert.equal(p2.monedas, p1.monedas + premioGanar + primeraVisita + coins('primera_victoria') + subio);
    assert.equal(await st('s.profile.coins'), p2.monedas);

    // 3. otra victoria no repite el logro; un segundo invitado juega lo mismo con menos puntos
    await t.ev(`${S}.exitMinigame()`);
    await m(fn.entrar, { invitado: secretoB, nombre: `${nombreB}!!<>` });
    const [rA, rB] = await Promise.all([
      partida(secretoA, {
        motor: 'yoro.acuerdos',
        juegoId: 'yoro.tres-pruebas-del-54',
        seg: 9,
        puntos: 290,
        estrellas: 1,
        gano: true,
      }),
      partida(secretoB, {
        motor: 'yoro.acuerdos',
        juegoId: 'yoro.tres-pruebas-del-54',
        seg: 9,
        puntos: 260,
        estrellas: 1,
        gano: true,
      }),
    ]);
    assert(rA.ok && rB.ok);
    assert.deepEqual(rA.logros, [], 'el logro se da una sola vez');
    assert.deepEqual(
      rB.logros.map((l) => l.id),
      ['primera_victoria'],
    );
    assert.equal((await q(fn.estado, { invitado: secretoA })).logros.filter((l) => l === 'primera_victoria').length, 1);
    // la marca guarda la mejor: 290 no baja los 300
    const tabla = await q(fn.porJuego, { juegoId: 'yoro.tres-pruebas-del-54', invitado: secretoA });
    const iA = tabla.filas.findIndex((f) => f.nombre === nombreA),
      iB = tabla.filas.findIndex((f) => f.nombre === nombreB);
    assert(iA >= 0 && iB > iA, `A antes que B: ${JSON.stringify(tabla.filas)}`);
    assert.equal(tabla.filas[iA].puntos, 300);
    assert.equal(tabla.filas[iA].tu, true);
    assert.equal(tabla.filas[iB].nombre, nombreB, 'nombre limpio');

    // 4. la pantalla de clasificación muestra a los dos, en orden, con datos del servidor
    await t.ev(`${S}.travel('graciasadios')`);
    await t.ev(`${S}.openPanel('clasificacion')`);
    await t.waitFor(`!!document.querySelector('[data-testid=lb-juego]')`);
    await t.ev(`(() => {
      const el = document.querySelector('[data-testid=lb-juego]');
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(el, 'yoro.tres-pruebas-del-54');
      el.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await t.waitFor(
      `[...document.querySelectorAll('[data-testid=lb-list] li')].some((li) => li.textContent.includes('${nombreB}'))`,
      15000,
      'tabla del servidor',
    );
    const filas = await t.ev(
      `JSON.stringify([...document.querySelectorAll('[data-testid=lb-list] li')].map((li) => li.textContent))`,
    );
    const textos = JSON.parse(filas);
    const fA = textos.findIndex((x) => x.includes(nombreA)),
      fB = textos.findIndex((x) => x.includes(nombreB));
    assert(fA >= 0 && fB > fA, `en pantalla A antes que B: ${filas}`);
    assert.equal(
      await t.ev(`document.querySelector('[data-testid=lb-you]')?.textContent.includes('${nombreA}')`),
      true,
    );
    await t.shot(join(capturas, '02-clasificacion-por-juego.png'));
    await t.click('lb-modo-depto');
    await t.waitFor(
      `document.querySelector('[data-testid=lb-list]') && [...document.querySelectorAll('[data-testid=lb-list] li')].some((li) => li.textContent.includes('${nombreB}'))`,
      15000,
      'tabla por departamento',
    );
    await t.shot(join(capturas, '03-clasificacion-por-departamento.png'));
    const depto = await q(fn.porDepto, { deptId: 'graciasadios' });
    assert.equal(depto.filas.filter((f) => f.nombre === nombreA).length, 1, 'una fila por jugador');
    await t.ev(`${S}.closePanel()`);

    // 5. misión del día: completa se cobra una vez; repetida no
    const c0 = await m(fn.entrar, { invitado: secretoC, nombre: 'PruebaC' });
    const mision = reparto.ids[0];
    await cumplir(secretoC, mision);
    const antes = (await q(fn.perfil, { invitado: secretoC })).monedas;
    const cobro = await m(fn.cobrar, { invitado: secretoC, misionId: mision });
    assert(cobro.ok, `cobrar ${mision}: ${cobro.motivo}`);
    const mi = MISIONES.find((x) => x.id === mision);
    assert.deepEqual(cobro.premio, { monedas: mi.coins, xp: mi.xp });
    assert(cobro.saldo.monedas >= antes + mi.coins);
    const otra = await m(fn.cobrar, { invitado: secretoC, misionId: mision });
    assert.equal(otra.motivo, 'cobrada');
    assert.equal((await q(fn.perfil, { invitado: secretoC })).monedas, cobro.saldo.monedas);
    assert.equal(c0.monedas, 100);

    // 6. viaje: el pasaje sale del servidor y llegar antes de tiempo no paga bono
    const sale = await m(fn.salir, { invitado: secretoC, veh: 'bus', de: 'cortes', a: 'atlantida' });
    assert(sale.ok);
    assert.equal(sale.precio, 2);
    const llega = await m(fn.llegar, { invitado: secretoC, viajeId: sale.viajeId, bono: 30 });
    assert.equal(llega.bono, 0);
    assert.equal(llega.saldo.monedas, sale.saldo.monedas);
    assert.equal((await m(fn.llegar, { invitado: secretoC, viajeId: sale.viajeId, bono: 30 })).motivo, 'cerrado');
    // un recuerdo sin visitar el departamento no paga
    assert.equal((await m(fn.recoger, { invitado: secretoC, deptId: 'graciasadios' })).motivo, 'sin-visita');
  });
} finally {
  rmSync(out, { recursive: true, force: true });
  for (const invitado of olvidar)
    if (invitado)
      try {
        execFileSync('npx', ['convex', 'run', 'progreso:olvidarInvitado', JSON.stringify({ invitado })], {
          cwd: raiz,
          stdio: 'ignore',
        });
      } catch {}
}
if (!ok) process.exitCode = 1;
