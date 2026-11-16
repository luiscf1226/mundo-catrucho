import { input } from '../../../core/input';
import { Block, Cyl, Label, Plate } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover, Puntero } from './comun';

type Marca = { t: number; nivel: number };
type Estado = ReturnType<typeof cursor> & {
  azar: () => number;
  t: number;
  base: number;
  sube: number;
  ola: number;
  fase: number;
  marcas: Marca[];
  linea: number | null;
  secas: number;
  mojadas: number;
  espera: number;
  aviso: string;
};
type Sesion = Motor<{ ronda: number; holgura: number; semilla: number }, Estado>;
/** Nivel del agua: la tendencia de la marea más olas sueltas que engañan. */
const nivel = (s: Estado, t: number) => s.base + s.sube * t + s.ola * Math.max(0, Math.sin(t * 2.3 + s.fase)) ** 6;
/** Hasta dónde llega la pleamar al cerrar la ronda (con un margen de espuma). */
const pleamar = (s: Estado, ronda: number) => s.base + s.sube * ronda + 0.05;
function nuevaRonda(s: Estado, ronda: number, dif: number) {
  s.t = 0;
  s.sube = 0.1 + s.azar() * 0.06;
  s.base = 0.1 + s.azar() * 0.5 - s.sube * ronda;
  s.ola = 0.12 + dif * 0.12;
  s.fase = s.azar() * 6;
  s.marcas = [];
  s.linea = null;
}
function marcar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0 || s.linea !== null) return;
  if (s.marcas.length < 3) {
    const ultima = s.marcas[s.marcas.length - 1];
    if (ultima && s.t - ultima.t < 0.8) {
      s.aviso = 'Esperá un poco entre marcas';
      return;
    }
    s.marcas.push({ t: s.t, nivel: nivel(s, s.t) });
    s.aviso = `Marca ${s.marcas.length} de 3`;
    return;
  }
  s.espera = 0.3;
  s.linea = s.y;
  s.aviso = 'Franja de paseo delimitada';
}
function cerrar(m: Sesion) {
  const s = m.datos,
    alto = pleamar(s, m.parametros.ronda);
  if (s.linea === null) {
    s.aviso = 'No delimitaste la franja';
    m.sumar(-20);
  } else if (s.linea < alto) {
    s.mojadas++;
    s.aviso = '¡La pleamar mojó el paseo!';
    m.sumar(-60);
  } else if (s.linea - alto <= m.parametros.holgura) {
    s.secas++;
    s.aviso = '¡Franja seca y bien aprovechada!';
    m.sumar(70);
  } else {
    s.aviso = 'Seca, pero dejaste muy poca playa';
    m.sumar(10);
  }
  nuevaRonda(s, m.parametros.ronda, m.partida.dif);
}
const motor = defineMotor({
  id: 'choluteca.mareapaseo',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'costa',
  guia: {
    goal: 'F tomá tres marcas de agua separadas. Después W/S poné el borde del paseo arriba de la pleamar y F. No le creás a una sola ola.',
    ...controles,
  },
  etapa: (p) => ({ ronda: 7.5 - p.dif, holgura: 0.25 - p.dif * 0.07, semilla: p.seed }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      azar: rng(p.semilla),
      t: 0,
      base: 0,
      sube: 0.1,
      ola: 0.1,
      fase: 0,
      marcas: [],
      linea: null,
      secas: 0,
      mojadas: 0,
      espera: 0,
      aviso: '',
    };
    nuevaRonda(s, p.ronda, 0);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos,
      ronda = m.parametros.ronda;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.t += dt;
    if (input.take('fire')) marcar(m);
    if (s.t >= ronda) cerrar(m);
    const marcas = s.marcas.map((k) => `${k.t.toFixed(1)} s → ${k.nivel.toFixed(2)}`).join(' · ');
    m.objetivo =
      s.marcas.length < 3
        ? `Tomá la marca ${s.marcas.length + 1} de 3`
        : s.linea === null
          ? `Delimitá el paseo · pleamar a los ${ronda.toFixed(1)} s`
          : 'Esperá la pleamar';
    m.lineas = [
      `Marcas: ${marcas || 'ninguna'} · Ahora ${s.t.toFixed(1)} s · Borde ${s.y.toFixed(2)}`,
      `Paseos secos ${s.secas} · Mojados ${s.mojadas} · ${s.aviso}`,
    ];
    m.stats = { x: s.x, y: s.y, marcas: s.marcas.length, secas: s.secas, mojadas: s.mojadas };
  },
  bot(m) {
    const s = m.datos;
    s.auto = true;
    s.y = Math.min(1, pleamar(s, m.parametros.ronda) + 0.1);
    marcar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      agua = Math.min(1.1, nivel(s, s.t)),
      largo = Math.max(0.05, 3.5 + agua * 3);
    return (
      <Mesa titulo="Cedeño deja tres marcas · Paseo seco">
        <Block pos={[-1, 0.72, -0.5]} size={[10, 0.04, 7]} color="#6f6a5e" mat="sand" solid={false} />
        <Block pos={[-1, 0.76, 3.5 - largo / 2]} size={[10, 0.05, largo]} color="#3f7fa6" mat="water" solid={false} />
        <Label pos={[-5.6, 1.2, 3.4]} text="Mar" h={0.3} />
        {s.marcas.map((k, i) => (
          <group key={i} position={[-4 + i * 1.6, 0, -k.nivel * 3]}>
            <Cyl pos={[0, 1.1, 0]} r={0.06} h={0.8} color="#795333" mat="wood" solid={false} />
            <Label pos={[0, 1.7, 0]} text={`${i + 1}`} h={0.24} />
          </group>
        ))}
        {s.linea !== null && (
          <Block pos={[-1, 0.82, -s.linea * 3]} size={[10, 0.06, 0.12]} color="#e63946" mat="cloth" solid={false} />
        )}
        <Plate pos={[2.5, 1.2, -3.2]} text="🦀 Paseo" h={0.26} bg="#386641" />
        <Puntero x={s.x} y={s.y} color="#e63946" />
      </Mesa>
    );
  },
});
export const Marea = motor.Escena;
export const guia = motor.guia;
