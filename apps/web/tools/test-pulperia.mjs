import { run } from "./harness.mjs";
const file = process.argv[2] ||
  "/tmp/claude-1000/mc-minib/mundo-catrucho-roblox.html";
const assert = (v, m) => {
  if (!v) throw Error(m);
};
let ok = await run("pulperia", file, { hash: "#test,go" }, async (t) => {
  await t.ev(`window.__mc.store.getState().startMinigame('pulperia')`);
  await t.click("mg-start");
  const state = () => t.ev(`window.__mcTest.pulperia.state()`);
  async function move(x, z) {
    await t.ev(`window.__mc.player.teleport(${x},0,${z})`);
    await t.sleep(180);
  }
  async function item(id) {
    const p = await t.ev(`window.__mcTest.pulperia.stations['${id}'].pos`);
    await move(p[0], p[2]);
    if (id === "baleada") await t.sleep(1650);
    else await t.press("e");
    assert((await state()).held === id, "no recogió " + id);
  }
  await t.waitFor(
    `window.__mcTest?.pulperia.state().customers.some(c=>c.stage==='wait')`,
  );
  let c = (await state()).customers.find((c) => c.stage === "wait");
  await item("churros");
  await move(-3 + c.slot * 3, -2.2);
  await t.press("e");
  assert((await state()).wrong === 1, "no rechazó pedido equivocado");
  await move(2, 3.7);
  await t.press("e");
  for (let i = 0; i < 6; i++) {
    await t.waitFor(
      `window.__mcTest.pulperia.state().customers.some(c=>c.stage==='wait')`,
    );
    c = (await state()).customers.find((c) => c.stage === "wait");
    const before = (await state()).money;
    await item(c.item);
    await move(-3 + c.slot * 3, -2.2);
    await t.press("e");
    assert((await state()).money > before, "no pagó entrega");
  }
  await t.waitFor(
    `window.__mcTest.pulperia.state().customers.some(c=>c.stage==='wait')`,
  );
  await t.ev(`window.__mcTest.pulperia.age()`);
  await t.sleep(400);
  assert((await state()).lost > 0, "nadie se fue");
  await t.ev(`window.__mcTest.pulperia.skip(90)`);
  await t.waitFor(`window.__mc.store.getState().mg.phase==='ended'`);
  const mg = (await t.state()).mg;
  assert(
    mg.result.stars ===
      (mg.result.score >= 260
        ? 3
        : mg.result.score >= 180
        ? 2
        : mg.result.score >= 100
        ? 1
        : 0),
    "estrellas",
  );
  console.log(mg.result, "render", await t.calls(), "fps", await t.fps());
});
ok = await run(
  "pulperia-tactil",
  file,
  { hash: "#test,go", touch: true },
  async (t) => {
    await t.waitFor(`!!window.__mc`);
    await t.ev(`window.__mc.store.getState().startMinigame('pulperia')`);
    await t.waitFor(`!!document.querySelector('[data-testid=mg-start]')`);
    await t.ev(`document.querySelector('[data-testid=mg-start]').click()`);
    await t.waitFor(
      `window.__mcTest?.pulperia.state().customers.some(c=>c.stage==='wait')`,
    );
    await t.ev(`window.__mc.player.teleport(-5,0,1)`);
    await t.sleep(1750);
    assert(
      await t.ev(`window.__mcTest.pulperia.state().held==='baleada'`),
      "comal táctil",
    );
    await t.ev(`window.__mc.player.teleport(-3,0,-2.2)`);
    await t.sleep(250);
    await t.ev(
      `(()=>{const e=document.querySelector('[data-testid=touch-use]');for(const type of ['pointerdown','pointerup'])e.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerType:'touch',pointerId:43}));})()`,
    );
    await t.sleep(200);
    assert(
      await t.ev(`window.__mcTest.pulperia.state().money>0`),
      "entrega con E táctil",
    );
    await t.ev(`window.__mcTest.pulperia.skip(90)`);
    await t.waitFor(`window.__mc.store.getState().mg.phase==='ended'`);
  },
) && ok;
process.exit(ok ? 0 : 1);
