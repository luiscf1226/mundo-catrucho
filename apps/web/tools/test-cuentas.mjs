// MC-07, MC-08 y MC-09 de punta a punta contra el Convex de .env.local, con dos navegadores (dos dispositivos):
//  1. El dispositivo A juega, compra y crea un código en Ajustes → «Tu cuenta».
//  2. El dispositivo B (con su propio avance en Convex y en el navegador) escribe el código: entra a la cuenta de A y
//     lo suyo se junta sin perder nada y sin premios repetidos (lo que dice `fusionarCuentas` de packages/reglas).
//  3. Lempiritas, nivel, XP, ropa y etapas se leen de Convex y se ven igual en los dos; un cambio de ropa en B se ve
//     en A al recargar. El código no sirve dos veces.
//  4. Clerk sin llaves: `npx convex run --identity` simula el token de una cuenta y prueba `vincularCuenta`.
// Sin .env.local imprime SALTA. No la corras contra producción. Borra a sus invitados al terminar.
//   node apps/web/tools/test-cuentas.mjs        (deja capturas en capturas/cuentas/)
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference as ref } from 'convex/server';
import { fusionarCuentas, LOGROS, PREMIOS } from '../../../packages/reglas/src/index.ts';
import { raiz } from '../../../scripts/catalogo.mjs';
import { launch } from './harness.mjs';

const envPath = join(raiz, '.env.local');
if (!existsSync(envPath)) {
  console.log('SALTA cuentas: no hay .env.local (prueba de Convex de punta a punta)');
  process.exit(0);
}
const { CONVEX_URL } = parseEnv(readFileSync(envPath, 'utf8'));
if (!CONVEX_URL) throw new Error('Falta CONVEX_URL en .env.local');
const capturas = join(raiz, 'capturas/cuentas');
mkdirSync(capturas, { recursive: true });
const out = mkdtempSync(join(tmpdir(), 'mc-cuentas-'));
const convex = new ConvexHttpClient(CONVEX_URL, { logger: false });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fn = {
  entrar: ref('tienda:entrar'),
  perfil: ref('tienda:miPerfil'),
  comprar: ref('tienda:comprar'),
  abrir: ref('partidas:abrirPartida'),
  cerrar: ref('partidas:cerrarPartida'),
  estado: ref('progreso:estado'),
  visitar: ref('progreso:visitar'),
  recoger: ref('progreso:recoger'),
  crearCodigo: ref('cuentas:crearCodigoDispositivo'),
  usarCodigo: ref('cuentas:usarCodigoDispositivo'),
  miCuenta: ref('cuentas:miCuenta'),
  vincular: ref('cuentas:vincularCuenta'),
};
const m = (f, args) => convex.mutation(f, args);
const q = (f, args) => convex.query(f, args);
const nuevo = () => randomBytes(32).toString('hex');
const coins = (id) => LOGROS.find((l) => l.id === id).coins;
/** Abre una partida, deja pasar `seg` segundos de verdad (la duración la mide el servidor) y la cierra. */
async function partida(invitado, { motor, juegoId, seg, puntos, estrellas, gano }) {
  const a = await m(fn.abrir, { invitado, motor, etapa: 0, ...(juegoId ? { juegoId } : {}) });
  assert(a.ok, `abrir ${juegoId ?? motor}: ${a.motivo}`);
  await sleep(seg * 1000);
  const r = await m(fn.cerrar, { invitado, partidaId: a.id, puntos, estrellas, gano });
  assert(r.ok, `cerrar ${juegoId ?? motor}: ${r.motivo} ${r.motivos ?? ''}`);
  return r;
}
/** Lo que el servidor sabe de una cuenta, como lo recibe `fusionarCuentas`. */
async function cuenta(invitado) {
  const p = await q(fn.perfil, { invitado }),
    e = await q(fn.estado, { invitado });
  return {
    monedas: p.monedas,
    xp: p.xp,
    nivel: p.nivel,
    visitas: e.visitas,
    recuerdos: e.recuerdos,
    logros: e.logros,
    comprados: p.comprados,
    misiones: [{ fecha: e.misiones.fecha, cobradas: e.misiones.misiones.filter((x) => x.cobrada).map((x) => x.id) }],
    sueltas: null,
    juegos: e.juegos,
  };
}
const convexRun = (args) =>
  JSON.parse(execFileSync('npx', ['convex', 'run', ...args], { cwd: raiz, encoding: 'utf8' }).trim() || 'null');

