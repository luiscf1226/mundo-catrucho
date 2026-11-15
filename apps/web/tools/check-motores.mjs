// Cada motor declarado en core/types.ts (MinigameId) tiene su ficha en shared/data/minigames.json y su línea en
// minigames/index.ts, y no hay sobrantes. Al juntar ramas que agregan motores a la vez es fácil perder uno.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const web = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (p) => readFileSync(join(web, p), 'utf8');
const union = leer('src/core/types.ts').match(/export type MinigameId =([^;]+);/)?.[1] ?? '';
const tipos = new Set([...union.matchAll(/'([^']+)'/g)].map((m) => m[1]));
const fichas = new Set(JSON.parse(leer('shared/data/minigames.json')).map((m) => m.id));
const registro = leer('src/game/minigames/index.ts').match(/const MOTORS = \{([\s\S]*?)\n\}/)?.[1] ?? '';
const lineas = new Set([...registro.matchAll(/^\s+'?([\w.]+)'?: motor\(/gm)].map((m) => m[1]));

const fallas = [];
const comparar = (nombre, set) => {
  for (const id of tipos) if (!set.has(id)) fallas.push(`${id} falta en ${nombre}`);
  for (const id of set) if (!tipos.has(id)) fallas.push(`${id} está en ${nombre} pero no en MinigameId`);
};
comparar('minigames.json', fichas);
comparar('minigames/index.ts', lineas);
let kit = 0;
function revisarKit(carpeta) {
  for (const entrada of readdirSync(join(web, carpeta), { withFileTypes: true })) {
    const ruta = join(carpeta, entrada.name);
    if (entrada.isDirectory()) revisarKit(ruta);
    else if (/\.tsx?$/.test(ruta)) {
      const fuente = leer(ruta);
      if (!/defineMotor\s*\(\s*\{/.test(fuente)) continue;
      kit++;
      if (!/modos\s*:\s*\{\s*duo\s*:[\s\S]*?abierto\s*:/.test(fuente))
        fallas.push(`${ruta}: motor del kit sin declaración de dúo y abierto`);
    }
  }
}
revisarKit('src/game/minigames');
if (fallas.length) {
  console.log(`FALLA motores:\n  ${fallas.join('\n  ')}`);
  process.exit(1);
}
console.log(`PASA motores: ${tipos.size} con ficha y registro; ${kit} del kit con modos`);
