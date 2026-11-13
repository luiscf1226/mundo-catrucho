import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { run } from './harness.mjs';

if (process.env.MC_GPU === '0') {
  console.log('SALTA motores táctiles: recorrido con GPU');
  process.exit(0);
}
const motores = [
  ...readFileSync('apps/web/src/game/minigames/index.ts', 'utf8').matchAll(/^ {2}(?:'([^']+)'|(\w+)): motor\(/gm),
].map((m) => m[1] ?? m[2]);
assert.ok(motores.length > 0, 'Registro con motores');
const shard = Number(process.env.MC_SHARD ?? 0);
const shards = Number(process.env.MC_SHARDS ?? 1);
assert.ok(
  Number.isInteger(shards) && shards > 0 && Number.isInteger(shard) && shard >= 0 && shard < shards,
  'Fragmento válido',
);
const seleccion = motores.filter(
  (id, i) => i % shards === shard && (!process.env.MC_MOTOR || id === process.env.MC_MOTOR),
);
assert.ok(seleccion.length > 0, 'Hay motores seleccionados');
const suffix = process.env.MC_MOTOR ? `-${process.env.MC_MOTOR}` : shards > 1 ? `-${shard}` : '';
const out = resolve('capturas/mc-04');
mkdirSync(out, { recursive: true });
const saved = `${out}/motores${suffix}.json`;
const rows =
  process.env.MC_RESUME === '1' && existsSync(saved)
    ? JSON.parse(readFileSync(saved, 'utf8')).filter((r) => r.estado === 'OK' && seleccion.includes(r.motor))
    : [];
const S = 'window.__mc.store.getState()';
async function caminar(t, x, z) {
  const inicio = Date.now();
  while (await t.ev(`Math.hypot(window.__mc.player.pos[0]-(${x}),window.__mc.player.pos[2]-(${z})) > .8`)) {
    assert.ok(Date.now() - inicio < 60000, 'Llega caminando al puesto');
    await t.ev(
      `(()=>{const p=window.__mc.player,dx=${x}-p.pos[0],dz=${z}-p.pos[2],d=Math.hypot(dx,dz),c=Math.cos(p.camYaw),s=Math.sin(p.camYaw),e=document.querySelector('[data-testid=touch-joy]'),r=e.getBoundingClientRect();e.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'touch',pointerId:8,buttons:1,clientX:r.x+r.width/2+(dx*c-dz*s)/d*44,clientY:r.y+r.height/2+(dx*s+dz*c)/d*44}));})()`,
    );
    await t.sleep(80);
  }
  await t.ev(
    `document.querySelector('[data-testid=touch-joy]').dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:8}))`,
  );
}
async function jugarFeria(t) {
  await caminar(t, -11, 0.4);
  await t.click('touch-use');
  await t.waitFor('window.__mcTest.feria.state().booth === 0');
  while (await t.ev('window.__mcTest.feria.state().booth === 0')) {
    await t.waitFor('window.__mcTest.feria.state().ready || window.__mcTest.feria.state().booth < 0');
    if (await t.ev('window.__mcTest.feria.state().booth < 0')) break;
    const puntos = await t.ev('window.__mcTest.feria.targets()');
    const blanco = puntos
      .filter((p) => p.x > 10 && p.x < 402 && p.y > 230 && p.y < 690)
      .sort((a, b) => b.points - a.points)[0];
    const tiros = await t.ev('window.__mcTest.feria.state().shots');
    await t.mouse(blanco?.x ?? 206, blanco?.y ?? 450);
    await t.waitFor(`window.__mcTest.feria.state().shots < ${tiros}`);
  }
  await caminar(t, 20, 3);
  await t.click('touch-use');
  await t.waitFor("!!document.querySelector('[data-testid=mg-result]')", 15000);
}

