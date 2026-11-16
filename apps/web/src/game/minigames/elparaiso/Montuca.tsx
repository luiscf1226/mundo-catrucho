// «Tusas entrelazadas»: cada tusa nueva se cruza con la anterior alrededor de la masa. Paralelas, se deslizan.
import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

const LARGOS = [0.55, 0.7, 0.85];
type Estado = ReturnType<typeof cursor> & {
  fibras: number[];
  largos: number[];
  cerrados: number;
  deslices: number;
  destapes: number;
  corbata: number;
  sorteo: () => number;
};
type Parametros = { necesita: number; tolerancia: number; reparar: boolean; semilla: number };
type Sesion = Motor<Parametros, Estado>;
/** Diferencia entre dos fibras (son líneas: da igual el sentido), de 0 a π/2. */
const cruce = (a: number, b: number) => {
  const d = (((a - b) % Math.PI) + Math.PI) % Math.PI;
  return Math.min(d, Math.PI - d);
};
function nuevo(s: Estado, par: Parametros) {
  s.largos = Array.from({ length: par.necesita }, () => LARGOS[Math.floor(s.sorteo() * 3)]);
  // en la reparación ya vienen dos tusas puestas: hay que seguir su cruce
  const a = s.sorteo() * Math.PI;
  s.fibras = par.reparar ? [a, a + Math.PI / 2] : [];
}
function poner(m: Sesion) {
  const s = m.datos,
    par = m.parametros;
  if (s.espera > 0) return;
  s.espera = 0.9;
  const largo = Math.hypot(s.x, s.y),
    a = Math.atan2(s.y, s.x),
    pide = s.largos[s.fibras.length];
  if (largo < 0.35) {
    m.sumar(-10);
    return;
  }
  if (largo > 0.95) {
    s.destapes++;
    s.fibras.pop();
    m.sumar(-30);
    useGame.getState().toast('¡Apretaste de más y se destapó la masa!', '🫔');
    return;
  }
  if (Math.abs(largo - pide) > 0.1) {
    m.sumar(-20);
    return;
  }
  const ultima = s.fibras[s.fibras.length - 1];
  if (ultima !== undefined) {
    const d = cruce(a, ultima);
    if (d < 0.5) {
      s.deslices++;
      s.fibras = par.reparar ? s.fibras.slice(0, 2) : [];
      m.sumar(-30);
      useGame.getState().toast('Fibras paralelas: se deslizó y se abrió el paquete.', '🍂');
      return;
    }
    if (Math.abs(d - Math.PI / 2) > par.tolerancia) {
      m.sumar(-15);
      return;
    }
  }
  s.fibras.push(a);
  m.sumar(10);
  if (s.fibras.length >= par.necesita) {
    s.cerrados++;
    m.sumar(50);
    s.espera = 1.5;
    nuevo(s, par);
  }
}
const motor = defineMotor({
  id: 'elparaiso.montuca',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'mercado',
  guia: {
    goal: 'El ángulo del cursor gira la tusa y la distancia al centro es su largo. Cruzala en contra de la anterior y del largo pedido; F amarrá.',
    ...controles,
  },
  etapa: (p) => {
    const reparar = p.tema.variante === 'la-montuca-se-puso-corbata';
    return {
      necesita: (reparar ? 5 : 4) + Math.round(p.dif * 2),
      tolerancia: 0.45 - p.dif * 0.15,
      reparar,
      semilla: p.seed + 3,
    };
  },
  metas,
  duracion,
  crear: (par) => {
    const s: Estado = {
      ...cursor(),
      fibras: [],
      largos: [],
      cerrados: 0,
      deslices: 0,
      destapes: 0,
      corbata: 6,
      sorteo: rng(par.semilla),
    };
    nuevo(s, par);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    if (m.parametros.reparar) {
      // «Montuca con corbata»: cada rato se acomoda la última tusa como corbata de gala
      s.corbata -= dt;
      if (s.corbata <= 0 && s.fibras.length) {
        s.corbata = 7;
        s.fibras[s.fibras.length - 1] += Math.PI / 4;
        useGame.getState().toast('La montuca se acomodó la corbata: revisá la última tusa.', '👔');
      }
    }
    if (input.take('fire')) poner(m);
    const pide = s.largos[s.fibras.length] ?? LARGOS[0];
    m.objetivo = `Tusa ${s.fibras.length + 1}/${m.parametros.necesita} · largo ${pide.toFixed(2)} · cruzada`;
    m.lineas = [
      `Largo ${Math.hypot(s.x, s.y).toFixed(2)} (pedido ${pide.toFixed(2)}) · Ángulo ${Math.round((Math.atan2(s.y, s.x) * 180) / Math.PI)}°`,
      `Montucas cerradas ${s.cerrados} · Deslizadas ${s.deslices} · Destapadas ${s.destapes}`,
    ];
    m.stats = { x: s.x, cerrados: s.cerrados, deslices: s.deslices, fibras: s.fibras.length };
  },
  bot(m) {
    const s = m.datos;
    if (s.espera > 0) return;
    s.auto = true;
    const ultima = s.fibras[s.fibras.length - 1],
      a = ultima === undefined ? 0.4 : ultima + Math.PI / 2,
      largo = s.largos[s.fibras.length];
    s.x = Math.cos(a) * largo;
    s.y = Math.sin(a) * largo;
    poner(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      a = Math.atan2(s.y, s.x),
      largo = Math.hypot(s.x, s.y),
      pide = s.largos[s.fibras.length] ?? LARGOS[0];
    return (
      <Mesa
        titulo={
          m.parametros.reparar ? 'La montuca se puso corbata · Repará el amarre' : 'Montuca de Danlí · Tusas cruzadas'
        }
      >
        <Ball pos={[-1, 1.05, 0]} r={0.75} color="#f2d680" mat="plastic" />
        {s.fibras.map((f, i) => (
          <Block
            key={i}
            pos={[-1, 1.1 + i * 0.05, 0]}
            size={[3.4, 0.05, 0.32]}
            rot={f}
            color={i === s.fibras.length - 1 ? '#e8d28a' : '#cfe39a'}
            mat="leaf"
            solid={false}
          />
        ))}
        <Block
          pos={[-1, 1.6, 0]}
          size={[Math.max(0.2, largo * 4), 0.04, 0.12]}
          rot={a}
          color={Math.abs(largo - pide) <= 0.1 ? '#fff2a8' : '#ff9a76'}
          mat="neon"
          solid={false}
        />
        {/* muestra del largo pedido */}
        <Block pos={[2.7, 0.76, 2.6]} size={[pide * 4, 0.05, 0.3]} color="#cfe39a" mat="leaf" solid={false} />
        <Label pos={[2.7, 1.2, 2.6]} text={`Tusa pedida ${pide.toFixed(2)}`} h={0.4} />
        {m.parametros.reparar && (
          <group position={[-1, 0, 0]}>
            <Block pos={[0, 1.55, 0.72]} size={[0.16, 0.5, 0.06]} color="#c9b27a" mat="cloth" solid={false} />
            <Block pos={[0, 1.82, 0.72]} size={[0.3, 0.14, 0.06]} color="#c9b27a" mat="cloth" solid={false} />
            <Label pos={[0, 2.5, 0]} text="👔 «Es corbata de tusa, no de gala»" h={0.4} />
          </group>
        )}
        {!m.parametros.reparar && (
          <group position={[-5, 0, -2.2]}>
            <Cyl pos={[0, 1.05, 0]} r={0.35} rTop={0.25} h={0.7} color="#f2d680" solid={false} />
            <Label pos={[0, 1.8, 0]} text={`Cerradas ${s.cerrados}`} h={0.38} />
          </group>
        )}
      </Mesa>
    );
  },
});
export const Montuca = motor.Escena;
export const guia = motor.guia;
