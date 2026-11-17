import { input } from '../../../core/input';
import { Ball, Block, Label, Plate } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

/** Patio en metros de la mesa: se entra por abajo (z = +3.6) y se sale por la derecha sobre z = Z_SALIDA. */
const Z_SALIDA = -2.4,
  PARED = -5.4,
  PORTON = 3.6,
  ANCHO = 0.35;
type P2 = [number, number];
interface Carga {
  x: number;
  z: number;
  r: number;
}
type Estado = ReturnType<typeof cursor> & {
  azar: () => number;
  cargas: [Carga, Carga];
  /** cursor del bot (centro de la zona buena) */
  bueno: P2;
  /** maniobra en curso: 0..1 (−1 sin maniobra) y si salió bien */
  anima: number;
  exito: boolean;
  plan: { x0: number; r: number };
  salidas: number;
  encierros: number;
  espera: number;
  aviso: string;
};
interface Params {
  largo: number;
  ayuda: boolean;
  semilla: number;
}
type Sesion = Motor<Params, Estado>;
const planDe = (x: number, y: number) => ({ x0: -5 + ((x + 1) / 2) * 7, r: 0.6 + ((y + 1) / 2) * 3 });
const recorte = (r: number, largo: number) => Math.min(r - 0.05, (largo * largo) / (2 * r));
/** Qué choca con ese giro: nada, la cabina o la caja (que recorta la curva). */
function choque(c: [Carga, Carga], x0: number, r: number, largo: number): 'libre' | 'pared' | 'cabina' | 'caja' {
  const cx = x0 + r,
    cz = Z_SALIDA + r;
  if (x0 - ANCHO < PARED || cx > PORTON - 0.2) return 'pared';
  const off = recorte(r, largo);
  let caja = false;
  for (const k of c) {
    if (Math.abs(k.x - x0) < ANCHO + k.r && k.z > cz - k.r) return 'cabina';
    if (Math.abs(k.z - Z_SALIDA) < ANCHO + k.r && k.x > cx - k.r) return 'cabina';
    if (k.x - cx < k.r && k.z - cz < k.r) {
      const d = Math.hypot(k.x - cx, k.z - cz);
      if (d + k.r > r - ANCHO && d - k.r < r + ANCHO) return 'cabina';
      if (d + k.r > r - off - ANCHO && d - k.r < r + ANCHO) caja = true;
    }
  }
  return caja ? 'caja' : 'libre';
}
function nuevoPatio(s: Estado, q: Params) {
  for (let intento = 0; intento < 80; intento++) {
    s.cargas = [
      { x: -2.6 + s.azar() * 3, z: -1.7 + s.azar() * 1.4, r: 0.45 },
      { x: -1.2 + s.azar() * 3, z: 1.2 + s.azar() * 1.8, r: 0.5 },
    ];
    const buenos: P2[] = [];
    let trampa = false;
    for (let x = -1; x <= 1.001; x += 0.05)
      for (let y = -1; y <= 1.001; y += 0.05) {
        const p = planDe(x, y),
          r = choque(s.cargas, p.x0, p.r, q.largo);
        if (r === 'libre') buenos.push([x, y]);
        if (r === 'caja') trampa = true;
      }
    const centro = planDe(0, 0);
    if (buenos.length < 8 || !trampa || choque(s.cargas, centro.x0, centro.r, q.largo) === 'libre') continue;
    const mx = buenos.reduce((a, p) => a + p[0], 0) / buenos.length,
      my = buenos.reduce((a, p) => a + p[1], 0) / buenos.length;
    s.bueno = buenos.reduce((a, p) => (Math.hypot(p[0] - mx, p[1] - my) < Math.hypot(a[0] - mx, a[1] - my) ? p : a));
    return;
  }
  // patio de respaldo que siempre tiene salida
  s.cargas = [
    { x: -0.4, z: -1.2, r: 0.45 },
    { x: 1.4, z: 2.2, r: 0.5 },
  ];
  s.bueno = [-0.75, 0.2];
}
/** Punto del recorrido de la cabina a `u` metros del inicio. */
function puntoDe(x0: number, r: number, u: number): P2 {
  const cz = Z_SALIDA + r,
    recto = 3.6 - cz,
    arco = (r * Math.PI) / 2;
  if (u <= recto) return [x0, 3.6 - u];
  if (u <= recto + arco) {
    const a = (u - recto) / r;
    return [x0 + r - Math.cos(a) * r, cz - Math.sin(a) * r];
  }
  return [x0 + r + (u - recto - arco), Z_SALIDA];
}
const largoDe = (x0: number, r: number) => 3.6 - (Z_SALIDA + r) + (r * Math.PI) / 2 + (PORTON - x0 - r);
function maniobrar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 1.5;
  s.plan = planDe(s.x, s.y);
  const r = choque(s.cargas, s.plan.x0, s.plan.r, m.parametros.largo);
  s.anima = 0;
  s.exito = r === 'libre';
  if (s.exito) {
    s.salidas++;
    m.sumar(60);
    s.aviso = '¡Salida libre! La caja pasó por dentro sin tocar';
  } else {
    s.encierros++;
    m.sumar(-30);
    s.aviso =
      r === 'caja'
        ? 'La caja recortó la curva y quedó trabada en la carga'
        : r === 'pared'
          ? 'Te pegaste a la pared o te pasaste del portón'
          : 'La cabina se metió en una carga';
  }
}
const motor = defineMotor({
  id: 'colon.remolque',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'finca',
  guia: {
    goal: 'A/D mové el carril de entrada, W/S abrí o cerrá la curva y F para maniobrar. La caja recorta por dentro: dejá espacio.',
    ...controles,
  },
  etapa: (p) => ({ largo: 1.6 + p.dif * 0.6, ayuda: p.dif < 0.4, semilla: p.seed }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      azar: rng(p.semilla),
      cargas: [
        { x: 0, z: 0, r: 0.45 },
        { x: 0, z: 2, r: 0.5 },
      ],
      bueno: [0, 0],
      anima: -1,
      exito: false,
      plan: { x0: 0, r: 1 },
      salidas: 0,
      encierros: 0,
      espera: 0,
      aviso: '',
    };
    nuevoPatio(s, p);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (s.anima >= 0) {
      s.anima += dt / 1.4;
      if (s.anima >= 1) {
        s.anima = -1;
        if (s.exito) nuevoPatio(s, m.parametros);
      }
    }
    if (input.take('fire')) maniobrar(m);
    const p = planDe(s.x, s.y);
    m.objetivo = `Carril ${p.x0.toFixed(1)} m · curva de ${p.r.toFixed(1)} m`;
    m.lineas = [
      `Remolque de ${m.parametros.largo.toFixed(1)} m: recorta unos ${recorte(p.r, m.parametros.largo).toFixed(1)} m por dentro`,
      `Salidas ${s.salidas} · Encierros ${s.encierros}${s.aviso ? ` · ${s.aviso}` : ''}`,
    ];
    m.stats = { x: s.x, y: s.y, salidas: s.salidas, encierros: s.encierros };
  },
  bot(m) {
    const s = m.datos;
    if (s.anima >= 0) return;
    s.auto = true;
    [s.x, s.y] = s.bueno;
    maniobrar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      q = m.parametros,
      p = s.anima >= 0 ? s.plan : planDe(s.x, s.y),
      total = largoDe(p.x0, p.r),
      off = recorte(p.r, q.largo);
    const puntos = Array.from({ length: 14 }, (_, i) => puntoDe(p.x0, p.r, (i / 13) * total));
    const cz = Z_SALIDA + p.r;
    const caja = Array.from({ length: 6 }, (_, i): P2 => {
      const a = (i / 5) * (Math.PI / 2),
        rr = p.r - off;
      return [p.x0 + p.r - Math.cos(a) * rr, cz - Math.sin(a) * rr];
    });
    const u = s.anima >= 0 ? s.anima * total : 0;
    const cab = puntoDe(p.x0, p.r, u),
      atras = puntoDe(p.x0, p.r, Math.max(0, u - q.largo));
    return (
      <Mesa titulo={`${m.partida.juego?.name ?? 'El remolque corta camino'} · Patio del Aguán`}>
        <Block pos={[-1, 0.72, 0]} size={[9.2, 0.04, 7.4]} color="#b89a6a" mat="dirt" solid={false} />
        <Block pos={[PARED - 0.15, 1, 0]} size={[0.3, 0.6, 7.4]} color="#8a7f6c" mat="concrete" solid={false} />
        <Block pos={[-1, 1, -3.45]} size={[9.2, 0.6, 0.3]} color="#8a7f6c" mat="concrete" solid={false} />
        <Block pos={[PORTON + 0.2, 0.74, Z_SALIDA]} size={[0.4, 0.04, 1]} color="#7fe08a" mat="neon" solid={false} />
        <Label pos={[PORTON - 0.2, 1.6, Z_SALIDA]} text="Salida" h={0.34} />
        {s.cargas.map((k, i) => (
          <group key={i}>
            <Block
              pos={[k.x, 0.7 + k.r * 0.8, k.z]}
              size={[k.r * 1.6, k.r * 1.6, k.r * 1.6]}
              color={i ? '#c0392b' : '#e6b04a'}
              mat="wood"
              solid={false}
            />
            <Label pos={[k.x, 1.9, k.z]} text={i ? 'Naranjas' : 'Palma'} h={0.32} />
          </group>
        ))}
        {puntos.map((pt, i) => (
          <Ball key={i} pos={[pt[0], 0.82, pt[1]]} r={0.09} color="#f7dc80" mat="neon" />
        ))}
        {q.ayuda && caja.map((pt, i) => <Ball key={`c${i}`} pos={[pt[0], 0.82, pt[1]]} r={0.06} color="#e57373" />)}
        <Block pos={[cab[0], 1.05, cab[1]]} size={[0.7, 0.6, 0.7]} color="#2e7d32" mat="metal" solid={false} />
        <Block
          pos={[(cab[0] + atras[0]) / 2, 1.0, (cab[1] + atras[1]) / 2]}
          size={[0.6, 0.5, Math.max(0.6, Math.hypot(cab[0] - atras[0], cab[1] - atras[1]))]}
          rot={Math.atan2(cab[0] - atras[0], cab[1] - atras[1])}
          color="#9e9e9e"
          mat="metal"
          solid={false}
        />
        {s.anima >= 0 && (
          <Plate
            pos={[cab[0], 2.3, cab[1]]}
            text={s.exito ? '✅ ¡Pasó!' : '🚧 ¡Encerrado!'}
            h={0.26}
            bg={s.exito ? '#2e7d32' : '#8a3b12'}
          />
        )}
      </Mesa>
    );
  },
});
export const Remolque = motor.Escena;
export const guia = motor.guia;
