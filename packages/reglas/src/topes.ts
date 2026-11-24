// Topes para decidir si el resultado de una partida es posible. Los usa el servidor (Convex) antes de pagar.
// Las metas y relojes copian las fórmulas de cada motor (apps/web/src/game/minigames); la prueba
// apps/web/tools/test-reglas.mjs abre los motores en el navegador y revisa que no se desfasen.
import minigames from '../../../apps/web/shared/data/minigames.json' with { type: 'json' };
import type { Estrellas } from './premios.ts';

type Metas = [number, number, number];
/** Tema del juego en el catálogo (`juego.tema`): algunos motores sacan de ahí sus metas. */
export type Tema = Record<string, unknown>;
export interface TopeMotor {
  /**
   * metas de 1, 2 y 3 estrellas según la dificultad (0..1); mayor es mejor. Si el motor las calcula con datos que
   * el servidor no tiene (semilla, canción), son una cota inferior: nunca más altas que las reales.
   */
  metas?: (dif: number, tema: Tema) => Metas;
  /** reloj fijo del motor en segundos: la partida no puede durar menos (algunos motores solo lo tienen con cierto tema) */
  reloj?: (dif: number, tema?: Tema) => number | undefined;
  /** duración mínima según el resultado (motores sin reloj fijo, o donde terminar rápido da más puntos) */
  duracionMin?: (r: { puntos: number; dif: number; gano: boolean | undefined }) => number;
  /** puntaje máximo absoluto */
  puntosMax?: (dif: number, tema?: Tema) => number;
  /** puntos por segundo que nadie supera (sobre el reloj si existe; si no, sobre la duración reportada) */
  puntosPorSegundo: number | ((dif: number, tema: Tema) => number);
  /** se gana exactamente al llegar a la primera meta (motores del kit) */
  ganaConMeta?: boolean;
  /** ganar pide al menos la primera meta y una estrella (perder con puntos sí se puede) */
  ganarPideMeta?: boolean;
  /** motor del kit (`defineMotor`): test-reglas.mjs compara sus metas y reloj con el juego */
  kit?: boolean;
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
  kit: true,
});
/** El mismo tope con otro ritmo máximo (motores donde un jugador fino pasa de 20 pts/s). */
const conRitmo = (t: TopeMotor, puntosPorSegundo: number): TopeMotor => ({ ...t, puntosPorSegundo });
const lineal = (a: number, b: number, c: number, k: number) => (d: number) =>
  [a + r(d * k), b + r(d * k), c + r(d * k)] as Metas;
const taller = kit(lineal(80, 240, 400, 80), () => 75);
const intibuca = kit(
  (d) => [120 + Math.round(d * 120), 360, 600],
  () => 75,
);
/** los ocho motores de Copán comparten metas y reloj (apps/web/src/game/minigames/copan/comun.tsx) */
const copan = kit(
  (d) => [120 + r(d * 120), 360, 600],
  () => 75,
);
/** Lempira: metas y reloj de minigames/lempira/comun.tsx. */
const lempira = kit(
  (d) => [120 + r(d * 120), 360, 600],
  () => 75,
);
/** El Paraíso: metas y reloj de minigames/elparaiso/comun.tsx. */
const elparaiso = kit(
  (d) => [120 + r(d * 120), 360, 600],
  () => 75,
);
// Valle
/** Valle: metas y reloj de minigames/valle/comun.tsx. */
const valle = kit(
  (d) => [120 + r(d * 120), 360, 600],
  () => 75,
);
/** Choluteca: metas y reloj de minigames/choluteca/comun.tsx. */
const choluteca = kit(
  (d) => [120 + r(d * 120), 360, 600],
  () => 75,
);
// La Paz
/** La Paz: metas y reloj de minigames/lapaz/comun.tsx. */
const lapaz = kit(
  (d) => [120 + r(d * 120), 360, 600],
  () => 75,
);
/** Colón: metas y reloj de minigames/colon/comun.tsx. */
const colon = kit(
  (d) => [120 + r(d * 120), 360, 600],
  () => 75,
);
// Ocotepeque
/** Ocotepeque: metas y reloj de minigames/ocotepeque/comun.tsx. */
const ocotepeque = kit(
  (d) => [120 + r(d * 120), 360, 600],
  () => 75,
);
// Gracias a Dios
/** Gracias a Dios: metas y reloj de minigames/graciasadios/comun.tsx. */
const graciasadios = kit(
  (d) => [120 + r(d * 120), 360, 600],
  () => 75,
);
// Santa Bárbara
/** Santa Bárbara: metas y reloj de minigames/santabarbara/comun.tsx. */
const santabarbara = kit(
  (d) => [120 + r(d * 120), 360, 600],
  () => 75,
);
// Yoro
/** Yoro: metas y reloj de minigames/yoro/comun.tsx. */
const yoro = kit(
  (d) => [120 + r(d * 120), 360, 600],
  () => 75,
);
const islas = (a: number, b: number, c: number, k: number, base: number, extra: number) =>
  kit(lineal(a, b, c, k), (d) => base + r(d * extra));
