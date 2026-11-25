// MC-04: los motores escriben sus pistas del HUD con teclas («A/D elegí · F confirmá»). En el celular esas teclas
// no existen: se cambian por los controles táctiles que sí están en pantalla (palanca, 🎯, E, Q y salto).
// E y Q se quedan: son las letras de sus botones táctiles.
/** palabra suelta: ni letra antes ni después (las tildes cuentan como letra) */
const suelta = (s: string, flags = '') => new RegExp(`(?<!\\p{L})(?:${s})(?!\\p{L})`, `gu${flags}`);
const REGLAS: [RegExp, string][] = [
  // alternativas de mando y de mouse que sobran con los dedos
  [/\s*\/\s*(?:RT|LT|RB|LB|B|X)(?!\p{L})/gu, ''],
  [/\s*\/\s*(?:stick derecho|mouse|clic)(?!\p{L})/giu, ''],
  [suelta('(?:Mando: )?stick derecho\\s*/\\s*', 'i'), ''],
  [suelta('(?:clic|mouse)\\s*/\\s*', 'i'), ''],
  [suelta('WASD'), 'Palanca'],
  [suelta('W\\s*/\\s*S'), 'Palanca ↕'],
  [suelta('A\\s*/\\s*D'), 'Palanca ↔'],
  [suelta('W'), 'Palanca ↑'],
  [suelta('S'), 'Palanca ↓'],
  [suelta('D'), 'Palanca →'],
  [suelta('F'), '🎯'],
  [suelta('Espacio'), 'Salto'],
  [suelta('Shift'), 'palanca a fondo'],
  [suelta('Clic'), 'Tocá'],
  [suelta('clic'), 'tocá'],
  [suelta('mouse', 'i'), 'dedo'],
  [suelta('Apretá|Pulsá|Presioná'), 'Tocá'],
  [suelta('apretá|pulsá|presioná'), 'tocá'],
  [/🎯(?:\s*\/\s*🎯)+/gu, '🎯'],
  [/Palanca(?:\s*\/\s*palanca)+/giu, 'Palanca'],
  [/\s{2,}/gu, ' '],
];

/** Cambia las teclas de una pista por los controles táctiles. Sin teclas, devuelve el mismo texto. */
export function paraDedos(texto: string): string {
  let t = texto;
  for (const [r, a] of REGLAS) t = t.replace(r, a);
  return t.trim();
}
