import { input } from '../../../core/input';
import { Block, Label, Plate } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover, Puntero, wx, wz } from './comun';

const TALLO = -0.2,
  MANOS = 6,
  ALCANCE = 0.12;
const yMano = (k: number) => 0.75 - k * 0.3;
interface Mano {
  dedos: number;
  lado: -1 | 1;
  /** sigue en el racimo */
  viva: boolean;
}
type Estado = ReturnType<typeof cursor> & {
  azar: () => number;
  manos: Mano[];
  pedidos: number[];
  /** hasta qué nudo del tallo sigue entero (las de abajo se cayeron) */
  corte: number;
  cumplidos: number;
  malos: number;
  caidas: number;
  racimos: number;
  espera: number;
  aviso: string;
};
type Sesion = Motor<{ semilla: number }, Estado>;
type Blanco = { tipo: 'mano'; k: number } | { tipo: 'nudo'; k: number } | null;
const corona = (s: Estado, k: number): [number, number] => [TALLO + s.manos[k].lado * 0.18, yMano(k)];
const nudo = (k: number): [number, number] => [TALLO, yMano(k) - 0.15];

function nuevoRacimo(s: Estado) {
  s.manos = Array.from({ length: MANOS }, (_, k) => ({
    dedos: 4 + Math.floor(s.azar() * 5),
    lado: k % 2 ? 1 : -1,
    viva: true,
  }));
  const elegidas = [0, 1, 2, 3, 4, 5].sort(() => s.azar() - 0.5).slice(0, 4);
  s.pedidos = elegidas.map((k) => s.manos[k].dedos);
  s.corte = MANOS;
}
/** Quita los pedidos que ya no se pueden cumplir con las manos que quedan. */
function depurar(s: Estado) {
  const quedan = s.manos.filter((m) => m.viva).map((m) => m.dedos);
  s.pedidos = s.pedidos.filter((n) => {
    const i = quedan.indexOf(n);
    if (i < 0) return false;
    quedan.splice(i, 1);
    return true;
  });
  if (!s.pedidos.length) {
    s.racimos++;
    nuevoRacimo(s);
  }
}
function apuntado(s: Estado): Blanco {
  let mejor: Blanco = null,
    d = ALCANCE;
  s.manos.forEach((m, k) => {
    if (!m.viva) return;
    const [cx, cy] = corona(s, k),
      e = Math.hypot(s.x - cx, s.y - cy);
    if (e < d) {
      d = e;
      mejor = { tipo: 'mano', k };
    }
  });
  for (let k = 0; k < s.corte - 1; k++) {
    const [nx, ny] = nudo(k),
      e = Math.hypot(s.x - nx, s.y - ny);
    if (e < d) {
      d = e;
      mejor = { tipo: 'nudo', k };
    }
  }
  return mejor;
}
function cortar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 1.2;
  const b = apuntado(s);
  if (!b) {
    s.malos++;
    m.sumar(-10);
    s.aviso = 'Cortaste al aire y lastimaste un dedo';
    return;
  }
  if (b.tipo === 'nudo') {
    // cortar el tallo bota las manos de abajo: se golpean y ya no completan pedidos
    s.caidas++;
    s.malos++;
    m.sumar(-40);
    s.corte = b.k + 1;
    s.manos.forEach((mano, k) => {
      if (k > b.k) mano.viva = false;
    });
    s.aviso = 'Cortaste el tallo: las manos de abajo se cayeron golpeadas';
    depurar(s);
    return;
  }
  const mano = s.manos[b.k];
  mano.viva = false;
  if (mano.dedos === s.pedidos[0]) {
    s.cumplidos++;
    m.sumar(50);
    s.pedidos.shift();
    s.aviso = `¡Mano de ${mano.dedos} entregada completa!`;
  } else {
    s.malos++;
    m.sumar(-15);
    s.aviso = `Esa mano tenía ${mano.dedos}; el pedido es de ${s.pedidos[0]}`;
  }
  depurar(s);
}
const motor = defineMotor({
  id: 'colon.racimos',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'mercado',
  guia: {
    goal: 'Contá los dedos de cada mano, apuntá a la unión de la que pide el cliente y F. No cortés el tallo: botás las de abajo.',
    ...controles,
  },
  etapa: (p) => ({ semilla: p.seed }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      azar: rng(p.semilla),
      manos: [],
      pedidos: [],
      corte: MANOS,
      cumplidos: 0,
      malos: 0,
      caidas: 0,
      racimos: 0,
      espera: 0,
      aviso: '',
    };
    nuevoRacimo(s);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('fire')) cortar(m);
    const b = apuntado(s);
    m.objetivo = `Pedido: una mano de ${s.pedidos[0]} dedos · ${b ? (b.tipo === 'mano' ? 'apuntás a una unión' : '⚠️ apuntás al tallo') : 'apuntá a una unión'}`;
    m.lineas = [
      `Pedidos que siguen: ${s.pedidos.join(', ')}`,
      `Entregadas ${s.cumplidos} · Errores ${s.malos}${s.aviso ? ` · ${s.aviso}` : ''}`,
    ];
    m.stats = { x: s.x, y: s.y, cumplidos: s.cumplidos, malos: s.malos, caidas: s.caidas };
  },
  bot(m) {
    const s = m.datos,
      k = s.manos.findIndex((mano) => mano.viva && mano.dedos === s.pedidos[0]);
    if (k < 0) return;
    s.auto = true;
    [s.x, s.y] = corona(s, k);
    cortar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      b = apuntado(s);
    const z1 = wz(yMano(0) + 0.1),
      z2 = wz(yMano(s.corte - 1) - 0.1);
    return (
      <Mesa titulo={`${m.partida.juego?.name ?? 'Por mano, no por dedo'} · Pedidos por mano completa`}>
        <Block
          pos={[wx(TALLO), 0.95, (z1 + z2) / 2]}
          size={[0.22, 0.22, Math.abs(z2 - z1)]}
          color="#6b8e23"
          mat="wood"
          solid={false}
        />
        {s.manos.map((mano, k) => {
          if (!mano.viva) return null;
          const [cx, cy] = corona(s, k),
            x = wx(cx),
            z = wz(cy),
            sel = b?.tipo === 'mano' && b.k === k;
          return (
            <group key={k}>
              <Block
                pos={[x, 1, z]}
                size={[0.3, 0.3, 0.3]}
                color={sel ? '#f7dc80' : '#8d6e4a'}
                mat="wood"
                solid={false}
              />
              {Array.from({ length: mano.dedos }, (_, d) => {
                const a = (d / Math.max(1, mano.dedos - 1) - 0.5) * 1.3,
                  dx = mano.lado * Math.cos(a),
                  dz = Math.sin(a);
                return (
                  <Block
                    key={d}
                    pos={[x + dx * 0.55, 1.05, z + dz * 0.55]}
                    size={[0.75, 0.14, 0.14]}
                    rot={Math.atan2(-dz, dx)}
                    color="#f4d03f"
                    solid={false}
                  />
                );
              })}
            </group>
          );
        })}
        {Array.from({ length: Math.max(0, s.corte - 1) }, (_, k) => {
          const [nx, ny] = nudo(k),
            sel = b?.tipo === 'nudo' && b.k === k;
          return (
            <Block
              key={`n${k}`}
              pos={[wx(nx), 1.05, wz(ny)]}
              size={[0.32, 0.12, 0.12]}
              color={sel ? '#e74c3c' : '#4e6b1f'}
              solid={false}
            />
          );
        })}
        <group position={[wx(0.75), 0.7, wz(0.2)]}>
          <Block pos={[0, 0.9, 0]} size={[2.4, 1.8, 0.1]} color="#f5ecd7" mat="wood" solid={false} />
          <Label pos={[0, 2.2, 0]} text="🧾 Pedidos" h={0.36} />
          {s.pedidos.slice(0, 4).map((n, i) => (
            <Plate
              key={i}
              pos={[0, 1.55 - i * 0.4, 0.1]}
              text={`${i ? '' : '👉 '}Mano de ${n}`}
              h={0.3}
              bg={i ? '#6d6f73' : '#2e7d32'}
            />
          ))}
        </group>
        <Puntero x={s.x} y={s.y} />
      </Mesa>
    );
  },
});
export const Racimos = motor.Escena;
export const guia = motor.guia;
