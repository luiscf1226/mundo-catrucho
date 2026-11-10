import assert from 'node:assert/strict';
import { run } from './harness.mjs';

const file = process.argv[2],
  look = process.argv.includes('--look');
const out = `/tmp/claude-1000/mc-minia/shots/${file.includes('roblox') ? 'roblox' : 'hd'}`;
const ok = await run('carrera', file, { hash: look ? '#go' : '#test,go' }, async (t) => {
  await t.ev(`window.__mc.store.getState().startMinigame('carrera')`);
  await t.click('mg-start');
  const p = (await t.state()).pos;
  await t.hold('w', 1000);
  assert(Math.abs((await t.state()).pos[2] - p[2]) < 0.3, 'cuenta regresiva bloquea');
  await t.sleep(2300);
  await t.holdUntil('w', 'window.__mc.player.pos[2]<-12');
  assert((await t.state()).pos[2] < -12, 'W mueve');
  if (look) {
    const jumps = [-38.5, -57.1, -70, -76, -98, -104.5, -111, -183, -200];
    let j = 0,
      shot = 0,
      lastZ = 0;
    await t.down('w');
    if (process.argv.includes('--sprint')) await t.down('Shift');
    const start = Date.now();
    try {
      while ((await t.state()).mg.phase === 'playing' && Date.now() - start < 115000) {
        const z = (await t.state()).pos[2];
        if (z > lastZ + 5) {
          j = jumps.findIndex((v) => v < z);
          if (j < 0) j = jumps.length;
          console.log('reaparición', z);
        }
        lastZ = z;
        if (j < jumps.length && z <= jumps[j]) {
          await t.press(' ');
          j++;
        }
        if (shot < 4 && z < [-18, -80, -126, -174][shot]) {
          await t.up('w');
          await t.shot(`${out}/carrera-${shot + 1}.png`);
          console.log('vista', shot + 1, await t.calls(), 'fps', await t.fps());
          shot++;
          await t.down('w');
        }
        await t.sleep(70);
      }
    } finally {
      await t.up('w');
      await t.up('Shift');
    }
    console.log('recorrido real', await t.state());
    assert((await t.state()).mg.result?.won, 'ganar el recorrido con teclas');
    return;
  }
  await t.ev(`window.__mc.player.teleport(0,0,-48)`);
  await t.sleep(250);
  await t.ev(`window.__mc.player.teleport(0,-6,-107)`);
  await t.sleep(350);
  assert(Math.abs((await t.state()).pos[2] + 48) < 1, 'caída vuelve al checkpoint');
  for (let i = 1; i < 4; i++) {
    await t.ev(`window.__mc.player.teleport(...window.__mcTest.carrera.checkpoints[${i}])`);
    await t.sleep(250);
  }
  await t.ev(`window.__mc.player.teleport(...window.__mcTest.carrera.meta)`);
  await t.waitFor(`window.__mc.store.getState().mg.phase==='ended'`);
  const s = await t.state();
  assert(s.mg.result.won);
  assert(s.mg.result.stars >= 1 && s.mg.result.stars <= 3);
  assert.match(s.mg.result.label, /^\d+:\d\d$/);
  assert(s.mg.rewards.coins > 0);
  await t.click('mg-replay');
  await t.click('mg-start');
  await t.sleep(3300);
  await t.ev(`window.__mcTest.carrera.addTime(121)`);
  await t.waitFor(`window.__mc.store.getState().mg.phase==='ended'`);
  assert.equal((await t.state()).mg.result.won, false);
});
process.exit(ok ? 0 : 1);
