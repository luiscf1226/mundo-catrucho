// Compila HTML autónomo por versión o un sitio estático con trozos diferidos.
// Uso:  node tools/build.mjs [roblox|hd|all|web] [--out <carpeta>] [--embed]
//   --embed vuelve a incrustar la carpeta roblox/ en el panel "Proyecto Roblox" (solo para la compilación final)
//   <out>/mundo-catrucho-<versión>.html   → página completa, se abre con doble clic
//   <out>/artifact-<versión>.html         → fragmento para publicar como Artifact (sin <html>/<head>/<body>)
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2),
  oi = args.indexOf('--out');
const out = resolve(oi >= 0 ? args[oi + 1] : join(root, args.includes('web') ? 'dist/web' : 'dist'));
const which = args.find((a) => ['roblox', 'hd', 'all'].includes(a)) ?? 'all';
const variants = which === 'all' ? ['roblox', 'hd'] : [which];
const TITLES = { roblox: 'Mundo Catrucho Roblox', hd: 'Mundo Catrucho 3D' };
if (args.includes('web')) {
  execFileSync(
    join(root, 'node_modules/.bin/vite'),
    ['build', '--outDir', out, '--emptyOutDir', '--logLevel', 'warn'],
    {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, VITE_VARIANT: 'hd', VITE_BUILD_MODE: 'web' },
    },
  );
  const manifest = JSON.parse(readFileSync(join(out, '.vite/manifest.json'), 'utf8'));
  const initial = new Set(['index.html']);
  const html = readFileSync(join(out, 'index.html'), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="\.\/([^"]+)"/g)) {
    if (!match[1].endsWith('.js')) initial.add(match[1]);
  }
  const visit = (key) => {
    const chunk = manifest[key];
    if (initial.has(chunk.file)) return;
    initial.add(chunk.file);
    for (const css of chunk.css ?? []) initial.add(css);
    for (const dep of chunk.imports ?? []) visit(dep);
  };
  visit('index.html');
  const size = (file) => statSync(join(out, file)).size;
  const bytes = [...initial].reduce((sum, file) => sum + size(file), 0);
  console.log(`Primera carga (sin compresión ni Google Fonts): ${bytes} bytes (${(bytes / 1e6).toFixed(3)} MB)`);
  for (const [key, chunk] of Object.entries(manifest)) {
    if (!initial.has(chunk.file)) console.log(`${key}: ${size(chunk.file)} bytes → ${chunk.file}`);
  }
  if (bytes >= 3_000_000) throw new Error('La primera carga supera el límite de 3 MB');
  process.exit(0);
}
mkdirSync(out, { recursive: true });
if (args.includes('--embed'))
  execFileSync('node', [join(root, 'tools/embed-roblox.mjs')], { cwd: root, stdio: 'inherit' });
for (const v of variants) {
  const tmp = join(out, `.build-${v}-${process.pid}`);
  execFileSync(
    join(root, 'node_modules/.bin/vite'),
    ['build', '--outDir', tmp, '--emptyOutDir', '--logLevel', 'warn'],
    { cwd: root, stdio: 'inherit', env: { ...process.env, VITE_VARIANT: v, VITE_BUILD_MODE: 'single' } },
  );
  const assets = join(tmp, 'assets'),
    files = readdirSync(assets);
  const js = files
    .filter((f) => f.endsWith('.js'))
    .map((f) => readFileSync(join(assets, f), 'utf8'))
    .join('\n')
    .replace(/<\/script/gi, '<\\/script');
  const css = files
    .filter((f) => f.endsWith('.css'))
    .map((f) => readFileSync(join(assets, f), 'utf8'))
    .join('\n');
  const fonts =
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700;800;900&display=swap">';
  const body = `<div id="root"></div>\n<script type="module">${js}</script>`;
  const fragment = `<title>${TITLES[v]}</title>\n${fonts}\n<style>${css}</style>\n${body}\n`;
  const page = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no"><title>${TITLES[v]}</title>${fonts}<style>${css}</style></head><body>${body}</body></html>\n`;
  writeFileSync(join(out, `artifact-${v}.html`), fragment);
  writeFileSync(join(out, `mundo-catrucho-${v}.html`), page);
  rmSync(tmp, { recursive: true, force: true });
  console.log(`ok ${v}: ${(page.length / 1024 / 1024).toFixed(2)} MB → ${join(out, `mundo-catrucho-${v}.html`)}`);
}