const ok = await run(
  'tactil-motores',
  process.argv[2] ?? 'apps/web/dist/mundo-catrucho-hd.html',
  { width: 412, height: 915, touch: true, hash: '#test,go' },
  async (t) => {
    for (const id of seleccion) {
      if (rows.some((r) => r.motor === id && r.estado === 'OK')) continue;
      try {
        await t.ev(`${S}.startMinigame(${JSON.stringify(id)})`);
        await t.click('mg-start');
        await t.waitFor(`${S}.mg?.phase === 'playing' && !!document.querySelector('[data-testid=touch-fire]')`);
        // Hit testing prevents a hidden or covered control from passing by synthetic dispatch.
        const hit = await t.ev(
          `['joy','fire','jump','use','alt'].map(id=>{const e=document.querySelector('[data-testid=touch-'+id+']'),r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return {id,ok:x>=0&&y>=0&&x<innerWidth&&y<innerHeight&&e.contains(document.elementFromPoint(x,y))}})`,
        );
        assert.ok(
          hit.every((x) => x.ok),
          JSON.stringify(hit),
        );
        await t.shot(`${out}/${id}-jugando.png`);
        if (id === 'feria') await jugarFeria(t);
        const kit = await t.ev(`window.__mcTest?.motor?.estado().id === ${JSON.stringify(id)}`);
        // No bot, keyboard, input assignments, injected score or direct finish.
        // Kit clock steps still call the actual mechanics with each touch action.
        const limit = kit ? 30000 : id === 'exploradores' ? 420000 : 240000;
        const started = Date.now();
        let n = 0;
        while (!(await t.exists('mg-result')) && Date.now() - started < limit) {
          if (await t.exists('dialog-close')) await t.click('dialog-close');
          await t.ev(`(()=>{
          const tap=(el,x,y)=>{if(!el)return;for(const type of ['pointerdown','pointerup'])el.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerType:'touch',pointerId:7,clientX:x,clientY:y,buttons:type==='pointerdown'?1:0}));};
          for(let i=0;i<${kit ? 20 : 1};i++){
            const k=${n}+i;
            const joy=document.querySelector('[data-testid=touch-joy]');
            if(joy){const r=joy.getBoundingClientRect();joy.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'touch',pointerId:8,buttons:1,clientX:r.x+r.width/2+Math.sin(k*.7)*44,clientY:r.y+r.height/2+Math.cos(k*.7)*44}));}
            const canvas=document.querySelector('[data-testid=canvas-wrap]');
            tap(canvas,innerWidth*(.2+(k%7)*.1),innerHeight*(.3+(k%5)*.06));
            const el=document.querySelector('[data-testid=touch-'+(['fire','use','jump','alt'][k%4])+']');
            if(el){const r=el.getBoundingClientRect();tap(el,r.x+r.width/2,r.y+r.height/2);}
            ${kit ? 'window.__mcTest.motor.avanzar(.25);' : ''}
          }
        })()`);
          n += kit ? 20 : 1;
          await t.sleep(kit ? 16 : 100);
        }
        assert.ok(await t.exists('mg-result'), 'No llega al resultado');
        const result = await t.ev(`${S}.mg.result`);
        rows.push({
          motor: id,
          estado: 'OK',
          victoria: result.won,
          score: result.score,
          detalle: result.won ? 'Etapa ganada con toques' : 'Etapa hasta resultado con derrota; no acredita victoria',
        });
        await t.shot(`${out}/${id}-resultado.png`);
        console.log(`${id}: ${JSON.stringify(rows.at(-1))}`);
      } catch (e) {
        rows.push({ motor: id, estado: 'issue', detalle: e.message });
        console.log(`${id}: ISSUE ${e.message}`);
      }
      writeFileSync(`${out}/motores${suffix}.json`, JSON.stringify(rows, null, 2));
    }
    writeFileSync(
      `${out}/motores${suffix}.md`,
      '| Motor | Estado | Detalle |\n|---|---|---|\n' +
        rows.map((r) => `| ${r.motor} | ${r.estado} | ${r.detalle} |`).join('\n'),
    );
    assert.equal(rows.length, seleccion.length);
    assert.ok(
      rows.every((r) => r.estado === 'OK'),
      'Hay motores pendientes; ver motores.md',
    );
  },
);
process.exitCode = ok ? 0 : 1;
