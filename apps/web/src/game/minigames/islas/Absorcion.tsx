import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label, P } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { cursor, Isla, Muelle, moverCursor, Sombrilla, texto } from './comun';

const NOMBRES = ['Arroz', 'Frijoles'];
const RAPIDEZ = [0.14, 0.095];
type Estado = {
  c: ReturnType<typeof cursor>;
  lado: number;
  nivel: [number, number];
  prog: [number, number];
  fin: [number, number];
  seco: [number, number];
  t: number;
  poros: number;
  sirve: number;
  echa: number;
  espera: number;
  ollas: number;
  juntas: number;
  pegadas: number;
  revueltas: number;
  rebalses: number;
  echadas: number;
  ayuda: boolean;
  aviso: string;
};
type Param = { poros: number; evapora: number; nombre: string };
type Sesion = Motor<Param, Estado>;

function nuevaOlla(s: Estado, p: Param) {
  s.nivel = [0.7, 0.7];
  s.prog = [0, 0];
  s.fin = [-1, -1];
  s.seco = [0, 0];
  s.t = 0;
  s.poros = p.poros;
  s.sirve = 0;
}
function echar(m: Sesion, lado: number) {
  const s = m.datos;
  if (s.espera > 0 || s.sirve) return;
  s.espera = 0.35;
  s.echa = 0.4;
  s.echadas++;
  s.nivel[lado] += 0.2;
  if (s.nivel[lado] > 1.25) {
    s.rebalses++;
    m.sumar(-5);
    s.nivel[lado] = 1;
    s.aviso = `Se rebalsó el ${NOMBRES[lado].toLowerCase()}. Poquito a poco.`;
  }
}
function revolver(m: Sesion) {
  const s = m.datos;
  if (s.sirve) return;
  s.revueltas++;
  m.sumar(-10);
  const prom = (s.nivel[0] + s.nivel[1]) / 2;
  s.nivel = [prom, prom];
  s.prog = [s.prog[0] * 0.5, s.prog[1] * 0.5];
  s.poros += 0.2;
  s.aviso = '¡Revolviste! Cambió la porosidad y se reinició el cálculo.';
}
const motor = defineMotor({
  id: 'islas.absorcion',
  fondo: 'mar',
  guia: {
    goal: 'Echá leche de coco en cada lado para que arroz y frijoles terminen juntos. No revolvás.',
    keys: [
      ['A / D', 'elegir arroz o frijoles'],
      ['Mouse / stick derecho', 'apuntar el lado'],
      ['F / clic / RT', 'echar líquido'],
      ['E / mando X', 'revolver (¡mejor no!)'],
    ],
    touch: [
      ['Palanca / arrastrá', 'elegir lado'],
      ['🎯', 'echar líquido'],
      ['E', 'revolver (¡mejor no!)'],
    ],
  },
  etapa: (p) => ({
    poros: 0.18 + p.dif * 0.17,
    evapora: 0.03 + p.dif * 0.03,
    nombre: texto(p.tema.nombre, 'Rice and beans sin revolver'),
  }),
  metas: (p) => [110 + Math.round(p.dif * 60), 220 + Math.round(p.dif * 60), 330 + Math.round(p.dif * 60)],
  duracion: (p) => 85 + Math.round(p.dif * 15),
  crear: (p): Estado => {
    const s = {
      c: cursor(),
      lado: 0,
      nivel: [0.5, 0.5],
      prog: [0, 0],
      fin: [-1, -1],
      seco: [0, 0],
      t: 0,
      poros: p.poros,
      sirve: 0,
      echa: 0,
      espera: 0,
      ollas: 0,
      juntas: 0,
      pegadas: 0,
      revueltas: 0,
      rebalses: 0,
      echadas: 0,
      ayuda: false,
      aviso: 'El arroz absorbe rápido y el frijol despacio: dale más al frijol.',
    } as Estado;
    nuevaOlla(s, p);
    return s;
  },
  actualizar: (m, dt) => {
    const s = m.datos;
    const p = m.parametros;
    moverCursor(s.c, dt, 1.8);
    s.lado = s.c.x > 0 ? 1 : 0;
    s.espera = Math.max(0, s.espera - dt);
    s.echa = Math.max(0, s.echa - dt);
    if (input.take('fire')) echar(m, s.lado);
    if (input.take('use')) revolver(m);
    if (s.sirve) {
      s.sirve += dt;
      if (s.sirve > 1.8) nuevaOlla(s, p);
    } else {
      s.t += dt;
      const flujo = s.poros * (s.nivel[0] - s.nivel[1]) * dt;
      s.nivel[0] -= flujo;
      s.nivel[1] += flujo;
      for (const i of [0, 1]) {
        if (s.fin[i] >= 0) continue;
        const moja = Math.min(1, s.nivel[i] / 0.55);
        const avance = RAPIDEZ[i] * moja * dt * (s.ayuda ? 1.04 : 1);
        s.prog[i] += avance;
        s.nivel[i] = Math.max(0, s.nivel[i] - avance * 0.85 - p.evapora * dt);
        s.seco[i] = s.nivel[i] < 0.04 ? s.seco[i] + dt : 0;
        if (s.prog[i] >= 1) {
          s.prog[i] = 1;
          s.fin[i] = s.t;
        }
        if (s.seco[i] > 2.5) {
          s.pegadas++;
          m.sumar(-15);
          s.aviso = `¡Se pegó el ${NOMBRES[i].toLowerCase()}! Olla nueva.`;
          s.sirve = 0.01;
          s.ollas++;
          break;
        }
      }
      if (!s.sirve && s.fin[0] >= 0 && s.fin[1] >= 0) {
        const dif = Math.abs(s.fin[0] - s.fin[1]);
        const pts = Math.max(10, Math.round(60 - dif * 12));
        s.ollas++;
        if (dif < 1.2) s.juntas++;
        m.sumar(pts);
        s.aviso =
          dif < 1.2
            ? '¡Terminaron juntos! Rice and beans al punto.'
            : `Uno esperó ${dif.toFixed(1)} s al otro. Ajustá antes.`;
        s.sirve = 0.01;
      }
    }
    s.ayuda = false;
    m.objetivo = s.aviso;
    m.lineas = [
      `Arroz ${Math.round(s.prog[0] * 100)}% · líquido ${Math.round(s.nivel[0] * 100)}%   |   Frijoles ${Math.round(s.prog[1] * 100)}% · líquido ${Math.round(s.nivel[1] * 100)}%`,
      `Ollas ${s.ollas} · juntas ${s.juntas} · pegadas ${s.pegadas}`,
    ];
    m.stats = {
      ollas: s.ollas,
      juntas: s.juntas,
      pegadas: s.pegadas,
      revueltas: s.revueltas,
      rebalses: s.rebalses,
      echadas: s.echadas,
    };
  },
  bot: (m, _dt, actor) => {
    const s = m.datos;
    if (actor === 'compa') {
      s.ayuda = true;
      return;
    }
    if (s.sirve || s.espera > 0) return;
    // el frijol siempre mojado; el arroz, con el líquido justo para terminar cuando termine el frijol
    let lado = -1;
    if (s.fin[1] < 0 && s.nivel[1] < 0.62) lado = 1;
    else if (s.fin[0] < 0) {
      const frijol = s.fin[1] < 0 ? (1 - s.prog[1]) / RAPIDEZ[1] : 0.1;
      const quiere = Math.min(1, (1 - s.prog[0]) / Math.max(0.1, frijol) / RAPIDEZ[0]) * 0.55;
      if (s.nivel[0] < quiere - 0.12) lado = 0;
    }
    if (lado < 0) return;
    s.c.x = lado ? 0.6 : -0.6;
    s.c.auto = true;
    s.lado = lado;
    echar(m, lado);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    const t = m.tiempo;
    const fondoOlla = 1.3;
    return (
      <Isla nombre={m.parametros.nombre} aviso="F echa leche de coco · E revuelve (¡no!)">
        <Muelle letrero="Cocina de Roatán" />
        <Sombrilla pos={[-8, 0, -4]} />
        <P.Palm pos={[-9, 0, 1]} scale={0.9} solid={false} />
        <Block pos={[-2, 0.45, -1]} size={[8.5, 0.9, 4.2]} color="#a7794a" mat="wood" solid={false} />
        {[-1, 1].map((l) => (
          <Ball key={l} pos={[-2 + l * 1.2, 1.05, 0.1]} r={0.28} color="#5b4636" mat="stone" />
        ))}
        <Ball pos={[-2, 1.05, -1.8]} r={0.28} color="#5b4636" mat="stone" />
        {[0, 1, 2].map((i) => (
          <Ball
            key={i}
            pos={[-2 + (i - 1) * 0.4, 1 + Math.abs(Math.sin(t * 7 + i)) * 0.15, -0.8]}
            r={0.18}
            color="#ff9f1c"
            mat="neon"
            cast={false}
          />
        ))}
        <Block pos={[-2, fondoOlla + 0.05, -0.85]} size={[4.4, 0.1, 2.4]} color="#2f3437" mat="metal" solid={false} />
        {[-1, 1].map((l) => (
          <Block
            key={`x${l}`}
            pos={[-2 + l * 2.14, fondoOlla + 0.55, -0.85]}
            size={[0.12, 1.1, 2.4]}
            color="#2f3437"
            mat="metal"
            solid={false}
          />
        ))}
        {[-1, 1].map((l) => (
          <Block
            key={`z${l}`}
            pos={[-2, fondoOlla + 0.55, -0.85 + l * 1.14]}
            size={[4.4, 1.1, 0.12]}
            color="#2f3437"
            mat="metal"
            solid={false}
          />
        ))}
        <Block
          pos={[-2, fondoOlla + 0.55, -0.85]}
          size={[0.1, 1.1, 2.2]}
          color="#c8b79a"
          mat="stone"
          solid={false}
          cast={false}
        />
        {[-1, 1].map((l) => (
          <Block
            key={`a${l}`}
            pos={[-2 + l * 2.4, fondoOlla + 0.8, -0.85]}
            size={[0.4, 0.1, 0.5]}
            color="#2f3437"
            mat="metal"
            solid={false}
            cast={false}
          />
        ))}
        {[0, 1].map((i) => {
          const x = -2 + (i ? 1.07 : -1.07);
          const alto = 0.15 + s.prog[i] * 0.55;
          const liquido = Math.min(1.05, s.nivel[i]) * 0.7;
          const sel = s.lado === i;
          return (
            <group key={i}>
              {sel && (
                <Block
                  pos={[x, fondoOlla + 1.13, -0.85 + 1.14]}
                  size={[1.9, 0.06, 0.14]}
                  color="#fff3b0"
                  mat="neon"
                  solid={false}
                  cast={false}
                />
              )}
              <Block
                pos={[x, fondoOlla + 0.1 + alto / 2, -0.85]}
                size={[1.96, alto, 2.1]}
                color={i ? '#8a2f22' : '#fbf6e6'}
                mat="cloth"
                solid={false}
                cast={false}
              />
              {i === 1 &&
                [0, 1, 2, 3, 4].map((k) => (
                  <Ball
                    key={k}
                    pos={[x - 0.7 + k * 0.35, fondoOlla + 0.12 + alto, -1.4 + (k % 2) * 0.9]}
                    r={0.1}
                    color="#5a1f1a"
                    cast={false}
                  />
                ))}
              {liquido > 0.02 && (
                <Block
                  pos={[x, fondoOlla + 0.1 + liquido / 2, -0.85]}
                  size={[1.98, liquido, 2.12]}
                  color="#f4efe1"
                  mat="water"
                  solid={false}
                  cast={false}
                />
              )}
              {s.prog[i] > 0.2 &&
                [0, 1].map((k) => (
                  <Ball
                    key={k}
                    pos={[x + (k - 0.5) * 0.6, fondoOlla + 1.4 + ((t * 0.7 + k * 0.5 + i * 0.3) % 1) * 1.2, -0.85]}
                    r={0.16}
                    color="#ffffff"
                    mat="glass"
                    cast={false}
                  />
                ))}
              <Label
                pos={[x, fondoOlla + 3.15, -0.85]}
                text={`${NOMBRES[i]} ${Math.round(s.prog[i] * 100)}%${s.fin[i] >= 0 ? ' ✓' : s.seco[i] > 0 ? ' ¡seco!' : ''}`}
                h={0.3}
                bg={s.fin[i] >= 0 ? '#2a9d8f' : s.seco[i] > 0 ? '#d1495b' : '#14627a'}
              />
            </group>
          );
        })}
        <group
          position={[-2 + (s.lado ? 1.07 : -1.07), fondoOlla + 2.3, 0.3]}
          rotation-z={s.echa > 0 ? (s.lado ? 0.7 : -0.7) : 0}
        >
          <Cyl pos={[0, 0, 0]} r={0.32} rTop={0.26} h={0.7} color="#d9cfc1" mat="plastic" solid={false} />
          <Cyl pos={[0, 0.36, 0]} r={0.27} h={0.04} color="#f4efe1" mat="plastic" solid={false} cast={false} />
          {s.echa > 0 && (
            <Cyl pos={[0, -0.7, 0]} r={0.05} h={0.9} color="#f4efe1" mat="water" solid={false} cast={false} />
          )}
        </group>
        <Label pos={[-2, fondoOlla + 3.75, 0.3]} text="Leche de coco" h={0.24} bg="#7a2e12" />
        {[0, 1, 2].map((i) => (
          <group key={i} position={[1.4 + i * 0.6, 1.05, 0.6 - (i % 2) * 0.5]}>
            <Ball pos={[0, 0, 0]} r={0.24} color="#6b4226" mat="wood" />
          </group>
        ))}
        <Cyl pos={[1.6, 1.1, -2]} r={0.5} h={0.12} color="#ffffff" mat="plastic" solid={false} />
      </Isla>
    );
  },
});
export const Absorcion = motor.Escena;
export const guia = motor.guia;
