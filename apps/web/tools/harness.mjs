// Arnés de pruebas: abre un HTML compilado en Chromium sin ventana (con GPU real) y permite manejarlo.
//   import { launch } from './harness.mjs';
//   const t = await launch('/ruta/mundo-catrucho-roblox.html');           // o { width, height, hash: '#test', touch: true }
//   await t.click('btn-jugar');            // clic por data-testid
//   await t.waitFor(`!!document.querySelector('[data-testid=hud]')`);
//   await t.hold('w', 1500);               // mantener una tecla
//   await t.shot('/tmp/x.png');            // captura
//   t.ev('window.__mc.player.pos')         // evaluar JS en la página (window.__mc = { store, player, phys, input, audio, ... })
//   await t.close();                       // SIEMPRE cerrar (mata Chromium)
// t.errors acumula excepciones, console.error y peticiones de red no permitidas.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const KEY = { ' ': ['Space', 32], w: ['KeyW', 87], a: ['KeyA', 65], s: ['KeyS', 83], d: ['KeyD', 68], e: ['KeyE', 69], f: ['KeyF', 70], q: ['KeyQ', 81], m: ['KeyM', 77], b: ['KeyB', 66], p: ['KeyP', 80], Escape: ['Escape', 27], Shift: ['ShiftLeft', 16], Enter: ['Enter', 13], ArrowUp: ['ArrowUp', 38], ArrowDown: ['ArrowDown', 40], ArrowLeft: ['ArrowLeft', 37], ArrowRight: ['ArrowRight', 39] };

