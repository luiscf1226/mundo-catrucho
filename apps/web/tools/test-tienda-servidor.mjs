// MC-13 y MC-14 de punta a punta contra el Convex de desarrollo: el juego compilado con VITE_CONVEX_URL compra,
// equipa y cobra partidas en el servidor. Sin .env.local imprime SALTA. No la corras contra producción.
//   node apps/web/tools/test-tienda-servidor.mjs        (deja capturas en capturas/mc-13/)
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import { raiz } from '../../../scripts/catalogo.mjs';
import { run } from './harness.mjs';

const envPath = join(raiz, '.env.local');
if (!existsSync(envPath)) {
  console.log('SALTA tienda-servidor: no hay .env.local');
  process.exit(0);
}
const { CONVEX_URL } = parseEnv(readFileSync(envPath, 'utf8'));
if (!CONVEX_URL) throw new Error('Falta CONVEX_URL en .env.local');
const capturas = join(raiz, 'capturas/mc-13');
const out = mkdtempSync(join(tmpdir(), 'mc-tienda-'));
const convex = new ConvexHttpClient(CONVEX_URL, { logger: false });
const miPerfil = makeFunctionReference('tienda:miPerfil');
const cerrar = makeFunctionReference('partidas:cerrarPartida');

let ok = false;
try {
  execFileSync('node', ['apps/web/tools/build.mjs', 'hd', '--out', out], {
    cwd: raiz,
    stdio: 'inherit',
    env: { ...process.env, VITE_CONVEX_URL: CONVEX_URL },
  });
  const origen = new URL(CONVEX_URL).origin;
  const red = new RegExp(`^${origen.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`);
  ok = await run('tienda-servidor', join(out, 'mundo-catrucho-hd.html'), { hash: '#test,go', red }, async (t) => {
    const S = 'window.__mc.store.getState()';
    const st = async (e) => JSON.parse(await t.ev(`(()=>{const s=${S};return JSON.stringify(${e})})()`));
    // 1. entra como invitado: secreto de 32 bytes en localStorage y perfil nuevo del servidor
    await t.waitFor(`${S}.sincronizar().then(Boolean)`, 20000, 'entrar al servidor');
    const secreto = await t.ev(`localStorage.getItem('mundo-catrucho-invitado')`);
    assert.match(secreto, /^[0-9a-f]{64}$/);
    const perfil = () => convex.query(miPerfil, { invitado: secreto });
    assert.equal((await perfil()).monedas, 100);
    assert.equal(await st('s.profile.coins'), 100);
    assert(
      t.requests.some((u) => u.startsWith(`${origen}/api/mutation`)),
      'debe hablar con Convex',
    );

    // 2. no se puede comprar sin Lempiritas, aunque el navegador se invente saldo
    await t.ev(`window.__mc.store.setState((s) => ({ profile: { ...s.profile, coins: 99999 } }))`);
    assert.equal(await t.ev(`${S}.comprar('corona_carnaval')`), 'caro');
    assert.equal(await st('s.profile.coins'), 100, 'el saldo vuelve al del servidor');
    assert.equal((await perfil()).comprados.includes('corona_carnaval'), false);

    // 3. la pulpería: sin fondos muestra lo que falta; la gorra se compra y queda puesta
    await t.ev(`${S}.enterWorld()`);
    await t.ev(`${S}.openPanel('tienda')`);
    await t.click('shop-tab-sombrero');
    await t.click('shop-item-corona_carnaval');
    await t.waitFor(`!!document.querySelector('[data-testid=shop-short]')`, 15000, 'aviso de que no alcanza');
    assert.equal(await t.text('shop-missing'), '100');
    await t.shot(join(capturas, '01-no-alcanza.png'));
    await t.click('shop-item-gorra');
    await t.waitFor(`${S}.profile.coins === 50`, 15000, 'cobrar la gorra');
    assert.equal(await st('s.profile.avatar.hat'), 'gorra');
    const p1 = await perfil();
    assert.equal(p1.monedas, 50);
    assert(p1.comprados.includes('gorra'));
    assert.equal(p1.avatar.hat, 'gorra');
    await t.shot(join(capturas, '02-gorra-comprada.png'));
    // equipar lo que no tenés: el servidor lo rechaza y no cambia lo puesto
    assert.equal(await t.ev(`${S}.equip('corona_carnaval')`), false);
    await t.click('shop-item-sin_sombrero');
    await t.waitFor(`${S}.profile.avatar.hat === 'sin_sombrero'`);
    for (let i = 0; i < 50 && (await perfil()).avatar.hat !== 'sin_sombrero'; i++) await t.sleep(200);
    assert.equal((await perfil()).avatar.hat, 'sin_sombrero', 'equipar se guarda en el servidor');
    await t.ev(`${S}.closePanel()`);

    // 4. partida con puntaje imposible: se rechaza y no paga
    await t.ev(`${S}.startJuego('cortes.pollo-chuco-en-equilibrio')`);
    await t.waitFor(`${S}.mg?.phase === 'intro'`);
    await t.ev(`${S}.beginMinigame()`);
    await t.ev(`${S}.finishMinigame({ won: true, stars: 3, score: 999999, label: '999999 pts' })`);
    await t.waitFor(`${S}.mg?.pago === 'rechazado'`, 20000, 'rechazo del servidor');
    assert.equal(await st('s.mg.rewards.coins'), 0);
    assert.equal(await st('s.profile.coins'), 50);
    await t.waitFor(`!!document.querySelector('[data-testid=mg-result-pago]')`);
    await t.shot(join(capturas, '03-partida-rechazada.png'));

    // 5. partida posible (trivia suelta, sin reloj fijo): paga lo que dice premioPartida, una sola vez
    await t.ev(`${S}.exitMinigame()`);
    await t.ev(`${S}.startMinigame('trivia')`);
    await t.waitFor(`${S}.mg?.phase === 'intro'`);
    const desde = Date.now();
    await t.ev(`${S}.beginMinigame()`);
    // la duración la mide el servidor: hay que dejar pasar tiempo de verdad para que 480 pts sean posibles
    while (Date.now() - desde < 10_000) await t.sleep(250);
    await t.ev(`${S}.finishMinigame({ won: true, stars: 1, score: 480, label: '480 pts' })`);
    await t.waitFor(`${S}.mg?.pago === 'pagado'`, 20000, 'pago del servidor');
    const R = JSON.parse(readFileSync(join(raiz, 'apps/web/shared/data/rewards.json'), 'utf8')).minigame;
    const premio = R.win.coins + R.perStar.coins;
    assert.equal(await st('s.mg.rewards.coins'), premio);
    assert.equal(await st('s.profile.coins'), 50 + premio);
    assert.equal((await perfil()).monedas, 50 + premio);
    await t.waitFor(`document.querySelector('[data-testid=mg-result-rewards]')?.dataset.coins === '${premio}'`);
    await t.shot(join(capturas, '04-partida-pagada.png'));

    // 6. sin conexión: no se compra ni se paga, y el saldo no se inventa
    await t.ev(`${S}.exitMinigame()`);
    await t.ev(`window.fetch = () => Promise.reject(new Error('sin red'))`);
    assert.equal(await t.ev(`${S}.comprar('mochila')`), 'sin-conexion');
    assert.equal(await st('s.profile.coins'), 50 + premio);
    await t.ev(`${S}.startMinigame('trivia')`);
    await t.waitFor(`${S}.mg?.phase === 'intro'`);
    await t.ev(`${S}.beginMinigame()`);
    await t.ev(`${S}.finishMinigame({ won: false, stars: 0, score: 0, label: '0 pts' })`);
    await t.waitFor(`${S}.mg?.pago === 'sin-conexion'`, 20000, 'partida sin conexión');
    assert.equal(await st('s.profile.coins'), 50 + premio);
    await t.shot(join(capturas, '05-sin-conexion.png'));

    // 7. otra persona no puede cerrar una partida ajena (directo a Convex, sin navegador)
    const abrir = makeFunctionReference('partidas:abrirPartida');
    const otra = await convex.mutation(abrir, { invitado: `${'0'.repeat(63)}1`, motor: 'trivia', etapa: 0 });
    assert(otra.ok);
    const r = await convex.mutation(cerrar, {
      invitado: secreto,
      partidaId: otra.id,
      puntos: 0,
      estrellas: 0,
      gano: false,
    });
    assert.deepEqual(r, { ok: false, motivo: 'ajena' });

    // 8. una sola partida abierta: abrir otra deja la primera abandonada y ya no paga; abrir de seguido se rechaza
    const yo = `${'0'.repeat(63)}2`;
    const a = await convex.mutation(abrir, { invitado: yo, motor: 'trivia', etapa: 0 });
    assert(a.ok);
    assert.equal((await convex.mutation(abrir, { invitado: yo, motor: 'trivia', etapa: 0 })).ok, false, 'muy seguido');
    await t.sleep(1200);
    const b = await convex.mutation(abrir, { invitado: yo, motor: 'trivia', etapa: 0 });
    assert(b.ok);
    const ra = await convex.mutation(cerrar, { invitado: yo, partidaId: a.id, puntos: 0, estrellas: 0, gano: false });
    assert.deepEqual(ra, { ok: false, motivo: 'cerrada' });
  });
} finally {
  rmSync(out, { recursive: true, force: true });
}
if (!ok) process.exitCode = 1;
