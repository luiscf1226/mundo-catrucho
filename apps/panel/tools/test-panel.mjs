import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import { armarCatalogo, ejecutarConvex, raiz, subirCatalogo } from '../../../scripts/catalogo.mjs';
import { run } from '../../web/tools/harness.mjs';

const { CONVEX_URL } = parseEnv(readFileSync(join(raiz, '.env.local'), 'utf8'));
assert(CONVEX_URL, 'Falta CONVEX_URL');
const llave = execFileSync('npx', ['convex', 'env', 'get', 'PANEL_LLAVE'], {
  encoding: 'utf8',
  stdio: ['pipe', 'pipe', 'pipe'],
}).trim();
assert(llave, 'Falta PANEL_LLAVE');
const client = new ConvexHttpClient(CONVEX_URL, { logger: false });
const guardar = makeFunctionReference('catalogoPanel:guardar');
const undo = makeFunctionReference('catalogoPanel:deshacer');
const original = ejecutarConvex('catalogo:ultima');
if (!original) subirCatalogo(armarCatalogo());
const inicio = ejecutarConvex('catalogo:ultima');
const base = inicio.departamentos.find((d) => d.deptId === 'comayagua');
const invalid = structuredClone(base);
invalid.datos.catalogo.juegos[0].etapas = 0;
const args = { version: inicio.version, departamento: base };
await assert.rejects(client.mutation(guardar, { ...args, llave: '' }), /Llave/);
await assert.rejects(client.mutation(guardar, { ...args, llave: 'incorrecta' }), /Llave/);
await assert.rejects(client.mutation(guardar, { ...args, departamento: invalid, llave }), /Etapas/);
for (const cambiar of [
  (d) => {
    d.datos.catalogo.lugares[0].name = '';
  },
  (d) => {
    d.datos.catalogo.comidas[0].lugar = 'no-existe';
  },
  (d) => {
    d.datos.catalogo.juegos[0].motor = 'inventado';
  },
  (d) => {
    d.datos.catalogo.juegos[0].tema.nuevo = 'inventado';
  },
  (d) => {
    d.datos.catalogo.palabras[0].es = 'x'.repeat(1001);
  },
]) {
  const d = structuredClone(base);
  cambiar(d);
  await assert.rejects(client.mutation(guardar, { ...args, departamento: d, llave }));
}
await assert.rejects(client.mutation(undo, { llave: '', version: inicio.version }), /Llave/);
const explorador = inicio.departamentos.find((d) => d.datos.catalogo.juegos.some((j) => Array.isArray(j.tema.sitios)));
assert(explorador);
const sitioInvalido = structuredClone(explorador);
sitioInvalido.datos.catalogo.juegos.find((j) => Array.isArray(j.tema.sitios)).tema.sitios[0] = 'no-existe';
await assert.rejects(
  client.mutation(guardar, { llave, version: inicio.version, departamento: sitioInvalido }),
  /departamento del tema/,
);
console.log('PASA seguridad y validación directa en Convex');
execFileSync('pnpm', ['--filter', '@mundo-catrucho/panel', 'build'], { stdio: 'inherit' });
const servidor = spawn(
  'pnpm',
  [
    '--filter',
    '@mundo-catrucho/panel',
    'exec',
    'vite',
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    '5174',
    '--strictPort',
  ],
  { stdio: 'ignore', detached: true },
);
const out = mkdtempSync(join(tmpdir(), 'mc-panel-'));
const origen = new URL(CONVEX_URL).origin;
const red = new RegExp(`^${origen.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`);
const marca = 'Comida del panel MC-33';
const nota = 'Nota publicada desde el panel MC-33.';
const nombreJuego = 'Juego del panel MC-33';
let versionPublicada;
async function poner(t, id, valor) {
  await t.ev(
    `(()=>{const e=document.querySelector('[data-testid="${id}"]');Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(valor)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`,
  );
}
let ok = true;
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch('http://127.0.0.1:5174')).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  ok = await run('panel-publicar', '', { url: 'http://127.0.0.1:5174', red }, async (t) => {
    await t.waitFor(`!!document.querySelector('[data-testid=entrar]')`);
    assert.equal(await t.ev(`document.querySelector('[data-testid=publicar]')`), null);
    await t.shot(join(raiz, 'capturas/mc-33/entrada.png'));
    await poner(t, 'llave', llave);
    await t.click('entrar');
    await t.waitFor(`!!document.querySelector('[data-testid=departamento]')`);
    await t.ev(
      `(()=>{const e=document.querySelector('select');e.value='comayagua';e.dispatchEvent(new Event('change',{bubbles:true}));})()`,
    );
    await poner(t, 'lugares.0.nota', nota);
    await t.click('seccion-comidas');
    await poner(t, 'comidas.0.name', marca);
    await t.shot(join(raiz, 'capturas/mc-33/comidas.png'));
    await t.click('seccion-juegos');
    await poner(t, 'juegos.0.name', nombreJuego);
    await t.shot(join(raiz, 'capturas/mc-33/juegos.png'));
    await t.click('publicar');
    await t.waitFor(`document.querySelector('[data-testid=mensaje]')?.innerText.includes('Publicación lista')`, 20000);
    const publicado = ejecutarConvex('catalogo:ultima');
    versionPublicada = publicado.version;
    assert.equal(publicado.departamentos.find((d) => d.deptId === 'comayagua').datos.catalogo.comidas[0].name, marca);
    assert.equal(publicado.departamentos.find((d) => d.deptId === 'comayagua').datos.catalogo.lugares[0].nota, nota);
    await assert.rejects(client.mutation(guardar, { ...args, llave }), /catálogo cambió/);
    assert.throws(() => ejecutarConvex('catalogo:reemplazar', { departamentos: inicio.departamentos }), /--forzar/);
    await t.shot(join(raiz, 'capturas/mc-33/publicado.png'));
  });
  assert(ok, 'Falló publicar desde el panel');
  execFileSync('node', ['apps/web/tools/build.mjs', 'hd', '--out', out], {
    cwd: raiz,
    stdio: 'inherit',
    env: { ...process.env, VITE_CONVEX_URL: CONVEX_URL },
  });
  const archivoJuego = join(out, 'mundo-catrucho-hd.html');
  writeFileSync(
    archivoJuego,
    readFileSync(archivoJuego, 'utf8').replace(
      '<script type="module">',
      `<script>const originalFetch=window.fetch;window.fetch=async(...a)=>{const r=await originalFetch(...a);if(String(a[0]).includes('/api/query'))window.catalogoRecibido=await r.clone().json();return r};</script><script type="module">`,
    ),
  );
  ok =
    (await run('panel-juego-remoto', join(out, 'mundo-catrucho-hd.html'), { hash: '#test,go', red }, async (t) => {
      await t.ev(`window.__mc.store.getState().startJuego(${JSON.stringify(base.datos.catalogo.juegos[0].id)})`);
      await t.waitFor(
        `document.querySelector('[data-testid=mg-intro]')?.innerText.includes(${JSON.stringify(nombreJuego)})`,
      );
      assert(await t.ev(`JSON.stringify(window.catalogoRecibido).includes(${JSON.stringify(marca)})`));
      assert(await t.ev(`JSON.stringify(window.catalogoRecibido).includes(${JSON.stringify(nota)})`));
      await t.shot(join(raiz, 'capturas/mc-33/juego-remoto.png'));
    })) && ok;
  ok =
    (await run('panel-deshacer', '', { url: 'http://127.0.0.1:5174', red }, async (t) => {
      await t.waitFor(`!!document.querySelector('[data-testid=entrar]')`);
      await poner(t, 'llave', llave);
      await t.click('entrar');
      await t.waitFor(`!!document.querySelector('[data-testid=deshacer]')`);
      await t.ev('window.confirm=()=>true');
      await t.click('deshacer');
      await t.waitFor(`document.querySelector('[data-testid=mensaje]')?.innerText.includes('Se restauró')`);
      await t.shot(join(raiz, 'capturas/mc-33/deshacer.png'));
    })) && ok;
  assert.deepEqual(ejecutarConvex('catalogo:ultima').departamentos, inicio.departamentos);
  const restaurado = ejecutarConvex('catalogo:ultima');
  assert.equal(
    ejecutarConvex('catalogo:reemplazar', { departamentos: restaurado.departamentos, forzar: true }).version,
    restaurado.version,
  );
  console.log('PASA deshacer restaura todo el catálogo y carga idéntica conserva versión');
} finally {
  try {
    const actual = ejecutarConvex('catalogo:ultima');
    const temporal =
      actual.departamentos.find((d) => d.deptId === 'comayagua')?.datos.catalogo.comidas[0].name === marca;
    if ((versionPublicada && actual.version === versionPublicada) || temporal)
      await client.mutation(undo, { llave, version: actual.version });
    else if (JSON.stringify(actual.departamentos) !== JSON.stringify(inicio.departamentos)) {
      console.error('El catálogo cambió durante la prueba; revisalo sin sobrescribir otra publicación.');
      process.exitCode = 1;
    }
  } finally {
    process.kill(-servidor.pid, 'SIGTERM');
    rmSync(out, { recursive: true, force: true });
  }
}

if (!ok) process.exitCode = 1;
