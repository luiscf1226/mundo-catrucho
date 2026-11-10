// Copia el proyecto de Roblox Studio (roblox/) dentro del juego web para mostrarlo en el panel "Proyecto Roblox".
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), dir = join(root, 'roblox');
const files = [];
const walk = d => { for (const f of readdirSync(d).sort()) { const p = join(d, f); if (/^(node_modules|\.|tools|bin|Packages)/.test(f)) continue; if (statSync(p).isDirectory()) walk(p); else if (/\.(luau|lua|json|toml|md)$/.test(f) && statSync(p).size < 200_000 && !/sourcemap/.test(f)) files.push({ path: relative(dir, p), code: readFileSync(p, 'utf8') }); } };
if (existsSync(dir)) walk(dir);
const readme = files.find(f => f.path === 'README.md')?.code ?? '';
const order = f => (f.path === 'default.project.json' ? 0 : f.path.startsWith('src/') ? 1 : f.path.startsWith('tests/') ? 3 : 2);
files.sort((a, b) => order(a) - order(b) || a.path.localeCompare(b.path));
writeFileSync(join(root, 'src/generated/robloxProject.ts'), `// GENERADO por tools/embed-roblox.mjs a partir de la carpeta roblox/. No editar a mano.\nexport interface RobloxFile { path: string; code: string }\nexport const ROBLOX_PROJECT: { readme: string; files: RobloxFile[] } = ${JSON.stringify({ readme, files: files.filter(f => f.path !== 'README.md') })};\n`);
console.log(`roblox: ${files.length} archivos incrustados`);
