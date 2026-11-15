// Motor «Empalme de comparsas»: cada comparsa avanza por su calle tocando las frases que le deslizás (barras de 1 a 4
// compases). Tienen que cerrar la frase justo al llegar al cruce, todas juntas; un compás suelto obliga a detenerse.
import { audio } from '../../../core/audio';
import { input } from '../../../core/input';
import { Block, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { casilla, centro, cursor, Escena, Monito, moverCursor, texto } from './comun';

const XS = -8.4;
const XC = 2.6;
const CALLES = [-3.4, -1, 1.4];
const COLORES = ['#e63946', '#ffd166', '#19b5c8'];
const NOMBRES = ['Comparsa Roja', 'Comparsa Amarilla', 'Comparsa Celeste'];
type Calle = { barras: number[]; p: number; detenida: number };
type Estado = {
  c: ReturnType<typeof cursor>;
  r: () => number;
  calles: Calle[];
  d: number;
  pausa: number;
  bot: number;
  pulso: number;
  rondas: number;
  juntas: number;
  sueltos: number;
  detenidas: number;
  barras: number;
  quitadas: number;
  aviso: string;
};
type Param = { n: number; compas: number; dMin: number; dMax: number; nombre: string; semilla: number };
type Sesion = Motor<Param, Estado>;

const total = (c: Calle) => c.barras.reduce((a, b) => a + b, 0);
const calle = (s: Estado, n: number) => casilla(-s.c.y, n);
const largo = (s: Estado) => casilla(s.c.x, 4) + 1;

function ronda(s: Estado, m: Sesion) {
  const p = m.parametros;
  s.d = p.dMin + Math.floor(s.r() * (p.dMax - p.dMin + 1));
  s.calles = Array.from({ length: p.n }, () => ({ barras: [1 + Math.floor(s.r() * 3)], p: 0, detenida: 0 }));
  s.pausa = 0;
}
function deslizar(m: Sesion) {
  const s = m.datos;
  if (s.pausa > 0) return;
  const c = s.calles[calle(s, s.calles.length)];
  if (total(c) >= s.d + 2) return;
  c.barras.push(largo(s));
  s.barras++;
  const t = total(c);
  s.aviso =
    t === s.d
      ? '¡Esa calle cierra justo en el cruce!'
      : t > s.d
        ? 'Ojo: te pasaste, va a quedar un compás suelto.'
        : `Faltan ${s.d - t} compases en esa calle.`;
}
function quitar(m: Sesion) {
  const s = m.datos;
  if (s.pausa > 0) return;
  const c = s.calles[calle(s, s.calles.length)];
  // solo se quita una barra que todavía no empezó a sonar
  if (c.barras.length > 1 && total(c) - c.barras[c.barras.length - 1] >= c.p) {
    c.barras.pop();
    s.quitadas++;
    s.aviso = 'Quitaste la última barra.';
  }
}
function cerrar(m: Sesion) {
  const s = m.datos;
  s.rondas++;
  let exactas = 0;
  for (const c of s.calles) {
    if (total(c) === s.d) {
      exactas++;
      m.sumar(25);
    } else {
      s.sueltos++;
      m.sumar(-15);
    }
  }
  if (exactas === s.calles.length) {
    s.juntas++;
    m.sumar(25);
    s.aviso = '¡Cerraron juntas en el cruce!';
    audio.sfx('star');
  } else s.aviso = 'Un compás suelto: una comparsa se tuvo que detener.';
  s.pausa = 1.4;
}

const motor = defineMotor({
  id: 'atlantida.carnaval',
  modos: { duo: { tipo: 'apoyo' }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'ciudad',
  guia: {
    goal: 'Deslizá barras de compases a cada calle para que las comparsas cierren la frase justo en el cruce.',
    keys: [
      ['W / S · mouse', 'elegir calle'],
      ['A / D · mouse', 'largo de la barra (1 a 4 compases)'],
      ['F / clic / RT', 'deslizar la barra a la calle'],
      ['E / X', 'quitar la última barra'],
    ],
    touch: [
      ['Palanca / arrastrá', 'calle y largo'],
      ['🎯', 'deslizar barra'],
      ['E', 'quitar barra'],
    ],
  },
  etapa: (p) => ({
    n: p.dif >= 0.5 ? 3 : 2,
    compas: 0.78 - p.dif * 0.22,
    dMin: 7 + Math.round(p.dif * 2),
    dMax: 10 + Math.round(p.dif * 3),
    nombre: texto(p.tema.nombre, 'Empalme de comparsas'),
    semilla: p.seed,
  }),
  metas: (p) => [120 + Math.round(p.dif * 80), 280 + Math.round(p.dif * 80), 440 + Math.round(p.dif * 80)],
  duracion: (p) => 80 + Math.round(p.dif * 15),
  crear: (p): Estado => ({
    c: { ...cursor(), x: centro(1, 4), y: 0.5 },
    r: rng(p.semilla),
    calles: [],
    d: 8,
    pausa: 0,
    bot: 0,
    pulso: 0,
    rondas: 0,
    juntas: 0,
    sueltos: 0,
    detenidas: 0,
    barras: 0,
    quitadas: 0,
    aviso: 'Las comparsas tienen que llegar juntas al cruce, con la frase cerrada.',
  }),
  actualizar: (m, dt) => {
    const s = m.datos;
    const p = m.parametros;
    if (!s.calles.length) ronda(s, m);
    moverCursor(s.c, dt, 1.4);
    if (input.take('fire')) deslizar(m);
    if (input.take('use')) quitar(m);
    if (s.pausa > 0) {
      s.pausa -= dt;
      if (s.pausa <= 0) ronda(s, m);
    } else {
      const antes = Math.floor(s.pulso);
      s.pulso += dt / p.compas;
      if (Math.floor(s.pulso) !== antes) audio.drum(120, 0.08, 0.12);
      for (const c of s.calles) {
        const tope = Math.min(total(c), s.d);
        if (c.p < tope) c.p = Math.min(tope, c.p + dt / p.compas);
        else if (c.p < s.d) {
          // sin música: la comparsa se detiene y espera su barra
          c.detenida += dt;
          if (Math.floor(c.detenida / p.compas) !== Math.floor((c.detenida - dt) / p.compas)) {
            s.detenidas++;
            m.sumar(-3);
            s.aviso = 'Una comparsa se quedó sin música: deslizale una barra.';
          }
        }
      }
      if (s.calles.every((c) => c.p >= s.d)) cerrar(m);
    }
    const i = calle(s, s.calles.length);
    const c = s.calles[i];
    m.objetivo = s.aviso;
    m.lineas = [
      `Cruce a ${s.d} compases · ${NOMBRES[i]}: ${total(c)} de ${s.d}${total(c) > s.d ? ' (compás suelto)' : ''}`,
      `Barra de ${largo(s)} · Cerraron juntas ${s.juntas} · Sueltos ${s.sueltos}`,
    ];
    m.stats = {
      rondas: s.rondas,
      juntas: s.juntas,
      sueltos: s.sueltos,
      detenidas: s.detenidas,
      barras: s.barras,
      quitadas: s.quitadas,
      calle: i,
      largo: largo(s),
    };
  },
  bot: (m, dt, actor) => {
    const s = m.datos;
    if (actor === 'compa') {
      // el compa marca el pulso con la tarima: las comparsas sin música esperan sin perder tanto
      for (const c of s.calles) c.detenida = Math.max(0, c.detenida - dt * 0.3);
      return;
    }
    s.c.auto = true;
    s.bot -= dt;
    if (s.bot > 0 || s.pausa > 0 || !s.calles.length) return;
    s.bot = 0.35;
    const n = s.calles.length;
    const i = s.calles.findIndex((c) => total(c) < s.d);
    if (i < 0) return;
    s.c.y = -centro(i, n);
    s.c.x = centro(Math.min(4, s.d - total(s.calles[i])) - 1, 4);
    deslizar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    const p = m.parametros;
    const n = s.calles.length;
    const u = (XC - XS) / s.d;
    const sel = calle(s, n);
    const lg = largo(s);
    return (
      <Escena nombre={p.nombre} aviso="W/S calle · A/D largo · F deslizar · E quitar">
        {s.calles.map((c, i) => {
          const z = n === 2 ? [-2.4, 0.4][i] : CALLES[i];
          let x = XS;
          return (
            <group key={i}>
              <Block
                pos={[(XS + XC) / 2 + 0.8, 0.03, z]}
                size={[XC - XS + 3.4, 0.05, 1.7]}
                color={i === sel ? '#6c757d' : '#4a4e55'}
                mat="asphalt"
                solid={false}
                cast={false}
              />
              {c.barras.map((b, k) => {
                const x0 = x;
                x += b * u;
                const suelta = x > XC + 0.01;
                return (
                  <Block
                    key={k}
                    pos={[(x0 + x) / 2, 0.12, z + 0.55]}
                    size={[b * u - 0.08, 0.12, 0.36]}
                    color={suelta ? '#ef476f' : COLORES[i]}
                    mat="neon"
                    solid={false}
                    cast={false}
                  />
                );
              })}
              <group position={[XS + c.p * u, 0, z - 0.15]}>
                {[0, 1, 2].map((k) => (
                  <Monito
                    key={k}
                    pos={[
                      -k * 0.45,
                      0.05 + (c.detenida > 0 && c.p < s.d ? 0 : Math.abs(Math.sin(m.tiempo * 8 + k)) * 0.12),
                      (k % 2) * 0.3 - 0.15,
                    ]}
                    color={COLORES[i]}
                    rot={-Math.PI / 2}
                    s={0.85}
                    brazo={Math.sin(m.tiempo * 6 + k) * 0.8}
                  />
                ))}
              </group>
              <Label
                pos={[XS - 0.4, 0.9, z]}
                text={`${total(c)}/${s.d}`}
                h={0.32}
                bg={total(c) === s.d ? '#2d6a4f' : total(c) > s.d ? '#c1121f' : COLORES[i]}
                fg="#1d1d1f"
              />
              {i === sel && <Label pos={[XS - 0.4, 1.5, z]} text="➜" h={0.3} fg="#ffd166" bg="rgba(0,0,0,0)" />}
            </group>
          );
        })}
        {[-0.3, 0.3].map((d) => (
          <Block
            key={d}
            pos={[XC + d * 0.4, 0.07, -1]}
            size={[0.08, 0.04, 6.4]}
            color="#ffffff"
            mat="plastic"
            solid={false}
            cast={false}
          />
        ))}
        <Label pos={[XC, 1.5, -4.6]} text="Cruce" h={0.34} bg="#7b2cbf" />
        <group position={[-6.4, 0.2, 3]}>
          {[1, 2, 3, 4].map((b) => {
            // la paleta usa una escala fija: 1 compás = 0.55 m
            const x = [0, 0.95, 2.5, 4.6][b - 1];
            return (
              <group key={b}>
                <Block
                  pos={[x + b * 0.275, 0.1, 0]}
                  size={[b * 0.55 - 0.08, 0.16, 0.4]}
                  color={b === lg ? '#ffd166' : '#adb5bd'}
                  mat={b === lg ? 'neon' : 'plastic'}
                  solid={false}
                  cast={false}
                />
                {b === lg && <Label pos={[x + b * 0.275, 0.75, 0]} text={`Barra de ${lg}`} h={0.28} bg="#bc6c25" />}
              </group>
            );
          })}
        </group>
      </Escena>
    );
  },
});
export const Carnaval = motor.Escena;
export const guia = motor.guia;
