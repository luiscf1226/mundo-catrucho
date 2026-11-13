// validarResultado: un puntaje normal pasa y uno imposible se rechaza, con las metas reales de cada motor.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { difDe, estrellasPara, TOPES, validarResultado } from '../src/index.ts';

const pasa = (r) => {
  const v = validarResultado(r);
  assert.ok(v.ok, `${r.motor}: debería pasar ${JSON.stringify(r)} → ${v.motivos.join('; ')}`);
  return v;
};
const falla = (r, motivo) => {
  const v = validarResultado(r);
  assert.equal(v.ok, false, `${r.motor}: debería fallar ${JSON.stringify(r)}`);
  if (motivo)
    assert.ok(
      v.motivos.some((m) => m.includes(motivo)),
      `${v.motivos.join('; ')} no dice «${motivo}»`,
    );
  return v;
};

test('dificultad igual a partida(): 0 en la primera, 1 en la última, 0.35 sin etapas', () => {
  assert.equal(difDe(0, 3), 0);
  assert.equal(difDe(2, 3), 1);
  assert.equal(difDe(1, 5), 0.25);
  assert.equal(difDe(0, 1), 0.35);
});

test('cortes.chuco (kit): metas 100/300/500 en la etapa 1, 200/300/500 en la última; reloj 70–90 s', () => {
  assert.deepEqual(TOPES['cortes.chuco'].metas(0), [100, 300, 500]);
  assert.deepEqual(TOPES['cortes.chuco'].metas(1), [200, 300, 500]);
  const v = pasa({ motor: 'cortes.chuco', puntos: 320, estrellas: 2, duracion: 74, etapa: 0, etapas: 3 });
  assert.equal(v.estrellasPosibles, 2);
  assert.equal(v.conocido, true);
  pasa({ motor: 'cortes.chuco', puntos: 150, estrellas: 0, duracion: 95, etapa: 2, etapas: 3, gano: false });
  falla({ motor: 'cortes.chuco', puntos: 320, estrellas: 3, duracion: 74, etapa: 0 }, 'estrellas');
  falla({ motor: 'cortes.chuco', puntos: 600, estrellas: 3, duracion: 20, etapa: 0 }, 'menos de 70');
  falla({ motor: 'cortes.chuco', puntos: 9000, estrellas: 3, duracion: 80, etapa: 0 }, 'no caben');
  // en la última etapa el reloj es de 90 s: 80 s no alcanza
  falla({ motor: 'cortes.chuco', puntos: 500, estrellas: 3, duracion: 80, etapa: 2, etapas: 3 }, 'menos de 90');
});

test('olancho.batea (taller): metas 80/240/400 → 160/320/480 y reloj de 75 s', () => {
  assert.deepEqual(TOPES['olancho.batea'].metas(1), [160, 320, 480]);
  pasa({ motor: 'olancho.batea', puntos: 400, estrellas: 3, duracion: 78, etapa: 0 });
  falla({ motor: 'olancho.batea', puntos: 400, estrellas: 3, duracion: 78, etapa: 2 }, 'la meta da 2');
  falla({ motor: 'olancho.batea', puntos: 1600, estrellas: 3, duracion: 600, etapa: 0 }, 'no caben');
});

test('franciscomorazan.rosquilla: las tres metas suben con la etapa', () => {
  assert.deepEqual(TOPES['franciscomorazan.rosquilla'].metas(0.5), [120, 220, 320]);
  pasa({ motor: 'franciscomorazan.rosquilla', puntos: 300, estrellas: 2, duracion: 85, etapa: 1, etapas: 3 });
  falla({ motor: 'franciscomorazan.rosquilla', puntos: 300, estrellas: 3, duracion: 85, etapa: 1, etapas: 3 });
});

test('trivia: metas según cuántas preguntas trae la etapa y tope por pregunta', () => {
  assert.deepEqual(TOPES.trivia.metas(0), [400, 640, 860]);
  assert.deepEqual(TOPES.trivia.metas(1), [600, 850, 1080]);
  pasa({ motor: 'trivia', puntos: 900, estrellas: 3, duracion: 80, etapa: 0 });
  falla({ motor: 'trivia', puntos: 2000, estrellas: 3, duracion: 120, etapa: 0 }, 'máximo 1440');
});

test('carrera: puntos = (120 − segundos) × 10; no se puede llegar más rápido de lo que dice el puntaje', () => {
  assert.deepEqual(TOPES.carrera.metas(0), [250, 500, 700]);
  pasa({ motor: 'carrera', puntos: 700, estrellas: 3, duracion: 51, etapa: 0 });
  pasa({ motor: 'carrera', puntos: 0, estrellas: 0, duracion: 121, etapa: 0, gano: false });
  falla({ motor: 'carrera', puntos: 900, estrellas: 3, duracion: 20, etapa: 0 }, 'menos de 30');
  falla({ motor: 'carrera', puntos: 1300, estrellas: 3, duracion: 200, etapa: 0 }, 'máximo 1200');
});

