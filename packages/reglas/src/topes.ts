// Topes para decidir si el resultado de una partida es posible. Los usa el servidor (Convex) antes de pagar.
// Las metas y relojes copian las fórmulas de cada motor (apps/web/src/game/minigames); la prueba
// apps/web/tools/test-reglas.mjs abre los motores en el navegador y revisa que no se desfasen.
import minigames from '../../../apps/web/shared/data/minigames.json' with { type: 'json' };
import type { Estrellas } from './premios.ts';

type Metas = [number, number, number];
export interface TopeMotor {
  /** metas de 1, 2 y 3 estrellas según la dificultad (0..1); mayor es mejor */
  metas?: (dif: number) => Metas;
  /** reloj fijo del motor en segundos: la partida no puede durar menos */
  reloj?: (dif: number) => number;
  /** duración mínima según el puntaje (motores donde terminar rápido da más puntos) */
  duracionMin?: (puntos: number) => number;
  /** puntaje máximo absoluto */
  puntosMax?: (dif: number) => number;
  /** puntos por segundo que nadie supera (sobre el reloj si existe; si no, sobre la duración reportada) */
  puntosPorSegundo: number;
  /** se gana exactamente al llegar a la primera meta (motores del kit) */
  ganaConMeta?: boolean;
}

/** Segundos de holgura por latencia al medir la duración de una partida. */
export const HOLGURA_S = 2;
/** Una partida abierta más de esto se considera abandonada. */
export const DURACION_MAX_S = 30 * 60;
/** Sin reloj ni fórmula, ninguna partida dura menos que esto. */
export const DURACION_MIN_S = 5;
/** Tope para motores sin tabla (nuevos o difíciles de acotar): suelto a propósito. */
export const TOPE_GENERICO: TopeMotor = { puntosPorSegundo: 100 };
/** Dificultad de una etapa, igual que `partida()` del juego: 0 en la primera, 1 en la última. */
export const difDe = (etapa: number, etapas: number) => (etapas > 1 ? etapa / (etapas - 1) : 0.35);
/** Estrellas según umbrales (mayor es mejor), igual que `starsFor` del juego. */
export const estrellasPara = (valor: number, [b, s, g]: Metas): Estrellas =>
  valor >= g ? 3 : valor >= s ? 2 : valor >= b ? 1 : 0;

const r = Math.round,
  r10 = (n: number) => Math.round(n / 10) * 10;
const reglasDe = (id: string) =>
  (minigames.find((m) => m.id === id)?.rules ?? {}) as Record<string, number | undefined>;
const num = (v: number | undefined, def: number) => (typeof v === 'number' ? v : def);

/** Motores del kit (`defineMotor`): reloj fijo de 60–120 s, puntaje = puntos, estrellas por metas. */
const kit = (metas: TopeMotor['metas'], reloj: TopeMotor['reloj']): TopeMotor => ({
  metas,
  reloj,
  puntosPorSegundo: 20,
  ganaConMeta: true,
});
const lineal = (a: number, b: number, c: number, k: number) => (d: number) =>
  [a + r(d * k), b + r(d * k), c + r(d * k)] as Metas;
const taller = kit(lineal(80, 240, 400, 80), () => 75);
/** los ocho motores de Copán comparten metas y reloj (apps/web/src/game/minigames/copan/comun.tsx) */
const copan = kit(
  (d) => [120 + r(d * 120), 360, 600],
  () => 75,
);
const islas = (a: number, b: number, c: number, k: number, base: number, extra: number) =>
  kit(lineal(a, b, c, k), (d) => base + r(d * extra));

const carrera = reglasDe('carrera'),
  limite = num(carrera.timeLimit, 120),
  /** la carrera paga (límite − segundos) × 10: más rápido, más puntos */
  aPuntos = (s: number | undefined, def: number) => (limite - num(s, def)) * 10;
const feria = reglasDe('feria'),
  pulperia = reglasDe('pulperia'),
  exploradores = reglasDe('exploradores');
const fijas = (g: Record<string, number | undefined>, b: number, s: number, o: number) => (): Metas => [
  num(g.bronze, b),
  num(g.silver, s),
  num(g.gold, o),
];
const preguntas = (d: number) => 8 + r(d * 2);