export async function launch(file, { width = 1280, height = 720, hash = '', touch = false, gpu = true } = {}) {
  const port = 9300 + Math.floor(Math.random() * 600), prof = mkdtempSync(join(tmpdir(), 'mc-test-'));
  const flags = gpu ? ['--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  const chrome = spawn('chromium', ['--headless=new', `--user-data-dir=${prof}`, ...flags, '--autoplay-policy=no-user-gesture-required', '--mute-audio', `--remote-debugging-port=${port}`, `--window-size=${width},${height}`, 'about:blank'], { stdio: 'ignore', detached: true });
  const kill = () => { try { process.kill(-chrome.pid, 'SIGKILL'); } catch {} try { rmSync(prof, { recursive: true, force: true }); } catch {} };
  process.on('exit', kill);
  let ws; for (let i = 0; i < 80 && !ws; i++) { try { const j = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); const p = j.find(x => x.type === 'page'); if (p) ws = new WebSocket(p.webSocketDebuggerUrl); } catch {} if (!ws) await sleep(200); }
  if (!ws) { kill(); throw new Error('Chromium no arrancó'); }
  await new Promise(r => (ws.onopen = r));
  let id = 0; const pending = new Map(), errors = [], requests = [];
  ws.onmessage = m => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
    if (d.method === 'Runtime.exceptionThrown') errors.push('EXCEPCIÓN ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push('console.error ' + d.params.args.map(a => a.value ?? a.description).join(' ').slice(0, 400));
    if (d.method === 'Network.requestWillBeSent') { const u = d.params.request.url; if (!/^(file|data|blob|about):/.test(u)) { requests.push(u); if (!/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u)) errors.push('RED no permitida ' + u.slice(0, 200)); } }
  };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error('ev: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text)); return r.result?.result?.value; };
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  if (touch) { await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 3 }); }
  await send('Page.navigate', { url: 'file://' + resolve(file) + hash });
  for (let i = 0; i < 100; i++) { if (await ev(`!!window.__mc && !!document.querySelector('[data-testid]')`).catch(() => false)) break; await sleep(150); }
  const keyEv = (type, k) => { const [code, vk] = KEY[k] ?? [k, 0]; return send('Input.dispatchKeyEvent', { type, key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, text: type === 'keyDown' && k.length === 1 ? k : undefined }); };
  const t = {
    errors, requests, ev, sleep,
    async waitFor(expr, timeout = 15000, label = expr) { const s = Date.now(); for (;;) { const v = await ev(expr).catch(() => false); if (v) return v; if (Date.now() - s > timeout) throw new Error('tiempo agotado esperando: ' + label); await sleep(100); } },
    exists: tid => ev(`!!document.querySelector('[data-testid="${tid}"]')`),
    text: tid => ev(`document.querySelector('[data-testid="${tid}"]')?.innerText ?? null`),
    async click(tid, timeout = 8000) { await t.waitFor(`!!document.querySelector('[data-testid="${tid}"]')`, timeout, 'data-testid=' + tid); const r = JSON.parse(await ev(`(()=>{const e=document.querySelector('[data-testid="${tid}"]');e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return JSON.stringify({x:b.left+b.width/2,y:b.top+b.height/2})})()`)); await t.mouse(r.x, r.y); },
    async mouse(x, y) { if (touch) { await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await sleep(40); await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(60); return; } await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }); await sleep(60); },
    async drag(x0, y0, x1, y1, steps = 12) { if (touch) { await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] }); for (let i = 1; i <= steps; i++) { await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * i / steps, y: y0 + (y1 - y0) * i / steps }] }); await sleep(16); } await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); return; } await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x0, y: y0, button: 'left', clickCount: 1 }); for (let i = 1; i <= steps; i++) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x0 + (x1 - x0) * i / steps, y: y0 + (y1 - y0) * i / steps, button: 'left', buttons: 1 }); await sleep(16); } await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x1, y: y1, button: 'left', clickCount: 1 }); },
    down: k => keyEv('keyDown', k), up: k => keyEv('keyUp', k),
    async press(k) { await keyEv('keyDown', k); await sleep(50); await keyEv('keyUp', k); await sleep(50); },
    async hold(k, ms) { await keyEv('keyDown', k); await sleep(ms); await keyEv('keyUp', k); },
    /** mantiene teclas hasta que la expresión sea verdadera */
    async holdUntil(keys, expr, timeout = 15000) { for (const k of [].concat(keys)) await keyEv('keyDown', k); try { return await t.waitFor(expr, timeout); } finally { for (const k of [].concat(keys)) await keyEv('keyUp', k); } },
    async shot(path, clip) { mkdirSync(dirname(resolve(path)), { recursive: true }); const r = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) }); writeFileSync(path, Buffer.from(r.result.data, 'base64')); return path; },
    fps: () => ev(`new Promise(r=>{let n=0;const s=performance.now();(function f(){n++;if(performance.now()-s<1500)requestAnimationFrame(f);else r(Math.round(n/1.5))})()})`),
    /** info del renderizador de three (llamadas de dibujo, triángulos) si la escena lo expone */
    state: () => ev(`(()=>{const s=window.__mc.store.getState();return JSON.stringify({screen:s.screen,scene:s.scene,panel:s.panel,mg:s.mg&&{id:s.mg.id,phase:s.mg.phase,result:s.mg.result,rewards:s.mg.rewards},coins:s.profile.coins,xp:s.profile.xp,level:s.profile.level,pos:window.__mc.player.pos.map(v=>+v.toFixed(2))})})()`).then(JSON.parse),
    /** llamadas de dibujo y triángulos del último cuadro */
    calls: () => ev(`(()=>{const i=window.__mc.gl?.info.render;return i?JSON.stringify({calls:i.calls,triangles:i.triangles}):null})()`).then(v => v && JSON.parse(v)),
    async close() { try { ws.close(); } catch {} kill(); },
  };
  return t;
}
/** Envuelve una prueba: imprime PASA/FALLA, errores de consola, y siempre cierra el navegador. */
export async function run(name, file, opts, fn) {
  const t = await launch(file, opts); let ok = true;
  try { await fn(t); } catch (e) { ok = false; console.log(`FALLA ${name}: ${e.message}`); try { await t.shot(`/tmp/claude-1000/mc-fail-${name}.png`); console.log(`  captura: /tmp/claude-1000/mc-fail-${name}.png`); } catch {} }
  if (t.errors.length) { ok = false; console.log(`ERRORES (${t.errors.length}):\n  ` + [...new Set(t.errors)].slice(0, 12).join('\n  ')); }
  await t.close(); console.log(ok ? `PASA ${name}` : `NO PASA ${name}`); return ok;
}
