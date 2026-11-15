import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { run } from './harness.mjs';

const S = 'window.__mc.store.getState()';
const file = process.argv[2] ?? 'apps/web/dist/mundo-catrucho-hd.html';
const ok = await run('eventos por fecha', file, { hash: '#test,go,fecha=2026-02-10' }, async (t) => {
  await t.waitFor(`!!window.__mc.gl && !!document.querySelector('[data-testid=hud]')`);
  async function fecha(dia) {
    await t.ev(`location.hash = 'test,go,fecha=${dia}'`);
    await t.waitFor(
      `document.querySelector('[data-testid=eventos]')?.dataset.fecha === '${dia}' || !document.querySelector('[data-testid=eventos]')`,
    );
  }
  async function evento(id, dia, dept, activo) {
    await fecha(dia);
    await t.ev(`${S}.travel('${dept}')`);
    await t.waitFor(`${S}.scene.kind === 'dept' && window.__mcTest.dept?.id === '${dept}'`);
    await t.waitFor(`!!document.querySelector('[data-testid=evento-${id}]') === ${activo}`);
    await t.waitFor(`!!window.__mc.scene.getObjectByName('evento-${id}') === ${activo}`);
  }
  const casos = [
    ['juniana', '2026-06-01', '2026-06-30', '2026-05-31', '2026-07-01', 'cortes'],
    ['carnaval', '2026-05-01', '2026-05-31', '2026-04-30', '2026-06-01', 'atlantida'],
    ['independencia', '2026-09-15', '2026-09-15', '2026-09-14', '2026-09-16', 'franciscomorazan'],
    ['morazanica', '2026-10-07', '2026-10-10', '2026-10-06', '2026-10-11', 'franciscomorazan'],
    ['maiz', '2026-08-01', '2026-08-31', '2026-07-31', '2026-09-01', 'elparaiso'],
    ['navidad', '2026-12-01', '2027-01-01', '2026-11-30', '2027-01-02', 'cortes'],
    ['alfombras', '2026-03-29', '2026-04-05', '2026-03-28', '2026-04-06', 'comayagua'],
    ['alfombras', '2027-03-21', '2027-03-28', '2027-03-20', '2027-03-29', 'comayagua'],
    ['inmaculada', '2026-12-05', '2026-12-08', '2026-12-04', '2026-12-09', 'elparaiso'],
  ];
  for (const [id, inicio, fin, antes, despues, dept] of casos) {
    for (const dia of [inicio, fin]) await evento(id, dia, dept, true);
    for (const dia of [antes, despues]) await evento(id, dia, dept, false);
    console.log(`PASA ${id}: límites inclusivos ${inicio} a ${fin}, apagado antes y después`);
  }
  for (const [id, dia, dept] of [
    ['juniana', '2026-06-20', 'cortes'],
    ['carnaval', '2026-05-23', 'atlantida'],
    ['alfombras', '2026-04-03', 'comayagua'],
  ]) {
    await evento(id, dia, dept, true);
    await t.waitFor(`document.querySelector('[data-testid=evento-ir-${id}]')?.textContent.includes('destacado:')`);
    await t.ev(`(() => {
      const p = window.__mcTest.dept.spawn;
      window.__mc.player.fixedCam = { pos: [p[0]+10,p[1]+9,p[2]+6], target: [p[0],p[1]+1,p[2]-8], fov: 60 };
    })()`);
    await t.waitFor(
      `!document.querySelector('[data-testid=celebration]') && !document.querySelector('[data-testid=toast]')`,
    );
    await t.ev('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
    const calls = await t.calls();
    assert.ok(calls.calls < 350, `${id}: ${calls.calls} llamadas`);
    await t.shot(resolve(`capturas/mc-54/${id}.png`));
    console.log(`PASA ${id}: decoración y destacado; ${calls.calls} llamadas; captura guardada`);
    await evento(id, dia, 'olancho', false);
    await t.ev(`${S}.goLobby()`);
    await t.waitFor(
      `!!document.querySelector('[data-testid=evento-${id}]') && !!window.__mc.scene.getObjectByName('evento-${id}')`,
    );
    await t.click(`evento-ir-${id}`);
    await t.waitFor(`${S}.scene.kind === 'dept' && ${S}.scene.id === '${dept}'`);
  }
  await evento('juniana', '2026-06-20', 'cortes', true);
  const saldo = await t.ev(`JSON.stringify([${S}.profile.coins, ${S}.profile.xp])`);
  await fecha('2026-07-01');
  await t.waitFor(
    `!document.querySelector('[data-testid=evento-juniana]') && !window.__mc.scene.getObjectByName('evento-juniana')`,
  );
  assert.equal(
    await t.ev(`JSON.stringify([${S}.profile.coins, ${S}.profile.xp])`),
    saldo,
    'cambiar la fecha no paga premios',
  );
  await evento('inmaculada', '2026-12-06', 'elparaiso', true);
  assert.ok(await t.exists('evento-navidad'), 'las fiestas simultáneas conviven');
  await t.ev(`${S}.goLobby()`);
  await t.waitFor(
    `!!window.__mc.scene.getObjectByName('evento-inmaculada') && !!window.__mc.scene.getObjectByName('evento-navidad')`,
  );
  await t.ev('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
  assert.ok((await t.calls()).calls < 350, 'lobby con dos fiestas bajo 350 llamadas');
  console.log('PASA cambio de fecha en vivo sin premios; lobby con dos fiestas');
  await fecha('2026-02-30');
  await t.waitFor(
    `!document.querySelector('[data-testid=eventos]') || document.querySelector('[data-testid=eventos]').dataset.fecha !== '2026-02-30'`,
  );
  await t.ev(`location.hash = 'go,fecha=2026-06-20'`);
  await t.ev(`${S}.travel('cortes')`);
  await t.waitFor(
    `!document.querySelector('[data-testid=eventos]') || document.querySelector('[data-testid=eventos]').dataset.fecha === [new Date().getFullYear(), String(new Date().getMonth()+1).padStart(2,'0'), String(new Date().getDate()).padStart(2,'0')].join('-')`,
  );
  console.log('PASA fecha inválida y override fuera de #test ignorados');
});
process.exitCode = ok ? 0 : 1;
