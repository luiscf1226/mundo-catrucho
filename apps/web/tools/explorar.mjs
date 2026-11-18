// Exploración de un departamento en las pruebas de punta a punta (MC-35): los lugares turísticos son puntos de
// `turismo.tsx` que se descubren al llegar (quedan en el álbum) y las locuras abren su ficha al llegar caminando.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const contenido = JSON.parse(readFileSync(new URL('../../../docs/generador/contenido.json', import.meta.url)));
const S = 'window.__mc.store.getState()';

/** Recorre los lugares turísticos del departamento: son los de contenido.json y cada uno se descubre al llegar. */
export async function lugaresTuristicos(t, dept) {
  await t.waitFor(`window.__mcTest?.turismo?.dept===${JSON.stringify(dept)}`);
  const lugares = await t.ev('window.__mcTest.turismo.puntos.map(p=>({id:p.lugar.id,pos:p.pos}))');
  assert.deepEqual(
    lugares.map((l) => l.id).sort(),
    contenido[dept].turismo.map((l) => l.id).sort(),
    `${dept}: lugares turísticos`,
  );
  for (const l of lugares) {
    await t.ev(`window.__mc.player.teleport(${l.pos[0]},${l.pos[1] + 0.1},${l.pos[2]})`);
    await t.waitFor(`${S}.profile.turismo.some(x=>x.id==='${l.id}')`, 20000);
  }
  return lugares.length;
}

/** Camina hacia -z desde `atras` metros hasta la locura en (x, z) y comprueba que abre su ficha. */
export async function locuraCaminando(t, { x, y = 0, z, nombre, texto, atras = 3 }) {
  await t.ev(`window.__mc.player.teleport(${x},${y},${z + atras},0)`);
  await t.holdUntil('w', `${S}.dialog?.title===${JSON.stringify(nombre)}`);
  if (texto !== undefined) assert.equal(await t.ev(`${S}.dialog.text`), texto, nombre);
}
