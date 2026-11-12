// Motor «Expansión del pan de coco»: poné bollos crudos en la bandeja dejando el espacio que van a crecer en el
// levado. Al hornear, los que se tocan salen pegados como una sola pieza; los que quedan sueltos suman.
import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label, Plate } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { cursor, Escena, moverCursor, texto } from './comun';

type Bollo = { x: number; z: number; r: number; g: number; grupo: number; fuera: boolean };
type Estado = {
  c: ReturnType<typeof cursor>;
  r: () => number;
  bandeja: Bollo[];
  cola: { r: number; g: number }[];
  levado: number;
  muestra: number;
  bot: number;
  tandas: number;
  piezas: number;
  pegados: number;
  fuera: number;
  puestos: number;
  divididos: number;
  salto: boolean;
  aviso: string;
};
type Param = { ancho: number; fondo: number; gMax: number; alquiler: boolean; nombre: string; semilla: number };
type Sesion = Motor<Param, Estado>;

const CX = -2.6;
const CZ = -1.2;
const LEVA = 1.8;
const MUESTRA = 1.3;
/** Tope de bollos en la bandeja: más ya no caben sueltos y cada uno cuesta llamadas de dibujo. */
const TOPE = 24;

function nuevoBollo(s: Estado, p: Param): { r: number; g: number } {
  if (p.alquiler && s.puestos % 4 === 3) return { r: 0.78, g: 2.4 };
  return { r: 0.42 + s.r() * 0.18, g: 1.35 + s.r() * (p.gMax - 1.35) };
}
const llenar = (s: Estado, p: Param) => {
  while (s.cola.length < 3) s.cola.push(nuevoBollo(s, p));
};
const enBandeja = (m: Sesion, c: ReturnType<typeof cursor>, r: number) => {
  const { ancho, fondo } = m.parametros;
  return {
    x: CX + c.x * (ancho / 2 - r),
    z: CZ - c.y * (fondo / 2 - r),
  };
};
function poner(m: Sesion) {
  const s = m.datos;
  if (s.levado > 0 || s.muestra > 0) return;
  if (s.bandeja.length >= TOPE) {
    s.aviso = 'La bandeja ya está llena: horneá.';
    return;
  }
  const b = s.cola.shift();
  if (!b) return;
  const { x, z } = enBandeja(m, s.c, b.r);
  s.bandeja.push({ x, z, r: b.r, g: b.g, grupo: -1, fuera: false });
  s.puestos++;
  llenar(s, m.parametros);
  s.aviso = 'Dejale espacio: en el levado crece.';
}
function dividir(m: Sesion) {
  const s = m.datos;
  const b = s.cola[0];
  if (!b || b.r < 0.36 || s.levado > 0 || s.muestra > 0) return;
  const r = b.r / Math.SQRT2;
  s.cola.splice(0, 1, { r, g: b.g }, { r, g: b.g });
  s.divididos++;
  s.aviso = 'Dividiste la masa en dos bollos.';
}
function hornear(m: Sesion) {
  const s = m.datos;
  if (!s.bandeja.length || s.levado > 0 || s.muestra > 0) return;
  s.levado = LEVA;
  s.aviso = 'Levando…';
}
function evaluar(m: Sesion) {
  const s = m.datos;
  const { ancho, fondo } = m.parametros;
  const B = s.bandeja;
  B.forEach((b, i) => {
    b.grupo = i;
    const R = b.r * b.g;
    b.fuera =
      b.x - R < CX - ancho / 2 - 0.08 ||
      b.x + R > CX + ancho / 2 + 0.08 ||
      b.z - R < CZ - fondo / 2 - 0.08 ||
      b.z + R > CZ + fondo / 2 + 0.08;
  });
  const raiz = (i: number): number => (B[i].grupo === i ? i : (B[i].grupo = raiz(B[i].grupo)));
  for (let i = 0; i < B.length; i++)
    for (let j = i + 1; j < B.length; j++)
      if (Math.hypot(B[i].x - B[j].x, B[i].z - B[j].z) < B[i].r * B[i].g + B[j].r * B[j].g) B[raiz(i)].grupo = raiz(j);
  B.forEach((_, i) => raiz(i));
  let buenas = 0,
    malas = 0,
    fuera = 0;
  for (const b of B) {
    const solo = B.filter((o) => o.grupo === b.grupo).length === 1;
    if (b.fuera) fuera++;
    else if (solo) buenas++;
    else malas++;
  }
  s.tandas++;
  s.piezas += buenas;
  s.pegados += malas;
  s.fuera += fuera;
  m.sumar(buenas * 20 + (buenas >= 6 && !malas && !fuera ? 30 : 0) - malas * 10 - fuera * 10);
  s.aviso = malas
    ? `${malas} bollos salieron pegados: el pan creció, la bandeja no.`
    : fuera
      ? 'Se salió de la bandeja.'
      : `¡${buenas} piezas sueltas!${buenas >= 6 ? ' Bandeja bien aprovechada.' : ''}`;
}

