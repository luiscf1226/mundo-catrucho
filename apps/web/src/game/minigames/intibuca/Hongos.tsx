import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & { fichas: number; errores: number; espera: number; cancelada: boolean };
type Sesion = Motor<{ carnet: boolean }, Estado>;
const campos = ['firma profesional', 'procedencia', 'registro de réplica'];
function revisar(m: Sesion, consulta: boolean) {
  const s = m.datos;
  if (s.espera > 0 || s.cancelada) return;
  s.espera = 1.5;
  const falta = s.fichas % 3;
  const completa = s.fichas % 4 === 3;
  const bien = m.parametros.carnet ? consulta && Math.abs(s.x - [-0.65, 0, 0.65][falta]) < 0.25 : consulta !== completa;
  if (bien) {
    s.fichas++;
    m.sumar(40);
  } else {
    s.errores++;
    m.sumar(-40);
    if (!consulta && !completa) {
      s.cancelada = true;
      m.sumar(-m.puntos);
    }
  }
}
const motor = defineMotor({
  id: 'intibuca.hongos',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  guia: {
    goal: 'Solo réplicas. E envía la duda al experto; F archiva una ficha completa. Nunca decidás consumo.',
    ...controles,
  },
  etapa: (p) => ({ carnet: p.tema.variante === 'el-choro-pidio-carnet' }),
  metas,
  duracion,
  crear: (): Estado => ({ ...cursor(), fichas: 0, errores: 0, espera: 0, cancelada: false }),
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('use')) revisar(m, true);
    if (input.take('fire')) revisar(m, false);
    m.objetivo = s.cancelada
      ? 'Ronda cancelada por adivinar. No cocinés nada.'
      : m.parametros.carnet
        ? `Señalá el dato ausente: ${campos[s.fichas % 3]}. E: consultá`
        : `Ficha ${s.fichas + 1}: ${s.fichas % 4 === 3 ? 'completa, revisada por experto' : 'pendiente: falta ' + campos[s.fichas % 3]}`;
    m.lineas = [
      'E: puesto experto · F: archivá solo fichas completas',
      'Carnet: izquierda firma · centro procedencia · derecha registro',
      'Réplicas ficticias. Esto no identifica hongos reales.',
    ];
    m.stats = { x: s.x, fichas: s.fichas, errores: s.errores, cancelada: Number(s.cancelada) };
  },
  bot(m, _dt) {
    m.datos.auto = true;
    m.datos.x = [-0.65, 0, 0.65][m.datos.fichas % 3];
    revisar(m, m.parametros.carnet || m.datos.fichas % 4 !== 3);
  },
  Escena: ({ motor: m }) => (
    <Mesa titulo="Puesto experto · Réplicas de espuma">
      <Cyl pos={[-2, 1.5, 0]} r={0.3} h={1.3} color="#eee2cd" solid={false} />
      <group scale={[1, 0.4, 1]}>
        <Ball pos={[-2, 5.5, 0]} r={1} color="#e9ab63" />
      </group>
      <Block
        pos={[0.7, 2, 0]}
        size={[2.8, m.parametros.carnet ? 2.4 : 1.5, 0.1]}
        color="#f7e8ca"
        mat="cloth"
        solid={false}
      />
      <Label pos={[0.7, 2.8, 0.1]} text={`Ficha ${m.datos.fichas + 1} · Réplica`} h={0.3} />
      <Label
        pos={[0.7, 2, 0.15]}
        text={m.datos.fichas % 4 === 3 ? 'Revisada ✓' : 'Falta ' + campos[m.datos.fichas % 3]}
        h={0.25}
      />
      <Label pos={[-1, 3.8, -2]} text="No decide consumo" h={0.4} />
    </Mesa>
  ),
});
export const Hongos = motor.Escena;
export const guia = motor.guia;
