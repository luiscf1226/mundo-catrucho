import { input } from '../../../core/input';
import { Ball, Block, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { Poza } from '../kit/poza';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & {
  onda: number;
  fase: number;
  fotos: number;
  errores: number;
  espera: number;
  anillos: number[];
};
type Sesion = Motor<{ margen: number }, Estado>;
function foto(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 2;
  const cruce = Math.abs(Math.sin(s.fase) * s.onda);
  if (
    Math.abs(s.x - 0.5) < m.parametros.margen &&
    Math.abs(s.y + 0.35) < m.parametros.margen &&
    cruce < 0.12 &&
    s.onda < 0.25
  ) {
    s.fotos++;
    m.sumar(50);
    s.onda = 0.8;
  } else {
    s.errores++;
    m.sumar(-25);
    s.onda = Math.min(1, s.onda + 0.3);
  }
}
const motor = defineMotor({
  id: 'intibuca.ondas',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  guia: {
    goal: 'Mové la plataforma hasta la marca. Cada movimiento produce ondas. Esperá que se apaguen y F toma la foto.',
    ...controles,
  },
  etapa: (p) => ({ margen: 0.3 - p.dif * 0.15 }),
  metas,
  duracion,
  crear: (): Estado => ({ ...cursor(), onda: 0.8, fase: 0, fotos: 0, errores: 0, espera: 0, anillos: [0, 1, 2] }),
  actualizar(m, dt) {
    const s = m.datos;
    const x = s.x,
      y = s.y;
    mover(s, dt);
    s.onda = Math.max(0, Math.min(1, s.onda + Math.hypot(s.x - x, s.y - y) * 0.7 - dt * 0.18));
    s.fase += dt * 3;
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('fire')) foto(m);
    m.objetivo = 'Plataforma: derecha y abajo · F cuando el reflejo quede completo';
    m.lineas = [
      `Ondas ${Math.round(s.onda * 100)}% · Fotos ${s.fotos} · Deformadas ${s.errores}`,
      'Esperá menos de 25% de ondas y que ningún anillo cruce la silueta',
    ];
    m.stats = { x: s.x, fotos: s.fotos, errores: s.errores, onda: s.onda };
  },
  bot(m, _dt) {
    const s = m.datos;
    s.auto = true;
    s.x = 0.5;
    s.y = -0.35;
    if (s.onda < 0.1) foto(m);
  },
  Escena: ({ motor: m }) => (
    <Mesa titulo="Chiligatoro · Laboratorio de reflejos">
      <Poza pos={[-1, 0.9, 0]} size={[7, 0.12, 5]} color="#527e9a" hondo="#1d3346" seed={6} />
      {m.datos.anillos.map((i) => (
        <group
          key={i}
          position={[-1, 1.1, 0]}
          scale={[1 + ((m.datos.fase + i) % 3) * 0.6, 0.04, 1 + ((m.datos.fase + i) % 3) * 0.6]}
          visible={m.datos.onda > 0.1}
        >
          {Array.from({ length: 16 }, (_, j) => (
            <Ball
              key={j}
              pos={[Math.cos((j * Math.PI) / 8), 0, Math.sin((j * Math.PI) / 8)]}
              r={0.07}
              color="#c5e3ef"
            />
          ))}
        </group>
      ))}
      <Block
        pos={[-1 + m.datos.x * 3, 1.4, m.datos.y * 3]}
        size={[0.8, 0.15, 0.7]}
        color="#c4a276"
        mat="wood"
        solid={false}
      />
      <Label pos={[-1, 3, -2]} text={m.datos.onda < 0.25 ? 'Reflejo casi listo' : 'El agua sigue hablando'} h={0.4} />
    </Mesa>
  ),
});
export const Ondas = motor.Escena;
export const guia = motor.guia;
