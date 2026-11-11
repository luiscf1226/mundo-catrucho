import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (path) => JSON.parse(readFileSync(resolve(raiz, path), 'utf8'));
export function armarCatalogo() {
  const raw = Object.assign(
    {},
    ...readdirSync(resolve(raiz, 'apps/web/shared/data/catalogo'))
      .filter((f) => f.endsWith('.json'))
      .sort()
      .map((f) => leer(`apps/web/shared/data/catalogo/${f}`)),
  );
  const editorial = leer('docs/generador/contenido.json');
  const minigames = leer('apps/web/shared/data/minigames.json');
  // Las referencias a marcas reales son solo para las comprobaciones locales.
  const apodos = JSON.parse(JSON.stringify(leer('apps/web/shared/data/apodos.json')), (k, v) =>
    ['real', 'busca', '_nota'].includes(k) ? undefined : v,
  );
  return leer('apps/web/shared/data/departments.json').departments.map((departamento) => {
    const id = departamento.id,
      r = raw[id];
    return {
      deptId: id,
      datos: {
        departamento,
        minigames,
        editorial: editorial[id],
        apodos,
        catalogo: {
          id,
          tipos: r.tipos ?? '',
          lugares: r.lugares.map(([id, name, kind, nota = '']) => ({ id, name, kind, nota })),
          comidas: r.comidas.map(([name, lugar, nota = '']) => ({ name, lugar, nota })),
          palabras: r.palabras.map(([dice, es]) => ({ dice, es })),
          juegos: r.juegos.map(([jid, name, motor, lugar, icon, desc, guino = '', tema = {}, etapas = 3]) => ({
            id: `${id}.${jid}`,
            dept: id,
            lugar,
            name,
            motor,
            icon,
            desc,
            guino,
            tema,
            etapas,
          })),
        },
      },
    };
  });
}
export function ejecutarConvex(funcion, args = {}) {
  return JSON.parse(
    execFileSync(
      'npx',
      [
        `--node-options=--import=${pathToFileURL(resolve(raiz, 'scripts/convex-stdin.mjs')).href}`,
        'convex',
        'run',
        funcion,
      ],
      {
        cwd: raiz,
        input: JSON.stringify(args),
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      },
    ),
  );
}
export function subirCatalogo(departamentos, { forzar = false } = {}) {
  const resultado = ejecutarConvex('catalogo:reemplazar', { departamentos, forzar });
  console.log(
    `PASA catálogo v${resultado.version}: ${departamentos.length} departamentos, ${departamentos.reduce((n, d) => n + d.datos.catalogo.juegos.length, 0)} juegos, ${departamentos.reduce((n, d) => n + d.datos.catalogo.lugares.length, 0)} lugares`,
  );
  return resultado;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  subirCatalogo(armarCatalogo(), { forzar: process.argv.includes('--forzar') });