const motor = defineMotor({
  id: 'atlantida.pancoco',
  fondo: 'costa',
  guia: {
    goal: 'Poné los bollos dejando lo que van a crecer. Horneá cuando la bandeja esté llena: los que se tocan salen pegados.',
    keys: [
      ['WASD / mouse', 'mover en la bandeja'],
      ['F / clic / RT', 'poner bollo'],
      ['E / X', 'hornear'],
      ['Espacio / A', 'dividir la masa'],
    ],
    touch: [
      ['Palanca / arrastrá', 'mover en la bandeja'],
      ['🎯', 'poner bollo'],
      ['E', 'hornear'],
      ['Saltar', 'dividir la masa'],
    ],
  },
  etapa: (p) => ({
    ancho: 8.2 - p.dif * 1.4,
    fondo: 5.6 - p.dif * 0.8,
    gMax: 1.7 + p.dif * 0.5,
    alquiler: p.tema.alquiler === true,
    nombre: texto(p.tema.nombre, 'Expansión del pan de coco'),
    semilla: p.seed,
  }),
  metas: (p) => [200 + Math.round(p.dif * 100), 450 + Math.round(p.dif * 100), 700 + Math.round(p.dif * 100)],
  duracion: (p) => 80 + Math.round(p.dif * 15),
  crear: (p): Estado => {
    const s: Estado = {
      c: cursor(),
      r: rng(p.semilla),
      bandeja: [],
      cola: [],
      levado: 0,
      muestra: 0,
      bot: 0,
      tandas: 0,
      piezas: 0,
      pegados: 0,
      fuera: 0,
      puestos: 0,
      divididos: 0,
      salto: false,
      aviso: 'Cada bollo dice cuánto crece (×). Dejale espacio.',
    };
    llenar(s, p);
    return s;
  },
  actualizar: (m, dt) => {
    const s = m.datos;
    moverCursor(s.c, dt, 1.3);
    if (input.take('fire')) poner(m);
    if (input.take('use')) hornear(m);
    // el salto también se lee sostenido: el control del jugador a veces se come la pulsación suelta
    if (input.take('jump') || (input.jump && !s.salto)) dividir(m);
    s.salto = input.jump;
    if (s.levado > 0) {
      s.levado -= dt;
      if (s.levado <= 0) {
        s.levado = 0;
        evaluar(m);
        s.muestra = MUESTRA;
      }
    } else if (s.muestra > 0) {
      s.muestra -= dt;
      if (s.muestra <= 0) {
        s.muestra = 0;
        s.bandeja = [];
      }
    }
    const sig = s.cola[0];
    m.objetivo = s.aviso;
    m.lineas = [
      `Bollo: crece ×${sig.g.toFixed(1)}${sig.r > 0.7 ? ' (gigante: dividilo)' : ''} · En bandeja ${s.bandeja.length}/${TOPE}`,
      `Piezas sueltas ${s.piezas} · Pegados ${s.pegados} · F poner · E hornear · Espacio dividir`,
    ];
    m.stats = {
      tandas: s.tandas,
      piezas: s.piezas,
      pegados: s.pegados,
      fuera: s.fuera,
      puestos: s.puestos,
      divididos: s.divididos,
      enBandeja: s.bandeja.length,
      x: s.c.x,
    };
  },
  bot: (m, dt, actor) => {
    const s = m.datos;
    if (actor === 'compa') return;
    s.c.auto = true;
    s.bot -= dt;
    if (s.bot > 0 || s.levado > 0 || s.muestra > 0) return;
    s.bot = 0.3;
    const b = s.cola[0];
    // busca el lugar con más holgura para el tamaño final
    let mejor = { x: 0, y: 0, h: -9 };
    for (let i = 0; i <= 12; i++)
      for (let j = 0; j <= 8; j++) {
        const c = { ...s.c, x: (i / 12) * 2 - 1, y: (j / 8) * 2 - 1 };
        const { x, z } = enBandeja(m, c, b.r);
        const R = b.r * b.g;
        const { ancho, fondo } = m.parametros;
        let h = Math.min(
          CX + ancho / 2 - x - R,
          x - R - (CX - ancho / 2),
          CZ + fondo / 2 - z - R,
          z - R - (CZ - fondo / 2),
        );
        for (const o of s.bandeja) h = Math.min(h, Math.hypot(o.x - x, o.z - z) - R - o.r * o.g);
        if (h > mejor.h) mejor = { x: c.x, y: c.y, h };
      }
    if (mejor.h > 0.04 && s.bandeja.length < TOPE) {
      s.c.x = mejor.x;
      s.c.y = mejor.y;
      poner(m);
    } else if (b.r > 0.6) dividir(m);
    else hornear(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    const p = m.parametros;
    const sig = s.cola[0];
    const fantasma = enBandeja(m, s.c, sig.r);
    const k = s.levado > 0 ? 1 - s.levado / LEVA : s.muestra > 0 ? 1 : 0;
    return (
      <Escena nombre={p.nombre} aviso="F poner · E hornear · Espacio dividir">
        <Block
          pos={[CX, 0.45, CZ]}
          size={[p.ancho + 2.4, 0.9, p.fondo + 2.4]}
          color="#b9875a"
          mat="wood"
          solid={false}
        />
        <Block
          pos={[CX, 0.93, CZ]}
          size={[p.ancho + 0.3, 0.06, p.fondo + 0.3]}
          color="#7d7a75"
          mat="plastic"
          solid={false}
        />
        <Block
          pos={[CX, 0.96, CZ]}
          size={[p.ancho, 0.02, p.fondo]}
          color="#d6d2ca"
          mat="plastic"
          solid={false}
          cast={false}
        />
        {s.bandeja.map((b, i) => {
          const R = b.r * (1 + (b.g - 1) * k);
          const solo = s.bandeja.filter((o) => o.grupo === b.grupo).length === 1;
          const color = k > 0.5 ? '#d9a35b' : '#f3dcae';
          return (
            <group key={i}>
              {/* esfera de radio 1 escalada: el radio cambia en cada cuadro del levado */}
              <group position={[b.x, 1.09, b.z]} scale={[R, 0.45 * R, R]}>
                <Ball pos={[0, 0, 0]} r={1} color={color} mat="plastic" />
              </group>
              {s.muestra > 0 && (
                <Cyl
                  pos={[b.x, 0.99, b.z]}
                  r={R + 0.08}
                  h={0.02}
                  color={b.fuera ? '#f4a261' : solo ? '#57cc99' : '#ef476f'}
                  mat="neon"
                  solid={false}
                  cast={false}
                />
              )}
              {k === 0 && <Label pos={[b.x, 1.6, b.z]} text={`×${b.g.toFixed(1)}`} h={0.2} bg="#7f5539" />}
            </group>
          );
        })}
        {k === 0 && (
          <>
            <Cyl
              pos={[fantasma.x, 0.99, fantasma.z]}
              r={sig.r * sig.g}
              h={0.015}
              color="#ffd166"
              mat="glass"
              solid={false}
              cast={false}
            />
            <group position={[fantasma.x, 1.25, fantasma.z]} scale={[1, 0.45, 1]}>
              <Ball pos={[0, 0, 0]} r={sig.r} color="#fff1cf" mat="plastic" cast={false} />
            </group>
            <Label pos={[fantasma.x, 2, fantasma.z]} text={`crece ×${sig.g.toFixed(1)}`} h={0.24} bg="#bc6c25" />
          </>
        )}
        <Block pos={[3.9, 0.4, 1.5]} size={[1.6, 0.8, 3]} color="#9c6644" mat="wood" solid={false} />
        {s.cola.slice(1).map((b, i) => (
          <group key={i} position={[3.9, 0.82, 0.8 + i * 1.4]} scale={[1, 0.45, 1]}>
            <Ball pos={[0, 0.2, 0]} r={b.r} color="#f3dcae" mat="plastic" />
          </group>
        ))}
        <Label pos={[3.9, 1.7, 0.4]} text="Siguen" h={0.26} />
        {p.alquiler && (
          <group position={[2.6, 0, -4.4]}>
            <Plate pos={[0, 2.3, 0]} text="📜 Contrato de alquiler de bandeja" h={0.34} bg="#fefae0" fg="#5c3d2e" />
            <group position={[0, 1.3, 0]} scale={[1, 1 + Math.sin(m.tiempo * 2) * 0.07, 1]}>
              <Block pos={[0, 0, 0]} size={[1.6, 1.4, 0.04]} color="#fefae0" mat="cloth" solid={false} />
            </group>
            <Label pos={[0, 1.3, 0.1]} text="El bollo grande no invade" h={0.26} fg="#5c3d2e" bg="#fefae0" />
          </group>
        )}
        {s.levado > 0 && <Label pos={[CX, 3, CZ]} text="🔥 Levando y horneando…" h={0.36} bg="#bc6c25" />}
      </Escena>
    );
  },
});
export const PanCoco = motor.Escena;
export const guia = motor.guia;