export const TOPES: Record<string, TopeMotor> = {
  'cortes.garitas': kit(
    (d) => [80 + r(d * 80), 240, 400],
    (d) => 75 + d * 20,
  ),
  'cortes.topo': kit(
    (d) => [120 + r(d * 80), 320, 520],
    (d) => 70 + d * 20,
  ),
  'cortes.gruas': kit(
    (d) => [120 + r(d * 80), 300, 500],
    (d) => 75 + d * 20,
  ),
  'cortes.merendon': kit(
    (d) => [80 + r(d * 80), 240, 400],
    (d) => 80 + d * 20,
  ),
  'cortes.chuco': kit(
    (d) => [100 + r(d * 100), 300, 500],
    (d) => 70 + d * 20,
  ),
  'cortes.cortina': kit(
    (d) => [100 + r(d * 80), 280, 450],
    (d) => 70 + d * 20,
  ),
  'cortes.cusuco': kit(
    (d) => [120 + r(d * 60), 300, 480],
    (d) => 75 + d * 20,
  ),
  'franciscomorazan.rosquilla': kit(lineal(80, 180, 280, 80), (d) => 70 + d * 20),
  'franciscomorazan.repartidor': kit(lineal(80, 160, 260, 50), () => 75),
  'franciscomorazan.niebla': kit(lineal(100, 220, 340, 60), () => 75),
  'franciscomorazan.artesania': kit(lineal(100, 200, 350, 100), () => 75),
  'franciscomorazan.baleada': kit(lineal(100, 220, 340, 80), () => 70),
  'franciscomorazan.taxi': kit(
    (d) => [100 + r(d * 60), 220 + r(d * 80), 340 + r(d * 100)],
    (d) => 75 + r(d * 15),
  ),
  'franciscomorazan.asalto': kit(
    (d) => [90 + r(d * 60), 220 + r(d * 90), 360 + r(d * 120)],
    (d) => 80 + r(d * 20),
  ),
  'olancho.batea': taller,
  'olancho.arreo': taller,
  'olancho.calcita': taller,
  'olancho.cuajada': taller,
  'olancho.postura': taller,
  'olancho.tablas': taller,
  'copan.adoquin': copan,
  'copan.atol': copan,
  'copan.cadera': copan,
  'copan.estelas': copan,
  'copan.estratigrafia': copan,
  'copan.glifos': copan,
  'copan.guaras': copan,
  'copan.hojas': copan,
  'islas.absorcion': islas(110, 220, 330, 60, 85, 15),
  'islas.ballena': islas(80, 170, 260, 60, 75, 15),
  'islas.bonacca': islas(120, 260, 400, 80, 80, 15),
  'islas.cangrejo': islas(120, 240, 360, 60, 80, 10),
  'islas.colorprofundo': islas(140, 300, 460, 80, 75, 15),
  'islas.coral': islas(120, 260, 400, 80, 80, 15),
  'islas.estela': islas(120, 260, 400, 80, 80, 15),
  'islas.flotacion': islas(100, 220, 340, 60, 80, 15),
  // motores propios: el reloj puede acortarse (golpes, errores), así que solo se acotan metas y puntos
  atrapa: {
    metas: (d) => [r10(120 + 180 * d), r10(300 + 300 * d), r10(500 + 400 * d)],
    puntosPorSegundo: 40,
  },
  cocina: {
    metas: (d) => [r10(150 + 50 * d), r10(350 + 150 * d), r10(600 + 250 * d)],
    puntosPorSegundo: 40,
  },
  trivia: {
    // acertar vale 100 + 8 × segundos que sobran (10 como mucho)
    metas: (d) => {
      const x = (v: number) => r((preguntas(d) * v) / 10) * 10;
      return [x(50 + 10 * d), x(80 + 5 * d), x(108)];
    },
    puntosMax: (d) => preguntas(d) * 180,
    puntosPorSegundo: 60,
  },
  manejo: { metas: () => [120, 240, 360], puntosPorSegundo: 40 },
  feria: {
    metas: fijas(feria, 150, 280, 400),
    // 3 puestos × tiros por puesto × 60 pts del blanco más caro
    puntosMax: () => 3 * num(feria.shotsPerBooth, 6) * 60,
    puntosPorSegundo: 60,
  },
  pulperia: { metas: fijas(pulperia, 100, 180, 260), puntosPorSegundo: 20 },
  exploradores: {
    metas: fijas(exploradores, 8, 12, 15),
    puntosMax: () => 3 * num(exploradores.objectsPerSite, 5),
    puntosPorSegundo: 1,
  },
  carrera: {
    metas: () => [aPuntos(carrera.bronze, 95), aPuntos(carrera.silver, 70), aPuntos(carrera.gold, 50)],
    puntosMax: () => limite * 10,
    duracionMin: (puntos) => limite - puntos / 10,
    puntosPorSegundo: 100,
  },
  // goles: 1 estrella al ganar, 2 con dos de diferencia, 3 con los goles de oro
  futbol: { metas: () => [1, 2, num(reglasDe('futbol').goldGoals, 3)], puntosMax: () => 30, puntosPorSegundo: 1 },
};

