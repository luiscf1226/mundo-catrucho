import { input } from '../../../core/input';
import { Ball, Block, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & { luz: number; planos: number; errores: number; espera: number };
type Sesion = Motor<{ margen: number; traje: boolean }, Estado>;
function veta(m: Sesion) {
  const s = m.datos;
  return { x: Math.sin(s.luz * 2.1 + s.planos) * 0.65, y: Math.cos(s.luz * 1.7 + s.planos) * 0.65 };
}
function marcar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  const v = veta(m);
  if (Math.hypot(s.x - v.x, s.y - v.y) < m.parametros.margen) {
    s.luz++;
    if (s.luz === 3) {
      s.luz = 0;
      s.planos++;
      m.sumar(90);
    }
  } else {
    s.errores++;
    s.luz = 0;
    m.sumar(-20);
  }
  s.espera = 0.8;
}
const motor = defineMotor({
  id: 'lempira.opalo',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'cueva',
  guia: {
    goal: 'Girá la muestra con ambos ejes. El color interno se mueve con la luz; el reflejo blanco no es veta. F registrá cada una de tres luces.',
    ...controles,
  },
  etapa: (p) => ({ margen: 0.28 - p.dif * 0.09, traje: p.tema.variante === 'la-piedra-cambio-de-traje' }),
  metas,
  duracion,
  crear: (): Estado => ({ ...cursor(), luz: 0, planos: 0, errores: 0, espera: 0 }),
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (m.parametros.traje) {
      const x = s.x;
      s.x = -s.y;
      s.y = x;
      if (input.take('fire')) marcar(m);
      s.y = -s.x;
      s.x = x;
    } else if (input.take('fire')) marcar(m);
    const v = veta(m);
    m.objetivo = `Luz ${s.luz + 1}/3 · Buscá el color interno`;
    m.lineas = [
      m.parametros.traje
        ? 'Estuche girado 90°: el movimiento cambia de eje'
        : 'Compará el centro de color con la referencia; ignorá el blanco',
      `Referencia ${Math.round(v.x * 90)}°, ${Math.round(v.y * 90)}° · Muestra ${Math.round(s.x * 90)}°, ${Math.round(s.y * 90)}°`,
    ];
    m.stats = { x: s.x, y: s.y, planos: s.planos, errores: s.errores, luz: s.luz };
  },
  bot(m, _dt) {
    const s = m.datos;
    s.auto = true;
    const v = veta(m);
    s.x = v.x;
    s.y = v.y;
    marcar(m);
    s.x = m.parametros.traje ? v.y : v.x;
    s.y = m.parametros.traje ? -v.x : v.y;
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      v = veta(m);
    const x = m.parametros.traje ? -s.y : s.x,
      y = m.parametros.traje ? s.x : s.y;
    return (
      <Mesa titulo="Muestra virtual · Tres luces, un plano interno">
        <group rotation={[y, x, 0]}>
          <Ball pos={[0, 1.8, 0]} r={1.6} color="#4d626b" mat="glass" />
          <Block
            pos={[0, 1.9, 0]}
            size={[1.9, 0.1, 0.8]}
            color={Math.hypot(x - v.x, y - v.y) < m.parametros.margen ? '#6df6c4' : '#665d91'}
            mat="neon"
            solid={false}
          />
          <Ball pos={[0.9, 2.7, 0.6]} r={0.23} color="#ffffff" />
        </group>
        {[0, 1, 2].map((i) => (
          <Ball key={i} pos={[(i - 1) * 3, 3, -2]} r={0.2} color={i === s.luz ? '#ffe395' : '#7d8184'} />
        ))}
        {m.parametros.traje && (
          <group rotation={[0, 0, (s.luz * Math.PI) / 2]}>
            <Block
              pos={[3, 1.5, 0]}
              size={[1.2, 1.5, 0.05]}
              color={['#dc8a6b', '#98c694', '#b1a3da'][s.luz]}
              mat="cloth"
              solid={false}
            />
            <Label pos={[3, 2.8, 0]} text="Traje de papel" h={0.28} />
          </group>
        )}
      </Mesa>
    );
  },
});
export const Opalo = motor.Escena;
export const guia = motor.guia;
