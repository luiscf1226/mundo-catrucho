// Clima: con lluvia el piso se moja de a poco, los charcos se llenan después y al escampar todo se seca de a poco
// (sky.tsx, world.wet y world.pud). La imagen no queda negra ni quemada con lluvia, de día ni de noche.
// Uso: node apps/web/tools/test-clima.mjs <html>   (con #ciclo=rapido el clima va 8 veces más rápido)
import assert from 'node:assert/strict';
import { run } from './harness.mjs';

const file = process.argv[2] ?? 'apps/web/dist/mundo-catrucho-hd.html';
const S = 'window.__mc.store.getState()',
  W = 'window.__mc.clima';
const brillo = `new Promise(r=>requestAnimationFrame(()=>{const c=document.createElement('canvas');c.width=64;c.height=36;const x=c.getContext('2d');x.drawImage(window.__mc.gl.domElement,0,0,64,36);const d=x.getImageData(0,0,64,36).data;let s=0;for(let i=0;i<d.length;i+=4)s+=(d[i]*0.2126+d[i+1]*0.7152+d[i+2]*0.0722)/255;r(s/(d.length/4))}))`;
let v = 0;
const clima = (t, c, h = 12) => t.ev(`location.hash = '#go,ciclo=rapido,hora=${h},clima=${c},v${v++}'`);

const ok = await run(
  'clima',
  file,
  { hash: '#go,ciclo=rapido,clima=despejado,hora=12', width: 960, height: 540 },
  async (t) => {
    await t.waitFor(`${S}.scene.kind==='lobby' && !!window.__mc.gl`, 30000, 'el lobby');
    // los materiales se arman con la calidad del arranque: se fuerza alta (media sin GPU) y se recarga, así se
    // compilan el piso mojado, la orilla, los cáusticos y los reflejos (en GitHub la calidad automática sería baja)
    const q = process.env.MC_GPU === '0' ? 'media' : 'alta';
    await t.ev(`${S}.setSettings({ quality: '${q}', calidadElegida: true })`);
    await t.sleep(800);
    await t.ev('location.reload()');
    await t.sleep(1500);
    await t.waitFor(`${S}.scene.kind==='lobby' && !!window.__mc.gl`, 30000, 'el lobby de nuevo');
    console.log(`calidad ${q}, posproceso ${await t.ev('window.__mc.post ?? null')}`);
    await t.ev(`${S}.travel('franciscomorazan')`);
    await t.waitFor(`${S}.scene.kind==='dept' && ${S}.scene.id==='franciscomorazan'`, 30000, 'Tegucigalpa');
    // el cielo de la escena nueva arranca con el clima de ese momento (R.first en sky.tsx): si la lluvia llega antes
    // de que Tegucigalpa termine de montar, el piso nace mojado. Sin GPU la escena tarda: se espera que cargue y
    // dibuje unos cuadros.
    await t.waitFor(`!document.querySelector('[data-testid=scene-loading]')`, 60000, 'Tegucigalpa cargada');
    const f0 = await t.ev('window.__mc.gl.info.render.frame');
    await t.waitFor(`window.__mc.gl.info.render.frame > ${f0 + 3}`, 60000, 'cuadros de Tegucigalpa');
    await t.waitFor(`${W} && ${W}.wet < 0.05 && ${W}.rain < 0.05`, 30000, 'piso seco al empezar');
    await clima(t, 'lluvia');
    // empieza a llover: el piso todavía no está mojado del todo y los charcos van detrás
    await t.waitFor(`${W}.rain > 0.3`, 30000, 'empieza a llover');
    const al = await t.ev(W);
    assert.ok(al.wet < 0.85, `el piso se moja de a poco (${al.wet.toFixed(2)} al empezar)`);
    await t.waitFor(`${W}.wet > 0.9`, 120000, 'piso mojado');
    const mojado = await t.ev(W);
    assert.ok(
      mojado.pud < mojado.wet,
      `los charcos se llenan después (${mojado.pud.toFixed(2)} < ${mojado.wet.toFixed(2)})`,
    );
    await t.waitFor(`${W}.pud > 0.6`, 120000, 'charcos llenos');
    // sin GPU (GitHub) va a ~1 cuadro por segundo: el secado y la noche se prueban con GPU
    if (process.env.MC_GPU === '0') {
      console.log(
        `SALTA noche y secado sin GPU (mojado al empezar ${al.wet.toFixed(2)}, charcos ${mojado.pud.toFixed(2)})`,
      );
      return;
    }
    const dia = await t.ev(brillo);
    await clima(t, 'lluvia', 21);
    await t.sleep(1500);
    const noche = await t.ev(brillo);
    console.log(`lluvia de día ${dia.toFixed(2)}, de noche ${noche.toFixed(2)}`);
    assert.ok(dia > 0.15 && dia < 0.85, `con lluvia de día se ve (${dia})`);
    assert.ok(noche > 0.05 && noche < 0.7, `con lluvia de noche se ve (${noche})`);
    // escampa: deja de llover pero el piso sigue mojado un rato y los charcos se secan de último
    await clima(t, 'despejado');
    await t.waitFor(`${W}.rain < 0.1`, 120000, 'escampa');
    const esc = await t.ev(W);
    assert.ok(esc.wet > 0.3, `al escampar el piso sigue mojado (${esc.wet.toFixed(2)})`);
    await t.waitFor(`${W}.wet < 0.15`, 180000, 'el piso se seca');
    const seco = await t.ev(W);
    assert.ok(seco.pud > seco.wet, `los charcos se secan de último (${seco.pud.toFixed(2)} > ${seco.wet.toFixed(2)})`);
    // el mar de Roatán con hondura (orilla, fondo a la vista, cáusticos) tampoco se rompe
    await t.ev(`${S}.travel('islas')`);
    await t.waitFor(`${S}.scene.kind==='dept' && ${S}.scene.id==='islas'`, 30000, 'Islas de la Bahía');
    await t.sleep(2000);
    const mar = await t.ev(brillo);
    assert.ok(mar > 0.15 && mar < 0.85, `el mar se ve (${mar})`);
    console.log(
      `mojado al empezar ${al.wet.toFixed(2)}, charcos con piso mojado ${mojado.pud.toFixed(2)}, al escampar ${esc.wet.toFixed(2)}`,
    );
  },
);
process.exit(ok ? 0 : 1);
