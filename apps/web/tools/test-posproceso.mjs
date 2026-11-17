// Posproceso del arte HD (kit/art/hd/post.tsx): se activa en alta y media, se apaga en baja, no deja la imagen negra
// ni quemada y suma pocas llamadas de dibujo. Uso: node apps/web/tools/test-posproceso.mjs <html>
import assert from 'node:assert/strict';
import { run } from './harness.mjs';

const file = process.argv[2] ?? 'apps/web/dist/mundo-catrucho-hd.html';
const S = 'window.__mc.store.getState()';
// brillo medio y contraste de la imagen recién dibujada (se lee en el mismo cuadro, antes de que se borre)
const imagen = `new Promise(r=>requestAnimationFrame(()=>{const c=document.createElement('canvas');c.width=64;c.height=36;const x=c.getContext('2d');x.drawImage(window.__mc.gl.domElement,0,0,64,36);const d=x.getImageData(0,0,64,36).data;let s=0,s2=0;for(let i=0;i<d.length;i+=4){const l=(d[i]*0.2126+d[i+1]*0.7152+d[i+2]*0.0722)/255;s+=l;s2+=l*l}const n=d.length/4,m=s/n;r({media:m,desv:Math.sqrt(Math.max(0,s2/n-m*m)),llamadas:window.__mc.gl.info.render.calls,pasadas:window.__mc.postPasadas?.()??null})}))`;
const calidad = (q) => `${S}.setSettings({ quality: '${q}', calidadElegida: true })`;

const ok = await run('posproceso', file, { hash: '#go', width: 960, height: 540 }, async (t) => {
  await t.waitFor(`${S}.scene.kind==='lobby' && !!window.__mc.gl`, 30000, 'el lobby');
  await t.ev(calidad('alta'));
  await t.sleep(1500);
  if (!(await t.ev('window.__mc.post'))) {
    console.log('SALTA posproceso: este navegador no dibuja en texturas de coma flotante');
    return;
  }
  const medir = async (q) => {
    await t.ev(calidad(q));
    await t.waitFor(`(window.__mc.post ?? 'baja') === '${q}'`, 15000, `posproceso ${q}`);
    await t.sleep(1200);
    const m = await t.ev(imagen);
    console.log(
      `${q.padEnd(6)} brillo ${m.media.toFixed(2)}  contraste ${m.desv.toFixed(2)}  llamadas ${m.llamadas}  posproceso ${m.pasadas ?? 0}`,
    );
    assert.ok(m.media > 0.15 && m.media < 0.85, `imagen ni negra ni quemada en ${q} (${m.media})`);
    assert.ok(m.desv > 0.05, `la imagen tiene detalle en ${q}`);
    return m;
  };
  const alta = await medir('alta'),
    baja = await medir('baja'),
    media = await medir('media');
  // el posproceso suma solo sus pasadas de pantalla completa (la escena se dibuja una vez)
  for (const [q, m] of [
    ['alta', alta],
    ['media', media],
  ])
    assert.ok(m.pasadas >= 8 && m.pasadas <= 16, `el posproceso en ${q} suma entre 8 y 16 llamadas (${m.pasadas})`);
  assert.equal(baja.pasadas, null, 'en baja no hay posproceso');
  // la base es la misma imagen: el brillo medio no se aleja más de lo que oscurecen la oclusión y la viñeta
  assert.ok(
    Math.abs(alta.media - baja.media) < 0.08,
    `alta y baja con brillo parecido (${alta.media} / ${baja.media})`,
  );
  // con agua (mar de Roatán) y de noche tampoco se rompe
  await t.ev(calidad('alta'));
  await t.ev(`${S}.travel('islas')`);
  await t.waitFor(`${S}.scene.kind==='dept' && ${S}.scene.id==='islas'`, 30000, 'Islas de la Bahía');
  await t.sleep(2000);
  await medir('alta');
  await t.ev(`location.hash = '#go,hora=22'`);
  await t.sleep(1500);
  const noche = await t.ev(imagen);
  console.log(`noche  brillo ${noche.media.toFixed(2)}`);
  assert.ok(noche.media > 0.05 && noche.media < 0.7, `de noche se ve (${noche.media})`);
});
process.exit(ok ? 0 : 1);
