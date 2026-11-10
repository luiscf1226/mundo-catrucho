import { run } from './harness.mjs';

const file = process.argv[2] || '/tmp/claude-1000/mc-minib/mundo-catrucho-roblox.html';
const assert = (v, m) => {
  if (!v) throw Error(m);
};
async function start(t) {
  await t.waitFor(`!!window.__mc`);
  await t.ev(`window.__mc.store.getState().startMinigame('feria')`);
  await t.ev(`document.querySelector('[data-testid=mg-start]').click()`);
  await t.waitFor(`!!window.__mcTest?.feria`);
}
async function booth(t, i) {
  await t.ev(`window.__mc.player.teleport(${[-11, 0, 11][i]},0,-.8)`);
  await t.sleep(150);
  await t.press('e');
  await t.waitFor(`window.__mcTest.feria.state().booth===${i}`);
  await t.sleep(1100);
}
async function shoot(t, miss = false) {
  await t.waitFor(`window.__mcTest.feria.state().ready`);
  const before = await t.ev(`window.__mcTest.feria.state().shots`);
  const targets = await t.ev(`window.__mcTest.feria.targets()`);
  const target = targets.find((p) => p.x > 120 && p.x < 1150 && p.y > 200 && p.y < 590) || targets[0];
  if (miss || !target) await t.mouse(1200, 320);
  else await t.mouse(target.x, target.y);
  await t.sleep(30);
  assert(
    (await t.ev(`window.__mcTest.feria.state().shots`)) < before,
    'el tiro no se descontó ' +
      JSON.stringify({
        before,
        target,
        targets,
        st: await t.ev(`window.__mcTest.feria.state()`),
        input: await t.ev(`({px:window.__mc.input.px,py:window.__mc.input.py})`),
      }),
  );
  await t.sleep(1150);
}
let ok = true;
for (const touch of [false, true]) {
  ok =
    (await run(
      `feria-${touch ? 'tactil' : 'mouse'}`,
      file,
      {
        hash: '#test,go',
        touch,
      },
      async (t) => {
        if (touch) {
          t.mouse = async (x, y) => {
            await t.ev(
              `(()=>{const e=document.querySelector('[data-testid=canvas-wrap]');for(const type of ['pointerdown','pointerup'])e.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerType:'touch',pointerId:41,clientX:${x},clientY:${y}}));})()`,
            );
            await t.sleep(80);
          };
        }
        await start(t);
        for (let i = 0; i < 3; i++) {
          await booth(t, i);
          for (let j = 0; j < 6; j++) await shoot(t);
          if (i === 0) {
            assert((await t.ev(`window.__mcTest.feria.state().scores[0]`)) > 0, 'hulera sin impactos');
          }
        }
        await t.waitFor(`window.__mc.store.getState().mg.phase==='ended'`);
        const mg = (await t.state()).mg;
        assert(mg.result.score > 0, 'sin puntos');
        assert(
          mg.result.stars ===
            (mg.result.score >= 400 ? 3 : mg.result.score >= 280 ? 2 : mg.result.score >= 150 ? 1 : 0),
          'estrellas',
        );
        assert(mg.rewards.coins > 0, 'sin recompensa');
        console.log('resultado', mg.result, 'render', await t.calls(), 'fps', await t.fps());
      },
    )) && ok;
}
ok =
  (await run('feria-fallos', file, { hash: '#test,go' }, async (t) => {
    await start(t);
    for (let i = 0; i < 3; i++) {
      await booth(t, i);
      for (let j = 0; j < 6; j++) await shoot(t, true);
    }
    await t.waitFor(`window.__mc.store.getState().mg.phase==='ended'`);
    assert(!(await t.state()).mg.result.won, 'fallar debe perder');
  })) && ok;
process.exit(ok ? 0 : 1);
