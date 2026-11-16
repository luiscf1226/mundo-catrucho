import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & {
  superficie: number;
  fruta: 'jocote' | 'mango';
  fase: 'dosis' | 'agitar';
  cobertura: number;
  fondo: number;
  rapidez: number;
  antes: [number, number];
  giro: number;
  espera: number;
  bolsas: number;
  saladas: number;
  cerros: number;
  azar: () => number;
};
type Sesion = Motor<{ margen: number; tope: number; seed: number }, Estado>;
const dosis = (y: number) => (y + 1) / 2;
function bolsa(s: Estado) {
  s.fruta = s.azar() > 0.5 ? 'jocote' : 'mango';
  s.superficie = 0.25 + s.azar() * 0.6;
  s.fase = 'dosis';
  s.cobertura = 0;
  s.fondo = 0;
}
function echar(m: Sesion) {
  const s = m.datos;
  if (s.fase !== 'dosis' || s.espera > 0) return;
  s.espera = 0.6;
  const error = dosis(s.y) - s.superficie;
  if (Math.abs(error) > m.parametros.margen) {
    s.saladas++;
    m.sumar(-20);
    useGame.getState().toast(error > 0 ? 'Mucha sal para tan poca fruta.' : 'Muy poca sal: va simple.', '🧂');
    return;
  }
  s.fase = 'agitar';
}
const motor = defineMotor({
  id: 'valle.saljocote',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'mercado',
  guia: {
    goal: 'Con W/S medí la sal según la superficie de la fruta y echala con F. Después agitá la bolsa con movimientos medidos: si vas muy rápido la sal hace cerro en el fondo.',
    ...controles(),
  },
  etapa: (p) => ({ margen: 0.1 - p.dif * 0.04, tope: 2.8 - p.dif * 0.5, seed: p.seed }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      superficie: 0.5,
      fruta: 'jocote',
      fase: 'dosis',
      cobertura: 0,
      fondo: 0,
      rapidez: 0,
      antes: [0, 0],
      giro: 0,
      espera: 0,
      bolsas: 0,
      saladas: 0,
      cerros: 0,
      azar: rng(p.seed),
    };
    bolsa(s);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    const paso = Math.hypot(s.x - s.antes[0], s.y - s.antes[1]) / Math.max(dt, 0.001);
    s.antes = [s.x, s.y];
    s.rapidez += (Math.min(6, paso) - s.rapidez) * Math.min(1, dt * 5);
    if (input.take('fire')) echar(m);
    if (s.fase === 'agitar') {
      if (s.rapidez > m.parametros.tope) {
        s.fondo += dt * 0.6;
        s.cobertura = Math.max(0, s.cobertura - dt * 0.1);
      } else if (s.rapidez > 0.7) s.cobertura += dt * 0.2;
      if (s.fondo >= 1) {
        s.cerros++;
        m.sumar(-40);
        useGame.getState().toast('La sal hizo cerro en el fondo de la bolsa.', '🧂');
        bolsa(s);
      } else if (s.cobertura >= 1) {
        s.bolsas++;
        m.sumar(Math.round(100 - s.fondo * 50));
        useGame.getState().toast(`¡${s.fruta === 'jocote' ? 'Jocotes' : 'Mango'} con sal pareja!`, '🥭');
        bolsa(s);
      }
    }
    m.objetivo =
      s.fase === 'dosis'
        ? `Superficie ${Math.round(s.superficie * 100)} · Sal ${Math.round(dosis(s.y) * 100)} · F echá`
        : 'Agitá con calma hasta cubrir parejo';
    m.lineas = [
      `Cobertura ${Math.round(s.cobertura * 100)}% · Sal en el fondo ${Math.round(s.fondo * 100)}% · Ritmo ${s.rapidez.toFixed(1)} (0.7–${m.parametros.tope.toFixed(1)})`,
      `Bolsas ${s.bolsas} · Saladas ${s.saladas} · Cerros ${s.cerros}`,
    ];
    m.stats = { x: s.x, bolsas: s.bolsas, saladas: s.saladas, cerros: s.cerros, cobertura: s.cobertura };
  },
  bot(m, dt) {
    const s = m.datos;
    s.auto = true;
    if (s.fase === 'dosis') {
      s.x = 0;
      s.y = s.superficie * 2 - 1;
      echar(m);
      return;
    }
    s.giro += dt * 3.4;
    s.x = Math.cos(s.giro) * 0.5;
    s.y = Math.sin(s.giro) * 0.5;
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      color = s.fruta === 'jocote' ? '#c0392b' : '#f6a623',
      r = 0.25 + s.superficie * 0.3;
    return (
      <Mesa titulo="Jocotes con sal · Cobertura pareja">
        <group position={[-1 + (s.fase === 'agitar' ? s.x * 0.6 : 0), 0.7, s.fase === 'agitar' ? -s.y * 0.6 : 0]}>
          <Cyl pos={[0, 1.2, 0]} r={1.1} rTop={0.9} h={2.2} color="#e8f4f8" mat="glass" solid={false} />
          {[0, 1, 2, 3, 4].map((k) => (
            <Ball
              key={k}
              pos={[Math.cos(k * 1.3) * 0.45, 0.45 + (k % 3) * 0.45, Math.sin(k * 1.3) * 0.45]}
              r={r}
              color={k / 5 < s.cobertura ? '#f1e9da' : color}
              mat="plastic"
            />
          ))}
          <Cyl pos={[0, 0.08, 0]} r={0.9} h={0.04 + s.fondo * 0.3} color="#ffffff" mat="sand" solid={false} />
        </group>
        <Block
          pos={[3.2, 0.75 + dosis(s.y), 1]}
          size={[0.4, dosis(s.y) * 2 + 0.02, 0.4]}
          color="#f1faee"
          solid={false}
        />
        <Block
          pos={[3.9, 0.75 + s.superficie, 1]}
          size={[0.4, s.superficie * 2 + 0.02, 0.4]}
          color={color}
          solid={false}
        />
        <Label pos={[3.55, 3.2, 1]} text="Sal · fruta" h={0.26} />
        <Label
          pos={[-1, 3.6, -1.5]}
          text={s.fase === 'dosis' ? '🧂 Medí la sal' : s.rapidez > m.parametros.tope ? '¡Muy rápido!' : 'Agitá medido'}
          h={0.36}
        />
      </Mesa>
    );
  },
});
export const Saljocote = motor.Escena;
export const guia = motor.guia;