const secretoA = nuevo(),
  secretoB = nuevo(),
  secretoC = nuevo(),
  secretoD = nuevo(),
  intruso = nuevo();
const olvidar = [secretoA, secretoC, intruso];
const sufijo = randomBytes(2).toString('hex');
const PULPERIA = { motor: 'pulperia', juegoId: 'franciscomorazan.pulperia' };
const pestanas = [];
let ok = false;
try {
  execFileSync('node', ['apps/web/tools/build.mjs', 'hd', '--out', out], {
    cwd: raiz,
    stdio: 'inherit',
    env: { ...process.env, VITE_CONVEX_URL: CONVEX_URL },
  });
  const html = join(out, 'mundo-catrucho-hd.html');
  const origen = new URL(CONVEX_URL).origin;
  const red = new RegExp(`^${origen.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`);
  const S = 'window.__mc.store.getState()';
  /** Un dispositivo: su propio navegador con su secreto de invitado y, si se pide, avance guardado en el navegador. */
  async function dispositivo(nombre, secreto, local = {}) {
    const t = await launch(html, { hash: '#test,go', red, width: 1100, height: 700 });
    pestanas.push(t);
    await t.waitFor('!!window.__mc?.store', 30000, `${nombre}: el juego cargó`);
    await t
      .ev(`(() => {
        const prev = JSON.parse(localStorage.getItem('mundo-catrucho-v1') || '{}');
        localStorage.setItem('mundo-catrucho-v1', JSON.stringify({ ...prev, name: '${nombre}', created: true, ...${JSON.stringify(local)} }));
        localStorage.setItem('mundo-catrucho-invitado', '${secreto}');
        location.reload();
      })()`)
      .catch(() => {});
    await t.sleep(1500);
    await t.waitFor('!!window.__mc?.store', 30000, `${nombre}: recargar`);
    await t.waitFor(`${S}.sincronizar().then(Boolean)`, 20000, `${nombre}: entrar al servidor`);
    return t;
  }
  const st = async (t, e) => JSON.parse(await t.ev(`(()=>{const s=${S};return JSON.stringify(${e})})()`));
  const setInput = (t, tid, value) =>
    t.ev(
      `(()=>{const e=document.querySelector('[data-testid="${tid}"]');const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');d.set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`,
    );

  // 1. dispositivo A: juega, visita, compra
  const tA = await dispositivo(`CuentaA-${sufijo}`, secretoA);
  await m(fn.visitar, { invitado: secretoA, deptId: 'olancho' });
  assert((await m(fn.recoger, { invitado: secretoA, deptId: 'olancho' })).ok);
  await partida(secretoA, { ...PULPERIA, seg: 9, puntos: 110, estrellas: 1, gano: true });
  assert((await m(fn.comprar, { invitado: secretoA, itemId: 'cara_lentes', equipar: true })).ok);

  // 2. dispositivo B: su propio invitado con avance que se cruza con el de A (misma visita, mismo juego, otra prenda)
  const tB = await dispositivo(`CuentaB-${sufijo}`, secretoB, {
    visited: ['lapaz'],
    juegos: { 'santabarbara.cuando-caen-las-tres': { etapa: 1, stars: [2], best: 9, label: '9', veces: 4 } },
  });
  await m(fn.visitar, { invitado: secretoB, deptId: 'olancho' });
  await m(fn.visitar, { invitado: secretoB, deptId: 'copan' });
  await partida(secretoB, { ...PULPERIA, seg: 9, puntos: 100, estrellas: 1, gano: true });
  await sleep(1100);
  await partida(secretoB, { motor: 'trivia', seg: 10, puntos: 500, estrellas: 1, gano: true });
  assert((await m(fn.comprar, { invitado: secretoB, itemId: 'cara_pecas' })).ok);
  await tA.ev(`${S}.sincronizar()`);
  await tB.ev(`${S}.sincronizar()`);
  const antesA = await cuenta(secretoA),
    antesB = await cuenta(secretoB);
  const esperado = fusionarCuentas(antesA, antesB);
  assert(esperado.resumen.descuento >= 100 + PREMIOS.world.firstVisit.coins + coins('primer_paso'));

  // 3. A crea el código en Ajustes → «Tu cuenta»
  await tA.ev(`${S}.openPanel('ajustes')`);
  await tA.click('cuenta-crear');
  await tA.waitFor(
    `/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(document.querySelector('[data-testid=cuenta-codigo]')?.innerText ?? '')`,
  );
  const codigo = await tA.text('cuenta-codigo');
  await tA.ev(`document.querySelector('[data-testid=cuenta]').scrollIntoView({block:'center'})`);
  await tA.sleep(400);
  await tA.shot(join(capturas, '01-codigo-en-ajustes.png'));
  assert((await q(fn.miCuenta, { invitado: secretoA })).codigoVence > Date.now());

  // 4. B escribe el código: entra a la cuenta de A y lo suyo se junta
  await tB.ev(`${S}.openPanel('ajustes')`);
  await tB.waitFor(`!!document.querySelector('[data-testid=cuenta-codigo-input]')`);
  await setInput(tB, 'cuenta-codigo-input', codigo.toLowerCase());
  await tB.click('cuenta-usar');
  await tB.waitFor(
    `document.querySelector('[data-testid=cuenta-aviso]')?.dataset.ok === 'true'`,
    20000,
    'usar el código',
  );
  await tB.ev(`document.querySelector('[data-testid=cuenta]').scrollIntoView({block:'center'})`);
  await tB.sleep(400);
  await tB.shot(join(capturas, '02-otro-dispositivo-entro.png'));

  const pA = await q(fn.perfil, { invitado: secretoA }),
    pB = await q(fn.perfil, { invitado: secretoB });
  assert.deepEqual(pB, pA, 'los dos secretos entran a la misma cuenta');
  // el saldo es el de la fusión (más los logros que la suma ya cumple, que se pagan una vez)
  const despues = await cuenta(secretoA);
  const logrosNuevos = despues.logros.filter((l) => !esperado.logros.includes(l));
  const pagados = logrosNuevos.reduce((s, l) => s + coins(l), 0);
  assert.equal(pA.monedas, esperado.monedas + pagados, `saldo: ${pA.monedas} vs ${esperado.monedas} + ${pagados}`);
  assert.equal(pA.nivel, esperado.nivel);
  // nada se pierde: ropa de los dos, etapas y marcas, visitas del servidor y del navegador de B
  assert.deepEqual([...pA.comprados].sort(), ['cara_lentes', 'cara_pecas']);
  const pulperia = despues.juegos.find((j) => j.juegoId === PULPERIA.juegoId);
  assert.deepEqual(
    { etapa: pulperia.etapa, mejor: pulperia.mejor, veces: pulperia.veces, estrellas: pulperia.estrellas },
    { etapa: 1, mejor: 110, veces: 2, estrellas: [1] },
  );
  assert(
    despues.juegos.some((j) => j.juegoId === 'trivia'),
    'la trivia de B',
  );
  assert(
    despues.juegos.some((j) => j.juegoId === 'santabarbara.cuando-caen-las-tres'),
    'lo del navegador de B',
  );
  for (const d of ['olancho', 'copan', 'lapaz']) assert(despues.visitas.includes(d), d);
  assert.deepEqual(despues.recuerdos, ['olancho']);
  assert.equal(despues.logros.filter((l) => l === 'primer_paso').length, 1);
  // B ve lo del servidor: nombre, Lempiritas, nivel, ropa y avatar de la cuenta de A
  assert.equal(await st(tB, 's.profile.name'), `CuentaA-${sufijo}`);
  assert.equal(await st(tB, 's.profile.coins'), pA.monedas);
  assert.equal(await st(tB, 's.profile.level'), pA.nivel);
  assert.equal(await st(tB, 's.profile.xp'), pA.xp);
  assert.equal(await st(tB, 's.profile.avatar.face'), 'cara_lentes');
  assert.equal(await st(tB, `s.profile.juegos['${PULPERIA.juegoId}'].etapa`), 1);
  const mi = await q(fn.miCuenta, { invitado: secretoB });
  assert.equal(mi.dispositivos, 2);
  assert.equal(mi.codigoVence, null, 'el código se gastó');

  // 5. el código es de un solo uso; no se puede volver a juntar
  const otra = await m(fn.usarCodigo, { invitado: intruso, codigo });
  assert.equal(otra.motivo, 'codigo');
  const propio = await m(fn.crearCodigo, { invitado: secretoA });
  assert.equal((await m(fn.usarCodigo, { invitado: secretoB, codigo: propio.codigo })).motivo, 'propio');
  assert.equal((await m(fn.usarCodigo, { invitado: intruso, codigo: 'ABCD-EFG' })).motivo, 'codigo');

  // 6. un cambio de ropa en B se ve en A (el perfil sale de Convex al iniciar, no del navegador)
  await tB.ev(`${S}.closePanel()`);
  await tB.ev(`${S}.equip('cara_pecas')`);
  await tB.waitFor(`${S}.profile.avatar.face === 'cara_pecas'`);
  await tB.waitFor(
    `fetch('${CONVEX_URL}/api/query',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({path:'tienda:miPerfil',args:{invitado:'${secretoA}'},format:'json'})}).then(r=>r.json()).then(r=>r.value.avatar.face==='cara_pecas')`,
    15000,
    'la ropa llegó al servidor',
  );
  await tA.ev(`location.reload()`).catch(() => {});
  await tA.sleep(1500);
  await tA.waitFor('!!window.__mc?.store', 30000, 'A recarga');
  await tA.waitFor(
    `${S}.profile.avatar.face === 'cara_pecas' && ${S}.profile.coins === ${pA.monedas}`,
    20000,
    'A ve lo de B',
  );
  for (const id of ['cara_lentes', 'cara_pecas']) assert(await st(tA, `s.profile.owned.includes('${id}')`), id);
  await tA.ev(`${S}.openPanel('ajustes')`);
  await tA.sleep(600);
  await tA.shot(join(capturas, '03-mismo-perfil-en-a.png'));

  // 7. Clerk sin llaves: `--identity` simula el token. La primera vez la cuenta se une al invitado C; desde otro
  //    dispositivo (invitado D con su avance) se junta con la misma cuenta, una sola vez.
  const identidad = JSON.stringify({
    tokenIdentifier: `https://prueba.clerk.accounts.dev|user_${sufijo}`,
    subject: `user_${sufijo}`,
  });
  await m(fn.entrar, { invitado: secretoC, nombre: 'PruebaClerk', creado: true });
  assert.equal((await m(fn.vincular, { invitado: secretoC })).motivo, 'sin-cuenta', 'sin token no hay cuenta');
  const v1 = convexRun(['--identity', identidad, 'cuentas:vincularCuenta', JSON.stringify({ invitado: secretoC })]);
  assert.deepEqual(v1, { ok: true, nueva: false, resumen: null });
  await m(fn.entrar, { invitado: secretoD, nombre: 'OtroTel', creado: true });
  await m(fn.visitar, { invitado: secretoD, deptId: 'valle' });
  const v2 = convexRun(['--identity', identidad, 'cuentas:vincularCuenta', JSON.stringify({ invitado: secretoD })]);
  assert.equal(v2.ok, true);
  assert(v2.resumen, 'el invitado D se juntó con la cuenta');
  const conToken = convexRun(['--identity', identidad, 'progreso:estado', JSON.stringify({ invitado: secretoD })]);
  assert(conToken.visitas.includes('valle'));
  const v3 = convexRun(['--identity', identidad, 'cuentas:vincularCuenta', JSON.stringify({ invitado: secretoD })]);
  assert.equal(v3.resumen, null, 'repetir no junta dos veces');
  const conCuenta = convexRun(['--identity', identidad, 'cuentas:miCuenta', JSON.stringify({ invitado: secretoD })]);
  assert.equal(conCuenta.conCuenta, true);
  // con token no se usan códigos de dispositivo
  const c2 = await m(fn.crearCodigo, { invitado: intruso });
  const conCodigo = convexRun([
    '--identity',
    identidad,
    'cuentas:usarCodigoDispositivo',
    JSON.stringify({ invitado: secretoD, codigo: c2.codigo }),
  ]);
  assert.equal(conCodigo.motivo, 'con-cuenta');
  ok = true;
} catch (e) {
  console.log(`FALLA cuentas: ${e.stack ?? e.message}`);
  for (const t of pestanas)
    try {
      await t.shot(join(tmpdir(), `mc-fail-cuentas-${pestanas.indexOf(t)}.png`));
    } catch {}
} finally {
  for (const t of pestanas) {
    if (t.errors.length) {
      ok = false;
      console.log(`ERRORES (${t.errors.length}):\n  ${[...new Set(t.errors)].slice(0, 12).join('\n  ')}`);
    }
    await t.close();
  }
  rmSync(out, { recursive: true, force: true });
  for (const invitado of olvidar)
    try {
      execFileSync('npx', ['convex', 'run', 'progreso:olvidarInvitado', JSON.stringify({ invitado })], {
        cwd: raiz,
        stdio: 'ignore',
      });
    } catch {}
}
console.log(ok ? 'PASA cuentas' : 'NO PASA cuentas');
if (!ok) process.exitCode = 1;
