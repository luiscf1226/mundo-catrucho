import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { art, Ball, Cyl, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { Poza } from '../kit/poza';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & {
  reposo: number;
  poza: number;
  circuitos: number;
  apuros: number;
  bano: number;
};
type Sesion = Motor<{ intervalo: number }, Estado>;
function entrar(m: Sesion) {
  const s = m.datos;
  if (s.bano > 0) return;
  const elegida = Math.max(0, Math.min(2, Math.round(s.x + 1)));
  if (s.reposo < m.parametros.intervalo || elegida !== s.poza) {
    s.apuros++;
    s.reposo = 0;
    m.sumar(-25);
    return;
  }
  s.bano = 1.2;
  s.reposo = 0;
  s.poza = (s.poza + 1) % 3;
  m.sumar(30);
  if (s.poza === 0) {
    s.circuitos++;
    m.sumar(30);
  }
}
const celebracion = { anim: 'celebrate' as const, speed: 0 };
const motor = defineMotor({
  id: 'lempira.termal',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'rio',
  guia: {
    goal: 'Descansá hasta llenar la recuperación. A/D elegí la poza indicada; F entrá. Es un baño virtual.',
    ...controles,
  },
  etapa: (p) => ({ intervalo: 2.2 + p.dif * 0.6 }),
  metas,
  duracion,
  crear: (): Estado => ({ ...cursor(), reposo: 0, poza: 0, circuitos: 0, apuros: 0, bano: 0 }),
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.bano = Math.max(0, s.bano - dt);
    if (s.bano === 0) s.reposo += dt;
    if (input.take('fire')) entrar(m);
    m.objetivo = `Recuperate y entrá a poza ${s.poza + 1}`;
    m.lineas = [
      `Recuperación ${Math.min(100, Math.floor((s.reposo / m.parametros.intervalo) * 100))}% · Baño ${s.bano.toFixed(1)} s`,
      'A/D elegí poza · F entrá cuando estés listo · Apurarte reinicia el descanso',
    ];
    m.stats = { x: s.x, circuitos: s.circuitos, apuros: s.apuros, reposo: s.reposo };
  },
  bot(m, _dt) {
    const s = m.datos;
    s.auto = true;
    s.x = s.poza - 1;
    if (s.reposo >= m.parametros.intervalo) entrar(m);
  },
  Escena: ({ motor: m }) => (
    <Mesa titulo="La pausa también cuenta · Circuito virtual">
      {[0, 1, 2].map((i) => (
        <group key={i} position={[(i - 1) * 3, 0, 0]}>
          <Poza
            pos={[0, 0.85, 0]}
            r={1.2}
            h={0.25}
            color={i === m.datos.poza ? '#7edbd6' : '#548c9b'}
            hondo="#24484d"
            seed={i + 1}
          />
          <Label pos={[0, 1.3, 0]} text={`Poza ${i + 1}`} h={0.3} />
        </group>
      ))}
      <group scale={[Math.min(1, m.datos.reposo / m.parametros.intervalo), 1, 1]}>
        <Cyl pos={[0, 1, 3]} r={1} h={0.1} color="#a8dfac" solid={false} />
      </group>
      {m.datos.circuitos > 0 && (
        <>
          <group position={[0, 1, 1.3]} scale={0.75}>
            <art.Avatar config={useGame.getState().profile.avatar} state={celebracion} name="Tu pausa" />
            <Ball pos={[0, 1.3, 0.3]} r={0.18} color="#faf0cf" mat="glass" />
          </group>
          <Label pos={[0, 3.7, 0]} text="¡Medalla de jabón por tu pausa!" h={0.35} />
        </>
      )}
    </Mesa>
  ),
});
export const Termal = motor.Escena;
export const guia = motor.guia;
