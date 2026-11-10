// Preguntas de «¿Cómo se dice?»: del tema, o armadas con los hondureñismos del departamento y del país.
import { catDe, PALABRAS } from '../../../core/data';
import type { Palabra } from '../../../core/types';

export interface Pregunta {
  q: string;
  ops: string[];
  ok: number;
}

const RESPALDO: Palabra[] = [
  { dice: 'pisto', es: 'dinero' },
  { dice: 'cipote', es: 'niño' },
  { dice: 'chele', es: 'persona de piel clara' },
  { dice: 'birria', es: 'cerveza' },
  { dice: 'chunche', es: 'cualquier cosa' },
  { dice: 'catracho', es: 'hondureño' },
  { dice: 'macanudo', es: 'muy bueno' },
  { dice: 'jaña', es: 'novia' },
];

export const cuantas = (dif: number) => 8 + Math.round(dif * 2);

function shuffle<T>(a: T[], r: () => number) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function armar(tema: Record<string, any>, deptId: string | undefined, n: number, r: () => number): Pregunta[] {
  const mk = (q: string, ok: string, m1: string, m2: string): Pregunta => {
    const ops = shuffle([ok, m1, m2], r);
    return { q, ops, ok: ops.indexOf(ok) };
  };
  const dadas = Array.isArray(tema.preguntas)
    ? (tema.preguntas as any[]).filter((p) => Array.isArray(p) && p.length >= 4).map((p) => p.map(String))
    : [];
  if (dadas.length) {
    const out: Pregunta[] = [];
    const base = shuffle([...dadas], r);
    for (let i = 0; i < n; i++) {
      const [q, ok, m1, m2] = base[i % base.length];
      out.push(mk(q, ok, m1, m2));
    }
    return out;
  }
  const local = deptId ? catDe(deptId).palabras : [];
  const uniq = (l: Palabra[]) =>
    l.filter((p, i) => l.findIndex((o) => o.dice.toLowerCase() === p.dice.toLowerCase()) === i);
  let todas = uniq([...local, ...PALABRAS]);
  if (todas.length < 4) todas = uniq([...todas, ...RESPALDO]);
  const pool = shuffle([...(local.length >= 3 ? local : todas)], r),
    out: Pregunta[] = [],
    aqui = local.length >= 3;
  for (let i = 0; i < n; i++) {
    const p = pool[i % pool.length],
      otras = shuffle(
        todas.filter((o) => o.dice !== p.dice && o.es !== p.es),
        r,
      );
    if (i % 2 === 0) out.push(mk(`¿Qué es ${art(p.dice)}?`, p.es, otras[0].es, otras[1].es));
    else
      out.push(
        mk(
          aqui ? `¿Cómo le dicen aquí a: ${p.es}?` : `¿Cómo se le dice a: ${p.es}?`,
          p.dice,
          otras[0].dice,
          otras[1].dice,
        ),
      );
  }
  return out;
}
// «un pilón», «una birria», «andar con pisto»… sin complicarse: artículo si es una sola palabra
const art = (w: string) => (/\s/.test(w) ? `«${w}»` : `${/a$/i.test(w) ? 'una' : 'un'} «${w}»`);