test('feria y pulpería: metas de minigames.json', () => {
  assert.deepEqual(TOPES.feria.metas(0), [150, 280, 400]);
  assert.deepEqual(TOPES.pulperia.metas(0), [100, 180, 260]);
  pasa({ motor: 'feria', puntos: 410, estrellas: 3, duracion: 60, etapa: 0 });
  falla({ motor: 'feria', puntos: 1200, estrellas: 3, duracion: 60, etapa: 0 }, 'máximo 1080');
  pasa({ motor: 'pulperia', puntos: 190, estrellas: 2, duracion: 92, etapa: 0 });
  falla({ motor: 'pulperia', puntos: 190, estrellas: 3, duracion: 92, etapa: 0 }, 'la meta da 2');
});

test('fútbol: tres estrellas piden los goles de oro', () => {
  pasa({ motor: 'futbol', puntos: 3, estrellas: 3, duracion: 125, etapa: 0 });
  falla({ motor: 'futbol', puntos: 1, estrellas: 3, duracion: 125, etapa: 0 });
});

test('datos rotos se rechazan antes de mirar metas', () => {
  for (const malo of [
    { puntos: -1 },
    { puntos: Number.NaN },
    { estrellas: 4 },
    { estrellas: 1.5 },
    { duracion: 0 },
    { duracion: Number.POSITIVE_INFINITY },
    { etapa: 3, etapas: 3 },
    { etapa: -1 },
  ])
    falla({ motor: 'cortes.topo', puntos: 200, estrellas: 1, duracion: 80, etapa: 0, ...malo });
  falla({ motor: 'cortes.topo', puntos: 200, estrellas: 1, duracion: 80, etapa: 0, gano: false }, 'sin ganar');
  falla({ motor: 'cortes.topo', puntos: 200, estrellas: 1, duracion: 4000, etapa: 0 }, 'abandonada');
});

test('motor sin tabla: topes sueltos y conocido = false', () => {
  const v = pasa({ motor: 'copan.nuevo', puntos: 500, estrellas: 3, duracion: 60, etapa: 0 });
  assert.equal(v.conocido, false);
  assert.equal(v.estrellasPosibles, null);
  falla({ motor: 'copan.nuevo', puntos: 500, estrellas: 3, duracion: 2, etapa: 0 }, 'menos de 5');
  falla({ motor: 'copan.nuevo', puntos: 1e7, estrellas: 3, duracion: 60, etapa: 0 }, 'no caben');
});

test('cada motor del kit: el oro justo en el reloj justo pasa, y una estrella de más no', () => {
  for (const [motor, t] of Object.entries(TOPES)) {
    if (!t.reloj) continue;
    for (const etapa of [0, 1, 2]) {
      const dif = difDe(etapa, 3),
        metas = t.metas(dif),
        reloj = t.reloj(dif);
      assert.equal(estrellasPara(metas[2], metas), 3);
      pasa({ motor, puntos: metas[2], estrellas: 3, duracion: reloj + 3, etapa });
      falla({ motor, puntos: metas[0], estrellas: 2, duracion: reloj + 3, etapa }, 'estrellas');
      assert.ok(reloj >= 60 && reloj <= 120, `${motor}: reloj ${reloj}`);
    }
  }
});

test('kit: «ganó» tiene que cuadrar con la primera meta', () => {
  falla({ motor: 'cortes.chuco', puntos: 0, estrellas: 0, duracion: 75, etapa: 0, gano: true }, 'ganó con 0');
  falla({ motor: 'copan.cadera', puntos: 300, estrellas: 1, duracion: 76, etapa: 0, gano: false }, 'perdió con 300');
  pasa({ motor: 'copan.cadera', puntos: 120, estrellas: 1, duracion: 76, etapa: 0, gano: true });
  // el fútbol gana por diferencia de goles, no por meta: perder 2 a 3 con dos goles es posible
  pasa({ motor: 'futbol', puntos: 2, estrellas: 0, duracion: 90, etapa: 0, gano: false });
});

test('Copán e Islas: un puntaje imposible para el reloj real no pasa', () => {
  falla({ motor: 'copan.cadera', puntos: 5000, estrellas: 3, duracion: 76, etapa: 0, gano: true }, 'no caben');
  falla({ motor: 'islas.coral', puntos: 400, estrellas: 3, duracion: 30, etapa: 0, gano: true }, 'no se puede');
});

