import assert from 'node:assert/strict';
import { run } from './harness.mjs';

const file = process.argv[2],
  look = process.argv.includes('--look');
const out = `/tmp/claude-1000/mc-minia/shots/${file.includes('roblox') ? 'roblox' : 'hd'}`;
const ok = await run('futbol', file, { hash: look ? '#go' : '#test,go' }, async (t) => {
  await t.ev(`window.__mc.store.getState().startMinigame('futbol')`);
  await t.click('mg-start');
  await t.sleep(1600);
  if (look) {
    for (let i = 0; i < 4; i++) {
      if (i === 0) await t.press('f');
      await t.hold(i % 2 ? 'a' : 'w', i === 0 ? 400 : 1000);
      await t.press('f');
      await t.press('q');
      await t.sleep(1300);
      await t.shot(`${out}/futbol-${i + 1}.png`);
      console.log('vista', i + 1, await t.calls(), 'fps', await t.fps(), await t.text('mg-score'));
    }
    return;
  }
  await t.ev(`window.__mcTest.futbol.m.aiOff=true`);
  await t.waitFor(`window.__mcTest.futbol.m.state==='play'`);
  await t.ev(
    `(()=>{const m=window.__mcTest.futbol.m;m.ball.p=[0,.3,0];m.ball.v=[0,0,0];window.__mc.player.teleport(0,0,1.5,0)})()`,
  );
  await t.press('f');
  await t.sleep(200);
  assert(await t.ev(`Math.hypot(...window.__mcTest.futbol.m.ball.v)>2`), 'patear mueve pelota');
  await t.ev(
    `(()=>{const m=window.__mcTest.futbol.m;m.ball.p=[0,.3,-14.8];m.ball.v=[0,0,0];window.__mc.player.teleport(0,0,-13.4,0)})()`,
  );
  await t.press('f');
  await t.waitFor(`window.__mcTest.futbol.m.score[0]===1`);
  await t.waitFor(`window.__mcTest.futbol.m.state==='kickoff'`);
  assert(await t.ev(`Math.abs(window.__mcTest.futbol.m.ball.p[2])<.1`));
  await t.sleep(1500);
  const start = Date.now();
  while (Date.now() - start < 20000) {
    await t.ev(
      `(()=>{const m=window.__mcTest.futbol.m;m.ball.v=[(Math.random()-.5)*65,Math.random()*22,(Math.random()-.5)*65]})()`,
    );
    await t.sleep(180);
    assert(
      await t.ev(
        `(()=>{const m=window.__mcTest.futbol.m,p=m.ball.p;return Math.abs(p[0])<=10&&Math.abs(p[2])<=17.6&&p[1]>=0&&p[1]<=7})()`,
      ),
      'pelota encerrada',
    );
  }
  await t.ev(`(()=>{const m=window.__mcTest.futbol.m;m.score=[3,0];m.state='play';m.clock=.01})()`);
  await t.waitFor(`window.__mc.store.getState().mg.phase==='ended'`);
  const s = await t.state();
  assert(s.mg.result.won);
  assert.equal(s.mg.result.stars, 3);
  assert.equal(s.mg.result.stats.goals, 3);
  await t.click('mg-replay');
  await t.click('mg-start');
  await t.sleep(1600);
  await t.waitFor(`window.__mcTest.futbol.m.state==='play'`);
  await t.ev(`(()=>{const m=window.__mcTest.futbol.m;m.aiOff=true;m.score=[1,1];m.clock=.01})()`);
  await t.waitFor(`window.__mc.store.getState().mg.phase==='ended'`);
  assert.equal((await t.state()).mg.result.won, false);
  assert.match((await t.state()).mg.result.label, /Empate/);
});
process.exit(ok ? 0 : 1);
