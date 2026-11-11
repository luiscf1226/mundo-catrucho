import assert from 'node:assert/strict';
import { run } from './harness.mjs';

const file = process.argv[2] ?? '/tmp/claude-1000/mc-viaje/mundo-catrucho-hd.html';
const shots = '/tmp/claude-1000/mc-viaje/capturas';
const ok = await run('viaje', file, { hash: '#go,test' }, async (t) => {
  await t.waitFor('!!window.__mc?.gl', 60000);
  await t.ev(`window.__mc.store.getState().addCoins(100)`);
  await t.ev(`window.__mc.store.getState().openPanel('transporte')`);
  await t.click('tr-veh-rapidito');
  await t.click('tr-to-franciscomorazan');
  await t.shot(`${shots}/terminal.png`);
  const before = await t.ev('window.__mc.store.getState().profile.coins');
  await t.click('tr-go');
  await t.waitFor(`!!document.querySelector('[data-testid=viaje-hud]')`);
  assert.equal(await t.ev('window.__mc.store.getState().profile.coins'), before - 4);
  await t.sleep(1500);
  await t.shot(`${shots}/rapidito-ciudad.png`);
  const radio = await t.text('viaje-radio');
  await t.click('viaje-radio');
  assert.notEqual(await t.text('viaje-radio'), radio);
  await t.press('f');
  await t.hold('d', 300);
  await t.hold('a', 300);
  await t.waitFor(`window.__mc.store.getState().scene.kind === 'dept'`, 65000);
  assert.equal(await t.ev('window.__mc.store.getState().scene.id'), 'franciscomorazan');
  for (const veh of ['bus', 'taxi']) {
    await t.ev(`window.__mc.store.getState().openPanel('transporte')`);
    await t.click(`tr-veh-${veh}`);
    await t.click('tr-to-lapaz');
    await t.click('tr-go');
    await t.sleep(1800);
    await t.shot(`${shots}/${veh}-montana.png`);
    const calls = await t.calls();
    console.log(veh, calls);
    assert.ok(calls.calls < 350, `Llamadas excesivas: ${calls.calls}`);
    await t.click('viaje-skip');
    await t.waitFor(
      `window.__mc.store.getState().scene.kind === 'dept' && window.__mc.store.getState().scene.id === 'lapaz'`,
    );
  }
  await t.ev(
    `window.__mc.store.setState(s => ({profile:{...s.profile,coins:0}})); window.__mc.store.getState().openPanel('transporte')`,
  );
  await t.click('tr-veh-taxi');
  await t.click('tr-to-cortes');
  await t.click('tr-go');
  assert.equal(await t.ev('window.__mc.store.getState().scene.kind'), 'dept');
  assert.ok(
    await t.ev(
      `Array.from(document.querySelectorAll('[data-testid=toast]')).some(e => e.textContent.includes('pisto'))`,
    ),
  );
  assert.equal(await t.ev('window.__mc.store.getState().profile.coins'), 0);
});
process.exitCode = ok ? 0 : 1;