/** Comayagua: `metasLineales` y `reloj` de apps/web/src/game/minigames/comayagua/comun.tsx */
const comayagua = (a: number, b: number, c: number, k: number) => kit(lineal(a, b, c, k), (d) => 80 + r(d * 10));

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
/** Exploradores clásico: con menos sitios en el tema, las metas se achican igual que en exploradores/Scene.tsx. */
function metasExploradores(tema: Tema | undefined): Metas {
  const base = num(exploradores.bronze, 8),
    plata = num(exploradores.silver, 12),
    porSitio = num(exploradores.objectsPerSite, 5),
    todos = Array.isArray(exploradores.sites) ? (exploradores.sites as unknown[]).length : 3;
  const sitios = Array.isArray(tema?.sitios) && tema.sitios.length ? tema.sitios.length : todos,
    k = sitios / todos,
    tot = sitios * porSitio,
    sc = (v: number) => Math.min(tot, Math.max(1, r(v * k)));
  return [sc(base), Math.max(sc(base) + 1, sc(plata)), sitios === todos ? num(exploradores.gold, 15) : tot];
}

// ------------------------------------------------------------------ motores propios sin tabla en minigames.json
/** Ritmo (Ritmo.tsx, ritmo/musica.ts): la canción dura L = 60 + 26·dif s y las metas son 15–52 % del máximo. */
const largoCancion = (d: number) => 60 + 26 * d;
/**
 * Cota inferior del máximo de la canción: el estilo más lento (84 bpm) con respuesta «copia» y la menor cantidad
 * de acentos es la que menos notas trae; cada nota vale 100 × (1 + racha/10, hasta ×4).
 */
function maxCancionMin(d: number) {
  const step = 60 / 84 / 2,
    frases = Math.max(4, Math.floor(largoCancion(d) / (step * 16))),
    notas = frases * (4 + Math.min(4, 1 + r(d * 2)));
  let max = 0;
  for (let i = 0; i < notas; i++) max += 100 * (1 + Math.min(3, Math.floor(i / 10)));
  return max;
}
const metasRitmo = (d: number): Metas => {
  const m = maxCancionMin(d),
    f = (k: number) => r((m * k) / 10) * 10;
  return [f(0.15 + 0.08 * d), f(0.3 + 0.1 * d), f(0.45 + 0.07 * d)];
};
/** Pesca (Pesca.tsx): metas por el valor promedio de los peces del tema; reloj 85–100 s que los errores acortan. */
const PECES_PESCA = [10, 20, 30, 45, 70];
const valoresPeces = (tema: Tema) => {
  const l = Array.isArray(tema.peces) && tema.peces.length ? (tema.peces as unknown[]) : null;
  const v = l?.map((p) => (Array.isArray(p) && typeof p[1] === 'number' ? p[1] : Number.NaN));
  return v && v.every(Number.isFinite) ? v : PECES_PESCA;
};
const metasPesca = (d: number, tema: Tema): Metas => {
  const v = valoresPeces(tema ?? {}),
    avg = v.reduce((a, b) => a + b, 0) / v.length,
    k = 1 + 0.15 * d,
    m = (n: number) => Math.max(30, r((avg * n * k) / 5) * 5);
  return [m(3), m(5.5), m(7)];
};
const segPesca = (d: number) => r(85 + 15 * d);
/** Ruta (Ruta.tsx): límite 70–110 s; ganar paga 10 por segundo que sobra + 40 por gema; las estrellas van por el
 * tiempo que sobra (30 % y 55 %). */
