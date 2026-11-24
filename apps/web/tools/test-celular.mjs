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
// MC_CPU=8 mide margen con más ralentización: imprime y guarda, pero el umbral solo se exige con el ×4 del criterio.
const cpu = Number(process.env.MC_CPU) || 4;
// `antes…` solo registra la línea base; las demás etiquetas exigen las guardas.
const exigir = !etiqueta.startsWith('antes');
const out = resolve('capturas/mc-56');
mkdirSync(out, { recursive: true });
const S = 'window.__mc.store.getState()';
const rows = [];
const ok = await run('celular', file, { width: 412, height: 915, touch: true, hash: '#go' }, async (t) => {
  await t.cdp('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 2.6, mobile: true });
  await t.cdp('Emulation.setCPUThrottlingRate', { rate: cpu });
  await t.cdp('Performance.enable', {});
  // tiempo de tareas del hilo principal (ya ralentizado): muestra el margen que los FPS topados por vsync esconden
  const tareas = async () =>
    (await t.cdp('Performance.getMetrics', {})).metrics.find((m) => m.name === 'TaskDuration').value;
  await t.waitFor('!!window.__mc.gl');
  const gpu = await t.ev(
    `(()=>{const g=window.__mc.gl.getContext(),e=g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)})()`,
  );
  console.log(`EMULACIÓN 412×915 DPR 2.6 CPU ×${cpu}; GPU:`, gpu);
  assert.ok(!/swiftshader|llvmpipe/i.test(gpu), 'Se requiere GPU real');
  // [nombre, cómo llegar, dónde pararse (x, z, giro)]. Las de la ola de realismo: Yojoa, Talgua, la ciudad (Tegucigalpa),
  // la lluvia de Yoro, el viaje en rapidito y el estadio (fútbol). MC_ESCENAS=a,b mide solo esas.
  const ESCENAS = [
    ['lobby', `${S}.goLobby()`],
    ...['olancho', 'franciscomorazan', 'cortes'].map((id) => [id, `${S}.travel('${id}')`]),
    ...['futbol', 'ritmo', 'corte', 'cortes.gruas'].map((id) => [id, `${S}.startMinigame('${id}')`]),
    ['yojoa', `${S}.travel('cortes')`, [0, -22, 0]],
    ['talgua', `${S}.travel('olancho')`, [0, 2, 0]],
    ['ciudad', `${S}.travel('franciscomorazan')`, [-3, 78, 0]],
    ['lluvia', `${S}.travel('yoro')`, [1, 80, 0]],
    ['rapidito', `${S}.startViaje('rapidito','copan')`],
  ].filter(([n]) => !process.env.MC_ESCENAS || process.env.MC_ESCENAS.split(',').includes(n));
  for (const [nombre, accion, lugar] of ESCENAS) {
    await t.ev(`${S}.mg && ${S}.exitMinigame()`);
    await t.ev(accion);
    if (await t.exists('mg-start')) await t.click('mg-start');
    await t.waitFor(`!document.querySelector('[data-testid=scene-loading]') && !!window.__mc.gl`, 30000);
    await t.sleep(1500);
    if (lugar) await t.ev(`window.__mc.player.teleport(${lugar[0]}, 0.5, ${lugar[1]}, ${lugar[2]})`);
    // la lluvia entra de a poco: se espera a que llueva de verdad
    if (nombre === 'lluvia') await t.waitFor(`window.__mc.env?.weather === 'lluvia'`, 30000);
    await t.sleep(2500);
    if (await t.exists('mg-start')) await t.click('mg-start');
    for (let repeticion = 0; repeticion < 5; repeticion++) {
      // versión de cada material antes de la muestra: si sube cada cuadro, three.js recalcula su programa en cada dibujo
      await t.ev(
        `window.__mcVer=new Map();window.__mc.scene.traverse(o=>[].concat(o.material??[]).forEach(m=>window.__mcVer.set(m,m.version)))`,
      );
      const t0 = await tareas();
      const muestra = await t.ev(
        `new Promise(resolve=>{const frames=[];let prev;const renderStart=window.__mc.gl.info.render.frame;const start=performance.now();function frame(now){if(prev!==undefined)frames.push(now-prev);prev=now;if(now-start<4000)requestAnimationFrame(frame);else{const sorted=[...frames].sort((a,b)=>a-b);resolve({p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],over33:100*frames.filter(x=>x>33).length/frames.length,over34:100*frames.filter(x=>x>34).length/frames.length,fps:1000*frames.length/frames.reduce((a,b)=>a+b,0),frames:frames.length,rendered:window.__mc.gl.info.render.frame-renderStart,calls:window.__mc.gl.info.render.calls,dpr:window.__mc.gl.getPixelRatio()})}}requestAnimationFrame(frame)})`,
      );
      muestra.msTareaPorCuadro = (1000 * ((await tareas()) - t0)) / muestra.frames;
      muestra.recompila = await t.ev(`[...window.__mcVer].filter(([m,v])=>m.version-v>${muestra.frames / 2}).length`);
      if (exigir)
        assert.equal(
          muestra.recompila,
          0,
          'Ningún material se recompila cada cuadro (transparente + DoubleSide sin forceSinglePass)',
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
    JSON.stringify({ gpu, cpu, width: 412, height: 915, dpr: 2.6, rows }, null, 2),
  );
  if (exigir && cpu === 4)
    for (const r of rows) {
      assert.ok(r.p95 <= 34 && r.over34 <= 5, `${r.nombre}: 30 fps estables (p95 ≤34ms (redondeo de 30Hz); ≤5% fuera)`);
    }
});
process.exitCode = ok ? 0 : 1;
