import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & {
  cortes: number;
  calidad: number;
  base: number;
  lado: number;
  fase: number;
  t: number;
  espera: number;
  listo: number;
  sanos: number;
  magullados: number;
  caidos: number;
  tajos: number;
  azar: () => number;
};
type Param = { cortes: number; margen: number; meneo: number; vel: number; seed: number };
type Sesion = Motor<Param, Estado>;
/** dónde cuelga el racimo ahorita (−1..1): el tallo se dobla con cada corte y se mece despacio */
const racimo = (s: Estado, p: Param, dt = 0) =>
  Math.max(-0.95, Math.min(0.95, s.base + Math.sin((s.t + dt) * p.vel + s.fase) * p.meneo * (0.6 + s.cortes * 0.25)));
function nuevo(s: Estado) {
  s.cortes = 0;
  s.calidad = 1;
  s.base = (s.azar() * 2 - 1) * 0.4;
  s.lado = s.azar() < 0.5 ? -1 : 1;
  s.fase = s.azar() * 6;
}
function cortar(m: Sesion) {
  const s = m.datos,
    p = m.parametros,
    toast = useGame.getState().toast;
  if (s.espera > 0 || s.listo > 0) return;
  s.espera = 0.55;
  s.tajos++;
  const recibe = Math.abs(s.x - racimo(s, p)) <= p.margen;
  s.cortes++;
  if (s.cortes < p.cortes) {
    if (!recibe) {
      s.calidad /= 2;
      toast('Cortaste sin la almohadilla debajo: el racimo se jaloneó.', '🍌');
    }
    // el tallo se dobla un poco más hacia su lado
    s.base = Math.max(-0.7, Math.min(0.7, s.base + s.lado * 0.18));
    return;
  }
  s.listo = 1.2;
  if (!recibe) {
    s.caidos++;
    m.sumar(-30);
    toast('El racimo cayó al suelo.', '💥');
  } else if (s.calidad >= 1) {
    s.sanos++;
    m.sumar(80);
    toast('¡Racimo bien recibido, sin magulladuras!', '🍌');
  } else {
    s.magullados++;
    // muy jaloneado ya no se vende
    m.sumar(s.calidad >= 0.5 ? Math.round(60 * s.calidad) : 0);
    toast(s.calidad >= 0.5 ? 'Recibido, pero magullado.' : 'Tan magullado que ya no se vende.', '🍌');
  }
}
const motor = defineMotor({
  id: 'yoro.almohadilla',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'finca',
  guia: {
    goal: 'El tallo se dobla despacio con cada corte. Con A/D poné la almohadilla debajo del racimo y F corta. Cortar sin recibirlo le baja la calidad; al último corte, el racimo cae donde esté.',
    ...controles(),
  },
  etapa: (p) => ({
    cortes: 3 + Math.round(p.dif),
    margen: 0.2 - p.dif * 0.06,
    meneo: 0.25 + p.dif * 0.2,
    vel: 1.1 + p.dif * 0.7,
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      cortes: 0,
      calidad: 1,
      base: 0,
      lado: 1,
      fase: 0,
      t: 0,
      espera: 0,
      listo: 0,
      sanos: 0,
      magullados: 0,
      caidos: 0,
      tajos: 0,
      azar: rng(p.seed),
    };
    nuevo(s);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos,
      p = m.parametros;
    s.t += dt;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (s.listo > 0) {
      s.listo -= dt;
      if (s.listo <= 0) nuevo(s);
    }
    if (input.take('fire')) cortar(m);
    const debajo = Math.abs(s.x - racimo(s, p)) <= p.margen;
    m.objetivo = s.listo > 0 ? 'Siguiente mata…' : `Corte ${s.cortes + 1} de ${p.cortes}`;
    m.lineas = [
      `${debajo ? '✅ Almohadilla debajo' : '↔️ Mové la almohadilla'} · Calidad ${Math.round(s.calidad * 100)} %`,
      `Sanos ${s.sanos} · Magullados ${s.magullados} · Al suelo ${s.caidos}`,
    ];
    m.stats = { x: s.x, sanos: s.sanos, magullados: s.magullados, caidos: s.caidos, tajos: s.tajos };
  },
  bot(m) {
    const s = m.datos,
      p = m.parametros;
    if (s.listo > 0) return;
    s.auto = true;
    // sigue al racimo con un poco de adelanto y corta cuando ya está debajo
    s.x = racimo(s, p, 0.1);
    if (s.espera <= 0 && Math.abs(s.x - racimo(s, p)) <= p.margen * 0.6) cortar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      p = m.parametros,
      r = racimo(s, p),
      X = (v: number) => -1 + v * 3.6,
      caer = s.listo > 0 ? Math.min(1, (1.2 - s.listo) * 3) : 0;
    return (
      <Mesa titulo="Corte acompañado · racimo sin golpes">
        {/* mata de banano: el tallo se dobla hacia donde cuelga el racimo */}
        <Cyl pos={[-1, 1.9, -1.6]} r={0.28} h={2.4} color="#6a994e" mat="leaf" solid={false} />
        {[-1, 1].map((l) => (
          <Block
            key={l}
            pos={[-1 + l * 0.9, 3.2, -1.6]}
            size={[1.8, 0.05, 0.5]}
            rot={l * 0.4}
            color="#80b918"
            mat="leaf"
            solid={false}
          />
        ))}
        <Block
          pos={[(X(r) - 1) / 2, 2.9 - s.cortes * 0.12, -1.3]}
          size={[Math.abs(X(r) + 1) + 0.15, 0.08, 0.08]}
          color="#4f772d"
          mat="leaf"
          solid={false}
        />
        <group position={[X(r), 2.3 - s.cortes * 0.15 - caer * 1.1, -1.1]}>
          {[0, 1, 2].map((j) => (
            <Ball key={j} pos={[0, -j * 0.22, 0]} r={0.3 - j * 0.05} color={s.calidad < 1 ? '#c9b458' : '#a7c957'} />
          ))}
        </group>
        {/* almohadilla en su carrito */}
        <Block pos={[X(s.x), 0.95, -1.1]} size={[0.9, 0.18, 0.7]} color="#e9c46a" mat="cloth" solid={false} />
        <Block pos={[X(s.x), 0.8, -1.1]} size={[1, 0.12, 0.8]} color="#6b4a2a" mat="wood" solid={false} />
        <Block pos={[-1, 0.73, -1.1]} size={[7.4, 0.02, 0.1]} color="#ced4da" solid={false} />
        {Array.from({ length: p.cortes }, (_, j) => (
          <Ball key={j} pos={[-2.5 + j * 0.5, 1.2, 2.2]} r={0.12} color={j < s.cortes ? '#e63946' : '#dee2e6'} />
        ))}
        <Label pos={[-1, 1.7, 2.2]} text="Cortes" h={0.24} />
        <Label
          pos={[-1, 3.7, -2.4]}
          text={`🍌 Calidad ${Math.round(s.calidad * 100)} % · ${Math.abs(s.x - r) <= p.margen ? 'recibiendo' : 'mové la almohadilla'}`}
          h={0.34}
        />
      </Mesa>
    );
  },
});
export const Almohadilla = motor.Escena;
export const guia = motor.guia;
