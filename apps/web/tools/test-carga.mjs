// Comprueba los archivos realmente solicitados con caché fría, sin compresión.
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './harness.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, process.argv[2] ?? 'dist/web');
const shots = resolve(root, '../../capturas/mc-55');
const manifest = JSON.parse(await readFile(resolve(dist, '.vite/manifest.json'), 'utf8'));
const zones = Object.entries(manifest).filter(([key]) => key.startsWith('src/game/dept/zones/'));
const engines = Object.entries(manifest).filter(([key]) => key.startsWith('src/game/minigames/'));
const requests = [];
let releaseZone;
const zoneGate = new Promise((r) => {
  releaseZone = r;
});
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = resolve(dist, `.${path === '/' ? '/index.html' : path}`);
  if (!file.startsWith(dist + sep)) {
    res.writeHead(403).end();
    return;
  }
  if (path === '/favicon.ico') {
    res.writeHead(204).end();
    return;
  }
  try {
    const data = await readFile(file);
    requests.push({ file: path === '/' ? 'index.html' : path.slice(1), bytes: data.length });
    if (path.includes('/olancho-')) await zoneGate;
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
    res.writeHead(200, {
      'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
try {
  const ok = await run(
    'carga por departamento',
    '',
    { url: `http://127.0.0.1:${server.address().port}/`, hash: '#test' },
    async (t) => {
      const requested = (chunk) => requests.some((r) => r.file === chunk.file);
      await t.waitFor(`!!document.querySelector('[data-testid="menu"]')`);
      const initial = requests.reduce((sum, r) => sum + r.bytes, 0);
      assert(initial < 3_000_000, `Primera carga demasiado grande: ${initial}`);
      assert(!zones.some(([, c]) => requested(c)), 'Se bajó una zona antes de entrar');
      assert(!engines.some(([, c]) => requested(c)), 'Se bajó un motor antes de abrirlo');
      console.log(`Primera carga HTTP: ${initial} bytes (HTML + JS + CSS; sin Google Fonts)`);
      await t.click('btn-jugar');
      await t.click('ed-done');
      await t.waitFor(`!!window.__mc.gl && window.__mc.gl.info.render.calls > 0`);
      assert(!zones.some(([, c]) => requested(c)), 'El lobby bajó una zona');
      assert(!engines.some(([, c]) => requested(c)), 'El lobby bajó un motor');
      await t.ev(`window.__mc.store.getState().travel('olancho')`);
      await t.waitFor(`!!document.querySelector('[data-testid="scene-loading"]')`);
      await t.shot(resolve(shots, 'cargando.png'));
      releaseZone();
      await t.waitFor(
        `window.__mcTest?.dept?.id === 'olancho' && !document.querySelector('[data-testid="scene-loading"]')`,
        30000,
      );
      assert(requested(manifest['src/game/dept/zones/olancho.tsx']), 'No se bajó Olancho');
      assert(!zones.some(([key, c]) => !key.endsWith('/olancho.tsx') && requested(c)), 'Se bajó otro departamento');
      await t.waitFor(`window.__mc.gl.info.render.calls > 0`);
      await t.shot(resolve(shots, 'olancho.png'));
      await t.ev(`window.__mc.store.getState().startMinigame('corte')`);
      await t.waitFor(
        `!!document.querySelector('[data-testid="mg-intro"]') && !document.querySelector('[data-testid="scene-loading"]')`,
        30000,
      );
      assert(requested(manifest['src/game/minigames/Corte.tsx']), 'No se bajó el motor Corte');
      assert(!engines.some(([key, c]) => !key.endsWith('/Corte.tsx') && requested(c)), 'Se bajó otro motor');
      // Contrasta los bytes servidos con los tamaños reales del sitio.
      for (const r of requests) assert.equal(r.bytes, (await stat(resolve(dist, r.file))).size);
      console.log('Archivos solicitados:\n' + requests.map((r) => `  ${r.file}: ${r.bytes} bytes`).join('\n'));
    },
  );
  if (!ok) process.exitCode = 1;
} finally {
  releaseZone();
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
}