test('Comayagua: el reloj y las metas de sus motores también se cuidan', () => {
  // 80 s de reloj en la primera etapa: el aserrín admite 35 pts/s (un jugador fino hace ~24), 3000 no cabe
  falla({ motor: 'comayagua.aserrin', puntos: 3000, estrellas: 3, duracion: 82, etapa: 0, gano: true }, 'no caben');
  falla({ motor: 'comayagua.eco', puntos: 340, estrellas: 3, duracion: 40, etapa: 0, gano: true }, 'no se puede');
  falla({ motor: 'comayagua.mantas', puntos: 150, estrellas: 2, duracion: 82, etapa: 0, gano: true }, 'estrellas');
  pasa({ motor: 'comayagua.reloj', puntos: 460, estrellas: 3, duracion: 82, etapa: 0, gano: true });
  // la última etapa sube metas y reloj: 90 s y 180 pts para ganar el reloj
  falla(
    { motor: 'comayagua.reloj', puntos: 170, estrellas: 1, duracion: 91, etapa: 3, etapas: 4, gano: true },
    'ganó con 170',
  );
  pasa({ motor: 'comayagua.reloj', puntos: 180, estrellas: 1, duracion: 91, etapa: 3, etapas: 4, gano: true });
});

test('Atlántida: cada motor tiene tope y un puntaje imposible no pasa', () => {
  for (const motor of ['balsa', 'pancoco', 'vagon', 'manati', 'lancetilla', 'canopy', 'carnaval'].map(
    (m) => `atlantida.${m}`,
  )) {
    const v = validarResultado({ motor, puntos: 0, estrellas: 0, duracion: 81, etapa: 0, gano: false });
    assert.ok(v.conocido, `${motor} sin tope`);
  }
  pasa({ motor: 'atlantida.balsa', puntos: 400, estrellas: 3, duracion: 81, etapa: 0, gano: true });
  falla({ motor: 'atlantida.balsa', puntos: 5000, estrellas: 3, duracion: 81, etapa: 0, gano: true }, 'no caben');
  falla({ motor: 'atlantida.pancoco', puntos: 700, estrellas: 3, duracion: 40, etapa: 0, gano: true }, 'no se puede');
  falla({ motor: 'atlantida.lancetilla', puntos: 450, estrellas: 3, duracion: 81, etapa: 0, gano: true }, 'estrellas');
  falla({ motor: 'atlantida.canopy', puntos: 0, estrellas: 0, duracion: 81, etapa: 0, gano: true }, 'ganó con 0');
});

const datos = (f) => JSON.parse(readFileSync(new URL(`../../../apps/web/shared/data/${f}`, import.meta.url), 'utf8'));

test('ningún motor queda sin tope: todos los de minigames.json y del catálogo tienen fila con metas', () => {
  const catalogo = readdirSync(new URL('../../../apps/web/shared/data/catalogo/', import.meta.url))
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => Object.values(datos(`catalogo/${f}`)).flatMap((d) => (d.juegos ?? []).map((j) => j[2])));
  const motores = new Set([...datos('minigames.json').map((m) => m.id), ...catalogo]);
  const sinTope = [...motores].filter((m) => !TOPES[m]?.metas);
  assert.deepEqual(sinTope, [], `motores sin tope: ${sinTope.join(', ')}`);
});

test('ganar a los 3 s con 0 puntos y 3 estrellas no pasa en ningún motor', () => {
  for (const motor of Object.keys(TOPES))
    for (const etapa of [0, 2]) falla({ motor, puntos: 0, estrellas: 3, duracion: 3, etapa, etapas: 3, gano: true });
});

test('ganar con 0 puntos y 0 estrellas no pasa en ningún motor (salvo la carrera, que gana por tiempo)', () => {
  for (const motor of Object.keys(TOPES)) {
    if (motor === 'carrera') continue;
    falla({ motor, puntos: 0, estrellas: 0, duracion: 200, etapa: 0, etapas: 3, gano: true });
  }
  // la carrera sí: llegar en 100 s (más que el bronce) gana sin estrellas, pero no más rápido de lo que dicen los puntos
  pasa({ motor: 'carrera', puntos: 200, estrellas: 0, duracion: 101, etapa: 0, gano: true });
  falla({ motor: 'carrera', puntos: 200, estrellas: 0, duracion: 30, etapa: 0, gano: true }, 'no se puede');
});

