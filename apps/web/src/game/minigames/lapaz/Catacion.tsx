import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label, Plate } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { Objeto } from '../kit/objetos';
import { casilla, centro, controles, cursor, duracion, Mesa, metas, mover, Puntero } from './comun';

const AROMAS = ['Chocolate', 'Caramelo', 'Cítrico', 'Floral', 'Nuez', 'Panela', 'Frutos rojos', 'Miel', 'Durazno'];
interface Taza {
  aromas: [number, number];
  /** columna donde está ahora (en «huele a recreo» las tazas cambian de lugar) */
  col: number;
  olida: boolean;
}
type Estado = ReturnType<typeof cursor> & {
  azar: () => number;
  tazas: Taza[];
  distinta: number;
  /** 0: oler y señalar · 1: justificar con descriptores */
  fase: 0 | 1;
  opciones: number[];
  marcadas: number[];
  revuelto: boolean;
  espera: number;
  rondas: number;
  apuestas: number;
  olfateos: number;
  fallos: number;
};
type Sesion = Motor<{ opciones: number; recreo: boolean; semilla: number }, Estado>;

function nuevaRonda(s: Estado, nOpciones: number) {
  const orden = AROMAS.map((_, i) => i).sort(() => s.azar() - 0.5);
  const par: [number, number] = [orden[0], orden[1]],
    otro: [number, number] = [orden[2], orden[3]];
  s.distinta = Math.floor(s.azar() * 3);
  s.tazas = [0, 1, 2].map((i) => ({ aromas: i === s.distinta ? otro : par, col: i, olida: false }));
  s.fase = 0;
  s.revuelto = false;
  s.marcadas = [];
  // los descriptores para justificar: los dos de la distinta, uno del par y relleno
  s.opciones = [otro[0], otro[1], par[0], ...orden.slice(4, 4 + nOpciones - 3)].sort(() => s.azar() - 0.5);
}
const tazaEn = (s: Estado, col: number) => s.tazas.findIndex((t) => t.col === col);
function oler(m: Sesion) {
  const s = m.datos;
  if (s.fase !== 0 || s.espera > 0) return;
  const t = s.tazas[tazaEn(s, casilla(s.x, 3))];
  if (t.olida) return;
  s.espera = 0.5;
  t.olida = true;
  s.olfateos++;
  // con la ronda «del recreo», al oler dos tazas alguien las cambia de lugar: seguilas con la vista
  if (m.parametros.recreo && !s.revuelto && s.tazas.filter((x) => x.olida).length === 2) {
    s.revuelto = true;
    const cols = [0, 1, 2].sort(() => s.azar() - 0.5);
    s.tazas.forEach((x, i) => {
      x.col = cols[i];
    });
  }
}
function confirmar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.6;
  if (s.fase === 0) {
    const i = tazaEn(s, casilla(s.x, 3));
    if (s.tazas.filter((t) => t.olida).length < 2 || !s.tazas[i].olida) {
      // apostar sin contraste consume el lote
      s.apuestas++;
      m.sumar(-40);
      useGame.getState().toast('Sin contraste no hay catación: se fue el lote.', '👃');
      nuevaRonda(s, m.parametros.opciones);
      return;
    }
    if (i !== s.distinta) {
      s.fallos++;
      m.sumar(-40);
      nuevaRonda(s, m.parametros.opciones);
      return;
    }
    m.sumar(25);
    s.fase = 1;
    return;
  }
  const k = casilla(s.x, s.opciones.length),
    d = s.opciones[k];
  if (s.marcadas.includes(d)) return;
  s.marcadas.push(d);
  if (s.tazas[s.distinta].aromas.includes(d)) {
    m.sumar(25);
    if (s.tazas[s.distinta].aromas.every((a) => s.marcadas.includes(a))) {
      s.rondas++;
      m.sumar(20);
      nuevaRonda(s, m.parametros.opciones);
    }
  } else {
    s.fallos++;
    m.sumar(-30);
  }
}
const motor = defineMotor({
  id: 'lapaz.catacion',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'finca',
  guia: {
    goal: 'A/D elegí una taza y olela con E. Con dos olidas señalá la distinta con F y justificala con sus dos aromas.',
    ...controles('oler la taza'),
  },
  etapa: (p) => ({
    opciones: p.dif < 0.5 ? 4 : 5,
    recreo: p.tema.variante === 'esa-taza-huele-a-recreo',
    semilla: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      azar: rng(p.semilla),
      tazas: [],
      distinta: 0,
      fase: 0,
      opciones: [],
      marcadas: [],
      revuelto: false,
      espera: 0,
      rondas: 0,
      apuestas: 0,
      olfateos: 0,
      fallos: 0,
    };
    nuevaRonda(s, p.opciones);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('use')) oler(m);
    if (input.take('fire')) confirmar(m);
    const olidas = s.tazas.filter((t) => t.olida).length;
    m.objetivo =
      s.fase === 0
        ? olidas < 2
          ? `Olé al menos dos tazas (${olidas}/2) antes de señalar`
          : 'Señalá la taza distinta con F'
        : 'Justificá: marcá los dos aromas de la distinta';
    m.lineas = [
      s.revuelto ? '¡Cambiaron las tazas de lugar! Los aromas van con su taza.' : 'Las tazas no tienen etiqueta',
      `Rondas ${s.rondas} · Apuestas sin contraste ${s.apuestas} · Fallos ${s.fallos}`,
    ];
    m.stats = { x: s.x, y: s.y, rondas: s.rondas, apuestas: s.apuestas, olfateos: s.olfateos, fallos: s.fallos };
  },
  bot(m) {
    const s = m.datos;
    s.auto = true;
    if (s.fase === 0) {
      const objetivo = s.tazas[s.distinta],
        otra = s.tazas[(s.distinta + 1) % 3];
      const falta = !objetivo.olida ? objetivo : !otra.olida ? otra : null;
      s.x = centro((falta ?? objetivo).col, 3);
      if (falta) oler(m);
      else confirmar(m);
      return;
    }
    const k = s.opciones.findIndex((d) => s.tazas[s.distinta].aromas.includes(d) && !s.marcadas.includes(d));
    if (k < 0) return;
    s.x = centro(k, s.opciones.length);
    confirmar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      col = casilla(s.x, 3);
    return (
      <Mesa titulo={`${m.partida.juego?.name ?? 'Triángulo de catación'} · Ronda ciega`}>
        {s.tazas.map((t, i) => {
          const x = -1 + centro(t.col, 3) * 4.4;
          return (
            <group key={i} position={[x, 0.7, -0.6]}>
              <Objeto k="taza" scale={[11.7, 7, 11.7]} c="#f4efe6" c2="#cfc6b4" />
              <Cyl pos={[0, 0.66, 0]} r={0.58} h={0.04} color="#4a2a17" solid={false} />
              {t.olida && <Plate pos={[0, 1.7, 0]} text={t.aromas.map((a) => AROMAS[a]).join(' · ')} h={0.26} />}
              {s.fase === 1 && i === s.distinta && <Label pos={[0, 2.4, 0]} text="✔ La distinta" h={0.3} />}
              {s.fase === 0 && t.col === col && <Ball pos={[0, 1.15, 0]} r={0.12} color="#d8c7a5" mat="glass" />}
            </group>
          );
        })}
        {s.fase === 1 &&
          s.opciones.map((d, k) => {
            const x = -1 + centro(k, s.opciones.length) * 4.4,
              hecha = s.marcadas.includes(d),
              bien = s.tazas[s.distinta].aromas.includes(d);
            return (
              <group key={k} position={[x, 0.8, 2.2]}>
                <Block
                  pos={[0, 0, 0]}
                  size={[1.4, 0.1, 0.8]}
                  color={
                    hecha
                      ? bien
                        ? '#6a9a4f'
                        : '#a8473b'
                      : k === casilla(s.x, s.opciones.length)
                        ? '#e8c77a'
                        : '#c9b48a'
                  }
                  mat="wood"
                  solid={false}
                />
                <Label pos={[0, 0.5, 0]} text={AROMAS[d]} h={0.24} />
              </group>
            );
          })}
        {m.parametros.recreo && (
          // la campanita del recreo: suena cuando las tazas se revuelven
          <group position={[-5.2, 0.7, -2.6]} rotation={[0, 0, s.revuelto ? Math.sin(m.tiempo * 12) * 0.4 : 0]}>
            <Cyl pos={[0, 0.5, 0]} r={0.05} h={1} color="#8a6a45" mat="wood" solid={false} />
            <Cyl pos={[0, 1.15, 0]} r={0.12} rTop={0.3} h={0.4} color="#e0b84a" mat="gold" solid={false} />
          </group>
        )}
        <Puntero x={s.fase === 0 ? centro(col, 3) : s.x} y={s.fase === 0 ? 0.2 : -0.7} />
      </Mesa>
    );
  },
});
export const Catacion = motor.Escena;
export const guia = motor.guia;