const limiteRuta = (d: number) => r(70 + 40 * d);
/** Nadie cruza la ruta (más de 90 m con saltos) en menos de esto, aunque corra todo el camino. */
const RUTA_MIN_S = 15;
/** Monta (Monta.tsx): se gana aguantando 60–90 s; las estrellas 2 y 3 piden puntos de estilo. */
const montaDur = (d: number) => r(60 + 30 * d);
const montaMetas = (d: number): Metas => {
  const dur = montaDur(d);
  return [0, r((dur * 60 * (0.35 + 0.1 * d)) / 10) * 10, r((dur * 60 * (0.7 + 0.1 * d)) / 10) * 10];
};

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
  'intibuca.telar': conRitmo(intibuca, 32),
  'intibuca.hongos': conRitmo(intibuca, 28),
  'intibuca.callejero': conRitmo(intibuca, 46),
  'intibuca.papas': conRitmo(intibuca, 25),
  'intibuca.semilla': conRitmo(intibuca, 24),
  'intibuca.vaho': conRitmo(intibuca, 40),
  'intibuca.ondas': conRitmo(intibuca, 25),
  'intibuca.carrera': {
    ganarPideMeta: true,
    metas: () => [250, 500, 700],
    puntosMax: () => 1200,
    duracionMin: ({ puntos }) => 120 - puntos / 10,
    puntosPorSegundo: 100,
  },
  'copan.adoquin': copan,
  'copan.atol': copan,
  'lempira.barro': lempira,
  'lempira.opalo': conRitmo(lempira, 40),
  'lempira.cuencas': conRitmo(lempira, 40),
  'lempira.rebote': conRitmo(lempira, 60),
  'lempira.pigmentos': conRitmo(lempira, 40),
  'lempira.trapiche': conRitmo(lempira, 30),
  'lempira.termal': lempira,
  // El Paraíso
  'elparaiso.trivia': conRitmo(elparaiso, 40),
  'elparaiso.montuca': conRitmo(elparaiso, 40),
  'elparaiso.carrozamaiz': conRitmo(elparaiso, 40),
  'elparaiso.mina': conRitmo(elparaiso, 40),
  'elparaiso.tapisca': conRitmo(elparaiso, 40),
  'elparaiso.aleros': conRitmo(elparaiso, 40),
  'elparaiso.fronterafila': conRitmo(elparaiso, 40),
  'elparaiso.costura': conRitmo(elparaiso, 40),
  // Valle
  'valle.curil': conRitmo(valle, 40),
  'valle.bicitaxi': conRitmo(valle, 40),
  'valle.embarque': conRitmo(valle, 40),
  'valle.volcan': conRitmo(valle, 40),
  'valle.raices': conRitmo(valle, 40),
  'valle.saljocote': conRitmo(valle, 40),
  'valle.redviva': conRitmo(valle, 40),
  'valle.punche': conRitmo(valle, 40),
  // Choluteca: el ritmo sale de cuánto paga cada acierto y la espera mínima entre aciertos
  'choluteca.puentes': conRitmo(choluteca, 40),
  'choluteca.tortuga': conRitmo(choluteca, 56),
  'choluteca.estanque': choluteca,
  'choluteca.sombra': conRitmo(choluteca, 26),
  'choluteca.mielrosca': conRitmo(choluteca, 35),
  'choluteca.cincha': conRitmo(choluteca, 67),
  'choluteca.ventanasbus': choluteca,
  'choluteca.mareapaseo': choluteca,
  // La Paz
  'lapaz.catacion': conRitmo(lapaz, 45),
  'lapaz.cafe': conRitmo(lapaz, 35),
  'lapaz.tostador': conRitmo(lapaz, 30),
  'lapaz.reciprocidad': conRitmo(lapaz, 35),
  'lapaz.vapor': conRitmo(lapaz, 25),
  'lapaz.pesas': conRitmo(lapaz, 60),
  'lapaz.abrasigo': conRitmo(lapaz, 40),
  'lapaz.estiba': conRitmo(lapaz, 35),
  // Colón: el ritmo sale de cuánto paga cada acierto y la espera mínima entre aciertos
  'colon.salinidad': colon,
  'colon.visualbahia': conRitmo(colon, 45),
  'colon.gajos': conRitmo(colon, 35),
  'colon.remolque': conRitmo(colon, 45),
  'colon.redjuvenil': conRitmo(colon, 40),
  'colon.plano': conRitmo(colon, 40),
  'colon.racimos': conRitmo(colon, 45),
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
  // alfombra de 8–16 plantillas: 5 por celda + 10 por borde limpio + 5 × plantillas al terminarla (~24 pts/s fino)
  'comayagua.aserrin': conRitmo(comayagua(140, 300, 460, 60), 35),
  'comayagua.reloj': comayagua(120, 300, 460, 60),
  'comayagua.eco': comayagua(100, 220, 340, 10),
  'comayagua.pilon': comayagua(120, 260, 400, 60),
  'comayagua.tenampua': comayagua(100, 220, 340, 40),
  'comayagua.anden': comayagua(80, 180, 280, 40),
  'comayagua.mantas': comayagua(120, 300, 480, 120),
  'comayagua.fachadas': comayagua(90, 210, 330, 50),
  // Atlántida (apps/web/src/game/minigames/atlantida): metas lineales y reloj de 80 + 15 × dificultad
  'atlantida.balsa': islas(120, 260, 400, 80, 80, 15),
  // bandejas de hasta ~12 bollos (20 c/u + 30) cada ~5 s con el horno de 3,1 s
  'atlantida.pancoco': conRitmo(islas(200, 450, 700, 100, 80, 15), 45),
  // cada viaje paga 10 + carga (67–93 pts) cada ~3,6 s: ~26 pts/s jugando fino
  'atlantida.vagon': conRitmo(islas(150, 400, 650, 100, 80, 15), 35),
  'atlantida.manati': islas(100, 220, 340, 60, 80, 15),
  // 50 por unión buena (tres elecciones) + 20 por gaveta
  'atlantida.lancetilla': conRitmo(islas(200, 450, 700, 100, 80, 15), 35),
  'atlantida.canopy': islas(150, 320, 500, 80, 80, 15),
  'atlantida.carnaval': islas(120, 280, 440, 80, 80, 15),
  // Corte (Corte.tsx): reloj fijo 70–100 s, se gana con la primera meta; el combo (hasta ×5) dispara el puntaje
  corte: {
    metas: (d) => [r((200 + 800 * d) / 10) * 10, r((450 + 1950 * d) / 10) * 10, r((800 + 3700 * d) / 10) * 10],
    reloj: (d) => r(70 + 30 * d),
    puntosPorSegundo: 150,
    ganaConMeta: true,
  },
  ritmo: {
    metas: metasRitmo,
    // la canción siempre se toca entera (la respuesta puede cortar hasta una frase de ~5,7 s)
    duracionMin: ({ dif }) => largoCancion(dif) - 2,
    // ~4 notas por segundo como mucho, 100 × 4 cada una
    puntosPorSegundo: 2000,
    ganarPideMeta: true,
  },
  monta: {
    metas: montaMetas,
    // derribado se pierde en cualquier momento; ganar es aguantar todo el reloj
    duracionMin: ({ dif, gano }) => (gano ? montaDur(dif) : DURACION_MIN_S),
    // ~60 por segundo de estilo + 150 por brinco
    puntosPorSegundo: 100,
    ganarPideMeta: true,
  },
  pesca: {
    metas: metasPesca,
    // castigos de 0,5–1,5 s por error acortan el reloj: ni así se llega a la mitad
    duracionMin: ({ dif }) => segPesca(dif) / 2,
    // el pez más caro con racha (×1,5) más la mitad de lo del compa en dúo, cada ~2 s
    puntosPorSegundo: (_d, tema) => Math.max(60, (Math.max(...valoresPeces(tema ?? {})) * 1.5 * 1.5) / 2),
    ganarPideMeta: true,
  },
  ruta: {
    // ganar con k estrellas deja al menos 0 %, 30 % o 55 % del tiempo: 10 pts por segundo que sobra
    metas: (d) => [0, 3 * limiteRuta(d), Math.floor(5.5 * limiteRuta(d))],
    // perder es agotar el reloj; ganar tarda al menos lo que no sobró (las gemas solo hacen la cota más suelta)
    duracionMin: ({ puntos, dif, gano }) =>
      gano ? Math.max(RUTA_MIN_S, limiteRuta(dif) - puntos / 10) : limiteRuta(dif),
    // menos de 80 gemas por recorrido
    puntosMax: (d) => limiteRuta(d) * 10 + 80 * 40,
    puntosPorSegundo: 1000,
    ganarPideMeta: true,
  },
  // motores propios: el reloj puede acortarse (golpes, errores), así que solo se acotan metas y puntos
  // con cubeta y poza (Lluvia de Peces) la tanda llena y limpia paga doble: metas un 30 % más altas
  atrapa: {
    metas: (d, tema) => {
      const k = tema?.poza && !Array.isArray(tema.cubetas) ? 1.3 : 1;
      return [r10(k * (120 + 180 * d)), r10(k * (300 + 300 * d)), r10(k * (500 + 400 * d))];
    },
    puntosPorSegundo: 40,
    ganarPideMeta: true,
  },
  cocina: {
    metas: (d) => [r10(150 + 50 * d), r10(350 + 150 * d), r10(600 + 250 * d)],
    puntosPorSegundo: 40,
    ganarPideMeta: true,
  },
  trivia: {
    // acertar vale 100 + 8 × segundos que sobran (10 como mucho)
    metas: (d) => {
      const x = (v: number) => r((preguntas(d) * v) / 10) * 10;
      return [x(50 + 10 * d), x(80 + 5 * d), x(108)];
    },
    puntosMax: (d) => preguntas(d) * 180,
    puntosPorSegundo: 60,
    ganarPideMeta: true,
  },
  // ganar pide recorrer la distancia y que pasen 60 s (Manejo.tsx)
  manejo: {
    metas: () => [120, 240, 360],
    duracionMin: ({ gano }) => (gano ? 60 : DURACION_MIN_S),
    puntosPorSegundo: 40,
    ganarPideMeta: true,
  },
  feria: {
    metas: fijas(feria, 150, 280, 400),
    // 3 puestos × tiros por puesto × 60 pts del blanco más caro
    puntosMax: () => 3 * num(feria.shotsPerBooth, 6) * 60,
    puntosPorSegundo: 60,
    ganarPideMeta: true,
  },
  pulperia: { metas: fijas(pulperia, 100, 180, 260), puntosPorSegundo: 20, ganarPideMeta: true },
  // con `tema.archivo` es el archivo de Ciudad Blanca (Gracias a Dios): motor del kit con las metas de graciasadios;
  // 25 pts por marca y 50 por ficha, con 0,4 s entre registros y la ruta caminada: menos de 110 pts por segundo
  exploradores: {
    metas: (d, tema) => (tema?.archivo ? (graciasadios.metas?.(d, tema) ?? [0, 0, 0]) : metasExploradores(tema)),
    reloj: (d, tema) => (tema?.archivo ? graciasadios.reloj?.(d) : undefined),
    puntosMax: (_d, tema) => (tema?.archivo ? Number.POSITIVE_INFINITY : 3 * num(exploradores.objectsPerSite, 5)),
    puntosPorSegundo: (_d, tema) => (tema?.archivo ? 110 : 1),
    ganarPideMeta: true,
  },
  carrera: {
    metas: () => [aPuntos(carrera.bronze, 95), aPuntos(carrera.silver, 70), aPuntos(carrera.gold, 50)],
    puntosMax: () => limite * 10,
    duracionMin: ({ puntos }) => limite - puntos / 10,
    puntosPorSegundo: 100,
  },
  // goles: 1 estrella al ganar, 2 con dos de diferencia, 3 con los goles de oro
  futbol: {
    metas: () => [1, 2, num(reglasDe('futbol').goldGoals, 3)],
    puntosMax: () => 30,
    puntosPorSegundo: 1,
    ganarPideMeta: true,
  },
  // Ocotepeque
  'ocotepeque.trifinio': conRitmo(ocotepeque, 40),
  'ocotepeque.archivoagua': conRitmo(ocotepeque, 40),
  'ocotepeque.boveda': conRitmo(ocotepeque, 40),
  'ocotepeque.mercadomadruga': conRitmo(ocotepeque, 40),
  // 40 pts por acierto con media espera de 0,5 s
  'ocotepeque.gotasviento': conRitmo(ocotepeque, 80),
  'ocotepeque.reservas': conRitmo(ocotepeque, 40),
  'ocotepeque.moras': conRitmo(ocotepeque, 40),
  // 45 pts por cruce, otro cada segundo
  'ocotepeque.rotulos': conRitmo(ocotepeque, 45),
  // Gracias a Dios
  // 30 pts por columna + 10 de relieve continuo, 0,6 s entre columnas
  'graciasadios.lidar': conRitmo(graciasadios, 70),
  // 50 pts por confluencia, una cada 2,8 s como mínimo
  'graciasadios.pipante': graciasadios,
  // un grupo de cinco paga 75 y tarda 3 s en cruzar
  'graciasadios.pistalempira': conRitmo(graciasadios, 30),
  // 40 pts por par de marcas, uno cada 2,7 s como mínimo
  'graciasadios.caratasca': graciasadios,
  // 30 + 15 por casilla de la zona (hasta seis), 0,25 s por casilla y 0,8 s tras observar
  'graciasadios.rastros': conRitmo(graciasadios, 55),
  // 8 pts por grumo, cinco por pasada cada 0,45 s, y 40 por tanda de 20 grumos o más
  'graciasadios.wabul': conRitmo(graciasadios, 120),
  // 15 pts por bulto cada 0,5 s y 40 al cerrar una entrega de dos bultos
  'graciasadios.truequeflotante': conRitmo(graciasadios, 75),
  // Santa Bárbara: el ritmo sale de cuánto paga cada acierto y la espera mínima entre aciertos
  // 30 pts por costilla justa cada 0,6 s (+40 al remate, que pide armar toda la figura)
  'santabarbara.chimenea': conRitmo(santabarbara, 80),
  // 35 pts por vuelta cada 0,6 s
  'santabarbara.junco': conRitmo(santabarbara, 70),
  // 20 pts por carga cada 0,5 s y 40 al cruzar (un paso pide al menos cinco cargas)
  'santabarbara.caliza': conRitmo(santabarbara, 70),
  // 15 por la fuga y 40 por el piso, cada uno con 0,6 s de espera
  'santabarbara.perspectiva': conRitmo(santabarbara, 60),
  // 60 pts por coincidencia y 0,6 s de espera entre marcas
  'santabarbara.goteo': conRitmo(santabarbara, 110),
  // 15 pts por pieza cada 0,5 s y 40 al completar el tejido (cinco piezas o más)
  'santabarbara.juncocorte': conRitmo(santabarbara, 50),
  // 35 pts por parte cada 0,6 s y 30 al terminar el gigante (tres partes o más)
  'santabarbara.papel': conRitmo(santabarbara, 90),
  // Yoro: puntos por acierto ÷ espera mínima entre aciertos (con la pausa entre tandas)
  'yoro.cable': conRitmo(yoro, 40),
  'yoro.acuerdos': conRitmo(yoro, 40),
  'yoro.jamo': conRitmo(yoro, 40),
  // con dos sensores casi juntos se puede retirar a los 0,5 s: 70 pts cada 1,5 s
  'yoro.ulua': conRitmo(yoro, 60),
  // un desviador y cruzar: 80 pts cada 1,75 s
  'yoro.pijol': conRitmo(yoro, 60),
  // tres cortes cada 0,55 s y 1,2 s de pausa: 80 pts cada 2,3 s
  'yoro.almohadilla': conRitmo(yoro, 45),
  'yoro.coyol': conRitmo(yoro, 40),
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
  /** tema del juego en el catálogo (lo usan las metas de algunos motores) */
  tema?: Tema;
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
  const { puntos, estrellas, duracion, etapa } = res,
    tema = res.tema ?? {};
  if (!finito(puntos) || puntos < 0) motivos.push('puntos inválidos');
  if (!Number.isInteger(estrellas) || estrellas < 0 || estrellas > 3) motivos.push('estrellas fuera de 0–3');
  if (!finito(duracion) || duracion <= 0) motivos.push('duración inválida');
  if (!Number.isInteger(etapas) || etapas < 1) motivos.push('etapas inválidas');
  if (!Number.isInteger(etapa) || etapa < 0 || etapa >= etapas) motivos.push('etapa fuera del juego');
  if (motivos.length) return { ok: false, motivos, estrellasPosibles: null, conocido: !!tope };

  const dif = difDe(etapa, etapas),
    reloj = t.reloj?.(dif, tema);
  const minimo = Math.max(DURACION_MIN_S, reloj ?? 0, t.duracionMin?.({ puntos, dif, gano: res.gano }) ?? 0);
  if (duracion < minimo - HOLGURA_S) motivos.push(`duró ${r(duracion)} s; no se puede en menos de ${r(minimo)} s`);
  if (duracion > DURACION_MAX_S) motivos.push('partida abandonada');
  const segundos = reloj ?? Math.min(duracion, DURACION_MAX_S),
    pps = typeof t.puntosPorSegundo === 'function' ? t.puntosPorSegundo(dif, tema) : t.puntosPorSegundo,
    maximo = Math.min(t.puntosMax?.(dif, tema) ?? Number.POSITIVE_INFINITY, pps * segundos);
  if (puntos > maximo) motivos.push(`${puntos} pts no caben en ${r(segundos)} s (máximo ${r(maximo)})`);
  const metas = t.metas?.(dif, tema),
    posibles = metas ? estrellasPara(puntos, metas) : null;
  if (posibles !== null && estrellas > posibles)
    motivos.push(`${estrellas} estrellas con ${puntos} pts; la meta da ${posibles}`);
  if (res.gano === false && estrellas > 0) motivos.push('estrellas sin ganar');
  // en los motores del kit se gana al llegar a la primera meta; `gano` no puede contradecir el puntaje
  if (metas && t.ganaConMeta && res.gano === true && puntos < metas[0])
    motivos.push(`ganó con ${puntos} pts; la meta es ${metas[0]}`);
  if (metas && t.ganaConMeta && res.gano === false && puntos >= metas[0])
    motivos.push(`perdió con ${puntos} pts; la meta es ${metas[0]}`);
  // en los demás, ganar también pide la primera meta y al menos una estrella
  if (metas && t.ganarPideMeta && res.gano === true && puntos < metas[0])
    motivos.push(`ganó con ${puntos} pts; la meta es ${metas[0]}`);
  if (t.ganarPideMeta && res.gano === true && estrellas < 1) motivos.push('ganó sin estrellas');
  return { ok: motivos.length === 0, motivos, estrellasPosibles: posibles, conocido: !!tope };
}
