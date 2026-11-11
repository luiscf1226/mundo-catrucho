import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { VIAJES } from '../src/game/viaje/routes.ts';
import { run } from './harness.mjs';

const fase = process.env.MC_FASE ?? 'despues';
const shots = resolve('capturas/pulido-viaje', fase);
const ok = await run(
  'pulido-viaje',
  process.argv[2] ?? resolve('apps/web/dist/mundo-catrucho-hd.html'),
  { hash: '#go,test,hora=12', ...(process.env.MC_MOVIL ? { width: 390, height: 844, touch: true } : {}) },
  async (t) => {
    await t.waitFor('!!window.__mc?.gl', 60000);
    const empezar = async (veh, de, a) => {
      await t.ev(
        `window.__mc.store.getState().travel('${de}'); window.__mc.store.getState().startViaje('${veh}','${a}')`,
      );
      await t.waitFor("!!window.__mcCamino && !!document.querySelector('[data-testid=viaje-hud]')");
    };
    const foto = async (id) => {
      const frame = await t.ev('window.__mc.gl.info.render.frame');
      await t.waitFor(`window.__mc.gl.info.render.frame > ${frame + 3}`);
      const calls = await t.calls();
      console.log(id, JSON.stringify(calls));
      assert.ok(calls.calls < 350, id);
      await t.shot(`${shots}/${id}.png`);
    };
    await empezar('taxi', 'franciscomorazan', 'cortes');
    for (let i = 0; i < VIAJES.eventosDeCarretera.length; i++) {
      await t.ev(`window.__mcCamino.evento(${i})`);
      await t.waitFor(
        `document.querySelector('[data-testid=viaje-evento]')?.dataset.evento===${JSON.stringify(VIAJES.eventosDeCarretera[i].nombre)}`,
      );
      await foto(`evento-${String(i).padStart(2, '0')}`);
    }
    if (fase !== 'antes') {
      await t.ev(
        `for (const text of ['Primero','Segundo','Tercero','Tercero']) window.__mc.store.getState().toast(text)`,
      );
      assert.equal(await t.ev("document.querySelectorAll('[data-testid=toast]').length"), 2);
      assert.deepEqual(await t.ev('window.__mc.store.getState().toasts.map(t=>t.text)'), ['Segundo', 'Tercero']);
      assert.ok(
        await t.ev(
          `(()=>{const a=document.querySelector('[data-testid=toast]').getBoundingClientRect(), b=document.querySelector('[data-testid=viaje-hud] > div').getBoundingClientRect(); return a.top>=b.bottom || a.bottom<=b.top || a.left>=b.right || a.right<=b.left})()`,
        ),
        'Los avisos no tapan el panel',
      );
      assert.ok(
        await t.ev(
          `[...document.querySelectorAll('[data-testid=toast]')].every(e=>{const r=e.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight})`,
        ),
        'Los avisos quedan dentro de la pantalla',
      );
      await foto('avisos');
    }
    for (const [veh, de, a] of [
      ['lancha', 'atlantida', 'islas'],
      ['ferry', 'atlantida', 'islas'],
      ['cayuco', 'graciasadios', 'graciasadios'],
      ['avioneta', 'atlantida', 'graciasadios'],
    ]) {
      await empezar(veh, de, a);
      await foto(veh);
    }
  },
);
process.exitCode = ok ? 0 : 1;
