import { input } from '../../../core/input';
import { Block, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover, Replica } from './comun';

type Estado = ReturnType<typeof cursor> & {
  orientadas: number;
  falsas: number;
  vistas: number;
  espera: number;
  foto: number;
};
type Parametros = { margen: number };
type Sesion = Motor<Parametros, Estado>;

function angulo(s: Estado) {
  return ((s.orientadas % 3) - 1) * 0.6;
}
function fotografiar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  const frente = Math.abs(Math.sin(s.x * Math.PI) - Math.sin(angulo(s) * Math.PI)) < m.parametros.margen;
  const atras = Math.abs(Math.cos(s.x * Math.PI) - Math.cos(angulo(s) * Math.PI)) < m.parametros.margen * 0.6;
  if (s.y < 0 && frente) s.vistas |= 1;
  else if (s.y >= 0 && atras) s.vistas |= 2;
  else {
    s.falsas++;
    s.vistas = 0;
    m.sumar(-10);
  }
  s.foto = s.x;
  if (s.vistas === 3) {
    s.orientadas++;
    m.sumar(50);
    s.vistas = 0;
  }
  s.espera = 0.7;
}

const motor = defineMotor({
  id: 'copan.estelas',
  fondo: 'ruinas',
  guia: {
    goal: 'Rotá la réplica y cotejá las dos fotografías. A/D giro, W/S vista frontal o posterior; F registra cada vista.',
    ...controles,
  },
  etapa: (p) => ({ margen: 0.3 - p.dif * 0.17 }),
  metas,
  duracion,
  crear: (): Estado => ({ ...cursor(), orientadas: 0, falsas: 0, vistas: 0, espera: 0, foto: 0 }),
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    if (s.vistas && Math.abs(s.x - s.foto) > 0.02) s.vistas = 0;
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('fire')) fotografiar(m);
    m.objetivo = 'Hacé coincidir las fotos de ambos extremos';
    m.lineas = [
      `A/D giro ${Math.round(s.x * 90)}° · Referencia ${Math.round(angulo(s) * 90)}° · W/S cámara ${s.y < 0 ? 'frontal' : 'posterior'}`,
      `F sacá foto · Frente ${s.vistas & 1 ? '✓' : 'pendiente'} · Atrás ${s.vistas & 2 ? '✓' : 'pendiente'} · Una sola vista no fija el patio`,
    ];
    m.stats = { orientadas: s.orientadas, falsas: s.falsas, vistas: s.vistas, x: s.x };
  },
  bot(m, dt, actor) {
    if (actor === 'compa') {
      m.datos.espera = Math.max(0, m.datos.espera - dt * 0.2);
      return;
    }
    const s = m.datos;
    s.auto = true;
    s.x = angulo(s);
    s.y = s.vistas & 1 ? 0.7 : -0.7;
    fotografiar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    return (
      <Mesa titulo="Rotá la réplica y cotejá las dos fotografías">
        <group position={[-2, 0, 0]}>
          <Replica giro={s.x * Math.PI} />
        </group>
        {[-1, 1].map((l) => (
          <group key={l} position={[2, 0, l * 2]}>
            <Block pos={[0, 1.6, 0]} size={[2, 0.1, 1.5]} color="#eee0be" mat="cloth" solid={false} />
            <Label pos={[0, 2.3, 0]} text={`${l < 0 ? 'Frente' : 'Atrás'} · ${Math.round(angulo(s) * 90)}°`} h={0.28} />
            <Block
              pos={[Math.sin(angulo(s) * Math.PI) * 0.5, 1.8, 0]}
              size={[0.15, 0.15, 1]}
              color={l < 0 ? '#54afaa' : '#e7ad62'}
              mat="cloth"
              solid={false}
            />
          </group>
        ))}
        <Label pos={[-2, 3.9, 0]} text="Réplica geométrica · Sin inscripciones reales" h={0.26} />
      </Mesa>
    );
  },
});
export const Estelas = motor.Escena;
export const guia = motor.guia;
