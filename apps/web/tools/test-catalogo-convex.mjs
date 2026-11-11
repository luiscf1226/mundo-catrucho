import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { armarCatalogo, ejecutarConvex, raiz, subirCatalogo } from '../../../scripts/catalogo.mjs';
import { run } from './harness.mjs';

const envPath = join(raiz, '.env.local');
if (!existsSync(envPath)) {
  console.log('SALTA catálogo Convex: no hay .env.local');
  process.exit(0);
}
const { CONVEX_URL } = parseEnv(readFileSync(envPath, 'utf8'));
if (!CONVEX_URL) throw new Error('Falta CONVEX_URL en .env.local');
const out = mkdtempSync(join(tmpdir(), 'mc-catalogo-'));
const original = ejecutarConvex('catalogo:ultima');
const departamentos = armarCatalogo();
const juego = departamentos.find((d) => d.deptId === 'comayagua').datos.catalogo.juegos[0];
const marca = 'Alfombra de Convex MC-10';
juego.name = marca;
let ok = false;
try {
  const primera = subirCatalogo(departamentos);
  const segunda = subirCatalogo(departamentos);
  assert.equal(primera.version, segunda.version, 'Subir el mismo contenido debe conservar la versión');
  execFileSync('node', ['apps/web/tools/build.mjs', 'hd', '--out', out], {
    cwd: raiz,
    stdio: 'inherit',
    env: { ...process.env, VITE_CONVEX_URL: CONVEX_URL },
  });
  const origen = new URL(CONVEX_URL).origin;
  const red = new RegExp(`^${origen.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`);
  ok = await run('catalogo-convex', join(out, 'mundo-catrucho-hd.html'), { hash: '#test,go', red }, async (t) => {
    await t.ev(`window.__mc.store.getState().startJuego(${JSON.stringify(juego.id)})`);
    await t.waitFor(`document.querySelector('[data-testid=mg-intro]')?.innerText.includes(${JSON.stringify(marca)})`);
    assert(
      t.requests.some((u) => u.startsWith(`${origen}/api/query`)),
      'Debe consultar Convex',
    );
    await t.shot('/tmp/mc-catalogo-convex.png');
  });
  const html = readFileSync(join(out, 'mundo-catrucho-hd.html'), 'utf8');
  const nombreLocal = armarCatalogo()
    .flatMap((d) => d.datos.catalogo.juegos)
    .find((j) => j.id === juego.id).name;
  for (const [caso, respuesta] of [
    ['fallo', "Promise.reject(new Error('Sin conexión'))"],
    ['plazo', 'new Promise(() => {})'],
  ]) {
    const file = join(out, `respaldo-${caso}.html`);
    writeFileSync(
      file,
      html.replace(
        '<script type="module">',
        `<script>window.fetch = () => ${respuesta};</script><script type="module">`,
      ),
    );
    const respaldo = await run(`catalogo-respaldo-${caso}`, file, { hash: '#test,go' }, async (t) => {
      await t.ev(`window.__mc.store.getState().startJuego(${JSON.stringify(juego.id)})`);
      await t.waitFor(
        `document.querySelector('[data-testid=mg-intro]')?.innerText.includes(${JSON.stringify(nombreLocal)})`,
      );
      assert(!(await t.ev(`document.body.innerText.includes(${JSON.stringify(marca)})`)));
      if (caso === 'plazo')
        assert(await t.ev('performance.now() >= 2900'), 'Debe esperar el plazo antes de usar el respaldo');
    });
    ok = respaldo && ok;
  }
} finally {
  subirCatalogo(original?.departamentos ?? armarCatalogo());
  rmSync(out, { recursive: true, force: true });
}
if (!ok) process.exitCode = 1;