test('ruta: las estrellas van por el tiempo que sobra y perder es agotar el reloj', () => {
  // etapa 0 de 3: límite 70 s; 3 estrellas dejan 55 % (≥ 385 pts) y no se cruza en menos de 15 s
  pasa({ motor: 'ruta', puntos: 520, estrellas: 3, duracion: 30, etapa: 0, etapas: 3, gano: true });
  falla({ motor: 'ruta', puntos: 300, estrellas: 3, duracion: 40, etapa: 0, etapas: 3, gano: true }, 'estrellas');
  falla({ motor: 'ruta', puntos: 700, estrellas: 3, duracion: 8, etapa: 0, etapas: 3, gano: true }, 'no se puede');
  pasa({ motor: 'ruta', puntos: 80, estrellas: 0, duracion: 72, etapa: 0, etapas: 3, gano: false });
  falla({ motor: 'ruta', puntos: 80, estrellas: 0, duracion: 30, etapa: 0, etapas: 3, gano: false }, 'no se puede');
  falla({ motor: 'ruta', puntos: 100, estrellas: 0, duracion: 40, etapa: 0, etapas: 3, gano: true }, 'sin estrellas');
});

test('ritmo, corte, monta y pesca: metas y duración reales', () => {
  // ritmo: la canción dura ≥ 58 s; las metas mínimas (14 000 de máximo) piden 2100 pts para ganar en la etapa 1
  assert.deepEqual(TOPES.ritmo.metas(0, {}), [2100, 4200, 6300]);
  pasa({ motor: 'ritmo', puntos: 9000, estrellas: 2, duracion: 66, etapa: 0, etapas: 3, gano: true });
  falla({ motor: 'ritmo', puntos: 9000, estrellas: 2, duracion: 40, etapa: 0, etapas: 3, gano: true }, 'no se puede');
  falla({ motor: 'ritmo', puntos: 1000, estrellas: 1, duracion: 66, etapa: 0, etapas: 3, gano: true }, 'estrellas');
  // corte: reloj 70–100 s y se gana con la primera meta (200 en la etapa 1)
  pasa({ motor: 'corte', puntos: 900, estrellas: 3, duracion: 72, etapa: 0, etapas: 3, gano: true });
  falla({ motor: 'corte', puntos: 150, estrellas: 0, duracion: 72, etapa: 0, etapas: 3, gano: true }, 'ganó con 150');
  falla({ motor: 'corte', puntos: 900, estrellas: 3, duracion: 30, etapa: 0, etapas: 3, gano: true }, 'no se puede');
  // monta: ganar es aguantar 60 s; derribado puede ser antes
  pasa({ motor: 'monta', puntos: 1500, estrellas: 2, duracion: 62, etapa: 0, etapas: 3, gano: true });
  falla({ motor: 'monta', puntos: 1500, estrellas: 2, duracion: 40, etapa: 0, etapas: 3, gano: true }, 'no se puede');
  pasa({ motor: 'monta', puntos: 300, estrellas: 0, duracion: 20, etapa: 0, etapas: 3, gano: false });
  // pesca: metas por los peces del tema; con peces caros las metas suben
  assert.deepEqual(TOPES.pesca.metas(0, {}), [105, 195, 245]);
  const caros = {
    peces: [
      ['Marlín', 200, '#000'],
      ['Atún', 100, '#000'],
    ],
  };
  assert.deepEqual(TOPES.pesca.metas(0, caros), [450, 825, 1050]);
  pasa({ motor: 'pesca', puntos: 200, estrellas: 2, duracion: 88, etapa: 0, etapas: 3, gano: true });
  falla(
    { motor: 'pesca', puntos: 200, estrellas: 2, duracion: 88, etapa: 0, etapas: 3, gano: true, tema: caros },
    'ganó con 200',
  );
  falla({ motor: 'pesca', puntos: 200, estrellas: 2, duracion: 20, etapa: 0, etapas: 3, gano: true }, 'no se puede');
});

test('jugadores finos de Vagón, Aserrín, Pan de coco y Lancetilla cobran', () => {
  pasa({ motor: 'atlantida.vagon', puntos: 1993, estrellas: 3, duracion: 97, etapa: 2, etapas: 3, gano: true });
  pasa({ motor: 'atlantida.vagon', puntos: 2400, estrellas: 3, duracion: 97, etapa: 2, etapas: 3, gano: true });
  pasa({ motor: 'comayagua.aserrin', puntos: 1900, estrellas: 3, duracion: 82, etapa: 0, etapas: 3, gano: true });
  pasa({ motor: 'atlantida.pancoco', puntos: 2500, estrellas: 3, duracion: 82, etapa: 0, etapas: 3, gano: true });
  pasa({ motor: 'atlantida.lancetilla', puntos: 2200, estrellas: 3, duracion: 82, etapa: 0, etapas: 3, gano: true });
  // el resto del kit sigue en 20 pts/s
  falla(
    { motor: 'atlantida.balsa', puntos: 1700, estrellas: 3, duracion: 82, etapa: 0, etapas: 3, gano: true },
    'no caben',
  );
});
