import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { run } from './harness.mjs';

if (process.env.MC_GPU === '0') {
  console.log('SALTA celular: necesita GPU real');
  process.exit(0);
}
const file = process.argv[2] ?? 'apps/web/dist/mundo-catrucho-hd.html';
const etiqueta = process.argv[3] ?? 'despues';
const out = resolve('capturas/mc-56');
mkdirSync(out, { recursive: true });
const S = 'window.__mc.store.getState()';
const rows = [];
const ok = await run('celular', file, { width: 412, height: 915, touch: true, hash: '#go' }, async (t) => {
  await t.cdp('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 2.6, mobile: true });
  await t.cdp('Emulation.setCPUThrottlingRate', { rate: 4 });
  await t.waitFor('!!window.__mc.gl');
  const gpu = await t.ev(
    `(()=>{const g=window.__mc.gl.getContext(),e=g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)})()`,
  );
  console.log('EMULACIÓN 412×915 DPR 2.6 CPU ×4; GPU:', gpu);
  assert.ok(!/swiftshader|llvmpipe/i.test(gpu), 'Se requiere GPU real');
  for (const [nombre, accion] of [
    ['lobby', `${S}.goLobby()`],
    ...['olancho', 'franciscomorazan', 'cortes'].map((id) => [id, `${S}.travel('${id}')`]),
    ...['futbol', 'ritmo', 'corte', 'cortes.gruas'].map((id) => [id, `${S}.startMinigame('${id}')`]),
  ]) {
    await t.ev(accion);
    if (await t.exists('mg-start')) await t.click('mg-start');
    await t.waitFor(`!document.querySelector('[data-testid=scene-loading]') && !!window.__mc.gl`);
    await t.sleep(2500);
    if (await t.exists('mg-start')) await t.click('mg-start');
    for (let repeticion = 0; repeticion < 5; repeticion++) {
      const muestra = await t.ev(
        `new Promise(resolve=>{const frames=[];let prev;const renderStart=window.__mc.gl.info.render.frame;const start=performance.now();function frame(now){if(prev!==undefined)frames.push(now-prev);prev=now;if(now-start<4000)requestAnimationFrame(frame);else{const sorted=[...frames].sort((a,b)=>a-b);resolve({p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],over33:100*frames.filter(x=>x>33).length/frames.length,over34:100*frames.filter(x=>x>34).length/frames.length,fps:1000*frames.length/frames.reduce((a,b)=>a+b,0),frames:frames.length,rendered:window.__mc.gl.info.render.frame-renderStart,calls:window.__mc.gl.info.render.calls,dpr:window.__mc.gl.getPixelRatio()})}}requestAnimationFrame(frame)})`,
      );
      assert.ok(muestra.rendered >= muestra.frames - 2, 'Se dibujan cuadros durante la medición');
      assert.ok(muestra.calls < 350, `Presupuesto de dibujo: ${muestra.calls}`);
      if (nombre.includes('.') || ['futbol', 'ritmo', 'corte'].includes(nombre))
        assert.equal(await t.ev(`${S}.mg?.phase`), 'playing', 'Motor activo durante la medición');
      rows.push({ nombre, repeticion, ...muestra });
      console.log(`${etiqueta} ${nombre} ${repeticion}: ${JSON.stringify(muestra)}`);
    }
    await t.shot(`${out}/${etiqueta}-${nombre}.png`);
  }
  writeFileSync(
    `${out}/${etiqueta}.json`,
    JSON.stringify({ gpu, cpu: 4, width: 412, height: 915, dpr: 2.6, rows }, null, 2),
  );
  if (etiqueta !== 'antes')
    for (const r of rows) {
      assert.ok(r.p95 <= 34 && r.over34 <= 5, `${r.nombre}: 30 fps estables (p95 ≤34ms (redondeo de 30Hz); ≤5% fuera)`);
    }
});
process.exitCode = ok ? 0 : 1;
