import assert from 'node:assert/strict';
import { createDrive, stepDrive, vehicleKind, vehicles } from '../src/game/viaje/model.ts';
import { run } from './harness.mjs';

// Verify observable physics independently of rendering, including the water variants.
for (const veh of Object.keys(vehicles)) {
  const c = {
    veh,
    via: veh === 'lancha' || veh === 'cayuco' ? 'rio' : 'carretera',
    difficulty: 0.7,
    trip: false,
    seed: 504,
  };
  const s = createDrive(c);
  s.traffic.forEach((a) => (a.z = -180));
  const before = s.speed;
  stepDrive(s, c, 0.05, 1, -1, false);
  assert.ok(s.x > 0 && s.speed > before);
  stepDrive(s, c, 0.05, 0, 1, false);
  assert.ok(s.speed < before + 0.1);
  s.traffic[0].z = -20;
  s.traffic[0].x = s.x;
  s.traffic[0].kind = c.via === 'rio' ? 'lancha' : 'taxi';
  stepDrive(s, c, 0.05, 0, 0, true);
  assert.notEqual(s.traffic[0].yield, 0);
  s.traffic[0].z = 0;
  s.traffic[0].x = s.x;
  const speed = s.speed;
  assert.ok(stepDrive(s, c, 0.05, 0, 0, false).collision);
  assert.equal(s.hits, 1);
  assert.ok(s.speed < speed && s.shake > 0);
  if (veh === 'bus') assert.ok(s.speed > speed * 0.8);
}
assert.equal(vehicleKind('microbus'), 'rapidito');
assert.equal(vehicleKind('desconocido'), 'pickup');
const file = process.argv[2] ?? '/tmp/claude-1000/mc-viaje/mundo-catrucho-hd.html';
const shots = '/tmp/claude-1000/mc-viaje/capturas';
const ok = await run('manejo', file, { hash: '#go,test' }, async (t) => {
  for (const id of ['franciscomorazan.rapidito', 'franciscomorazan.va-vacio--cabe-una-nube', null]) {
    await t.ev(
      id ? `window.__mc.store.getState().startJuego('${id}')` : `window.__mc.store.getState().startMinigame('manejo')`,
    );
    await t.click('mg-start');
    await t.sleep(1000);
    await t.shot(`${shots}/manejo-${id ?? 'libre'}.png`);
    console.log(id, await t.calls());
    let finished = false,
      honked = false;
    const started = Date.now();
    while (Date.now() - started < 125000) {
      const state = await t.ev(
        `(()=>{const g=window.__mc.store.getState();return {phase:g.mg.phase,h:g.mgHud,result:g.mg.result}})()`,
      );
      if (state.phase === 'ended') {
        assert.ok(state.result.won, JSON.stringify(state));
        assert.ok(state.result.stats.recogidos > 0);
        finished = true;
        break;
      }
      const line = state.h.lines?.[0] ?? '',
        match = line.match(/(\d+) km\/h · (\d+) choques · (\d+)\//);
      const x = Number(state.h.lines?.[2]?.match(/Carril (-?[\d.]+)/)?.[1] ?? 0);
      const speed = Number(match?.[1] ?? 0) / 3.6,
        dist = Number(match?.[3] ?? 0);
      const objective = state.h.objective ?? '';
      const stop = objective.includes('parada a') ? Number(objective.match(/parada a (\d+)/)?.[1]) : 999;
      // Drive using only the public input and visible HUD; brake before entering each marked bay.
      const approach = stop < Math.max(45, (speed * speed) / 65 + 28);
      const desiredX = approach ? 6 : -5.7;
      const steer = Math.abs(desiredX - x) > 0.2 ? Math.sign(desiredX - x) : 0;
      const pedal = approach && stop < Math.max(12, (speed * speed) / 65 + 3) ? 1 : -1;
      await t.ev(`window.__mc.input.jx=${steer}; window.__mc.input.jz=${pedal};`);
      if (!honked || Math.floor(dist) % 55 < 5) {
        await t.ev(`window.__mc.input.press('fire')`);
        honked = true;
      }
      await t.sleep(90);
    }
    await t.ev(`window.__mc.input.reset()`);
    assert.ok(finished, `No terminó ${id}`);
    await t.shot(`${shots}/resultado-${id ?? 'libre'}.png`);
  }
});
process.exitCode = ok ? 0 : 1;