export interface Resultado {
  motor: string;
  puntos: number;
  estrellas: number;
  /** segundos que duró la partida, medidos por quien valida */
  duracion: number;
  /** etapa jugada (0 = primera) */
  etapa: number;
  /** etapas del juego en el catálogo; sin catálogo se toma 3 */
  etapas?: number;
  gano?: boolean;
}
export interface Veredicto {
  ok: boolean;
  /** por qué no es posible (vacío si `ok`) */
  motivos: string[];
  /** estrellas que justifica el puntaje, si el motor tiene metas conocidas */
  estrellasPosibles: Estrellas | null;
  /** false si el motor no tiene tabla y se usó `TOPE_GENERICO` */
  conocido: boolean;
}

const finito = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** Dice si un resultado es posible para ese motor y etapa. No decide premios: eso es `premioPartida`. */
export function validarResultado(res: Resultado): Veredicto {
  const motivos: string[] = [],
    tope = TOPES[res.motor],
    t = tope ?? TOPE_GENERICO,
    etapas = res.etapas ?? 3;
  const { puntos, estrellas, duracion, etapa } = res;
  if (!finito(puntos) || puntos < 0) motivos.push('puntos inválidos');
  if (!Number.isInteger(estrellas) || estrellas < 0 || estrellas > 3) motivos.push('estrellas fuera de 0–3');
  if (!finito(duracion) || duracion <= 0) motivos.push('duración inválida');
  if (!Number.isInteger(etapas) || etapas < 1) motivos.push('etapas inválidas');
  if (!Number.isInteger(etapa) || etapa < 0 || etapa >= etapas) motivos.push('etapa fuera del juego');
  if (motivos.length) return { ok: false, motivos, estrellasPosibles: null, conocido: !!tope };

  const dif = difDe(etapa, etapas),
    reloj = t.reloj?.(dif);
  const minimo = Math.max(DURACION_MIN_S, reloj ?? 0, t.duracionMin?.(puntos) ?? 0);
  if (duracion < minimo - HOLGURA_S) motivos.push(`duró ${r(duracion)} s; no se puede en menos de ${r(minimo)} s`);
  if (duracion > DURACION_MAX_S) motivos.push('partida abandonada');
  const segundos = reloj ?? Math.min(duracion, DURACION_MAX_S),
    maximo = Math.min(t.puntosMax?.(dif) ?? Number.POSITIVE_INFINITY, t.puntosPorSegundo * segundos);
  if (puntos > maximo) motivos.push(`${puntos} pts no caben en ${r(segundos)} s (máximo ${r(maximo)})`);
  const metas = t.metas?.(dif),
    posibles = metas ? estrellasPara(puntos, metas) : null;
  if (posibles !== null && estrellas > posibles)
    motivos.push(`${estrellas} estrellas con ${puntos} pts; la meta da ${posibles}`);
  if (res.gano === false && estrellas > 0) motivos.push('estrellas sin ganar');
  // en los motores del kit se gana al llegar a la primera meta; `gano` no puede contradecir el puntaje
  if (metas && t.ganaConMeta && res.gano === true && puntos < metas[0])
    motivos.push(`ganó con ${puntos} pts; la meta es ${metas[0]}`);
  if (metas && t.ganaConMeta && res.gano === false && puntos >= metas[0])
    motivos.push(`perdió con ${puntos} pts; la meta es ${metas[0]}`);
  return { ok: motivos.length === 0, motivos, estrellasPosibles: posibles, conocido: !!tope };
}
