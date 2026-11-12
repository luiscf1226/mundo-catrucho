import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & {
  anillos: number[];
  humedad: number;
  giro: number;
  angulo: number;
  secando: number;
  vasijas: number;
  colapsos: number;
  autoGiro: number;
};
type Sesion = Motor<{ reparar: boolean; minimo: number }, Estado>;
function modelar(m: Sesion) {
  const s = m.datos;
  if (s.secando > 0) return;
  if (Math.abs(s.giro) < Math.PI * 1.8) {
    s.colapsos++;
    s.giro = 0;
    m.sumar(-20);
    return;
  }
  const espesor = Math.hypot(s.x, s.y);
  if (
    (m.parametros.reparar && Math.abs(espesor - (s.anillos.length % 2 ? 0.8 : 0.58)) > 0.08) ||
    (!m.parametros.reparar && s.anillos.length > 0 && s.anillos[s.anillos.length - 1] + 0.15 < espesor) ||
    espesor < m.parametros.minimo ||
    espesor > 0.95 ||
    s.humedad > 0.85
  ) {
    s.colapsos++;
    s.anillos = [];
    s.giro = 0;
    m.sumar(-30);
    return;
  }
  s.anillos.push(espesor);
  s.humedad += 0.22;
  s.giro = 0;
  if (s.anillos.length === 4) s.secando = 2.5;
}
const motor = defineMotor({
  id: 'lempira.barro',
  fondo: 'pueblo',
  guia: {
    goal: 'Dibujá círculos con arrastre o ambos ejes. El radio fija espesor. F levantá un anillo; dejá secar el barro húmedo. En la olla con cintura redistribuís el barro existente.',
    ...controles,
  },
  etapa: (p) => ({ reparar: p.tema.variante === 'la-olla-salio-con-cintura', minimo: 0.45 + p.dif * 0.1 }),
  metas,
  duracion,
  crear: (): Estado => ({
    ...cursor(),
    anillos: [],
    humedad: 0.3,
    giro: 0,
    angulo: 0,
    secando: 0,
    vasijas: 0,
    colapsos: 0,
    autoGiro: 0,
  }),
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    const a = Math.atan2(s.y, s.x);
    let cambio = a - s.angulo;
    if (cambio > Math.PI) cambio -= Math.PI * 2;
    if (cambio < -Math.PI) cambio += Math.PI * 2;
    s.angulo = a;
    if (Math.hypot(s.x, s.y) > m.parametros.minimo && Math.hypot(s.x, s.y) < 0.95)
      s.giro += Math.sign(cambio) * Math.min(Math.abs(cambio), dt * 4);
    s.humedad = Math.max(0.2, s.humedad - dt * 0.08);
    if (s.secando > 0) {
      s.secando = Math.max(0, s.secando - dt);
      if (s.secando === 0) {
        s.vasijas++;
        s.humedad = 0.2;
        s.giro = 0;
        m.sumar(150);
        s.anillos = [];
      }
    }
    if (input.take('fire')) modelar(m);
    m.objetivo = m.parametros.reparar
      ? `Repartí el barro: radio pedido ${s.anillos.length % 2 ? '0.80' : '0.58'}`
      : 'Levantá cuatro anillos y esperá el secado';
    m.lineas = [
      `Círculo ${Math.min(100, Math.round((Math.abs(s.giro) / (Math.PI * 1.8)) * 100))}% · Radio ${Math.hypot(s.x, s.y).toFixed(2)} (0.55–0.95) · Humedad ${Math.round(s.humedad * 100)}%`,
      `${m.parametros.reparar ? 'Reparaciones' : 'Anillos'} ${s.anillos.length}/4 · Secado ${s.secando.toFixed(1)} s · F confirmá una vuelta completa`,
    ];
    m.stats = { x: s.x, vasijas: s.vasijas, colapsos: s.colapsos, giro: s.giro, anillos: s.anillos.length };
  },
  bot(m, dt, actor) {
    if (actor === 'compa') return;
    const s = m.datos;
    s.auto = true;
    s.autoGiro += dt * 3.8;
    const radio = m.parametros.reparar ? (s.anillos.length % 2 ? 0.8 : 0.58) : 0.7;
    s.x = Math.cos(s.autoGiro) * radio;
    s.y = Math.sin(s.autoGiro) * radio;
    if (s.giro >= Math.PI * 1.8) modelar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    return (
      <Mesa
        titulo={
          m.parametros.reparar ? 'Olla con cintura · Redistribuí, no agregués' : 'Taller de práctica · Anillos de barro'
        }
      >
        {[0, 1, 2, 3].map((i) => {
          const puesto = i < s.anillos.length;
          const radio =
            m.parametros.reparar && !puesto
              ? 1.3 + Math.sin(m.tiempo * 3 + i) * 0.2
              : puesto
                ? s.anillos[i] + 0.35
                : 0.7;
          return (
            <group key={i} position={[0, 1 + i * 0.5, 0]} scale={[radio, 1, radio]}>
              <Cyl
                pos={[0, 0, 0]}
                r={1}
                rTop={0.95}
                h={0.48}
                color={puesto ? '#c98458' : m.parametros.reparar ? '#e5a16c' : '#a2836d'}
                mat="stone"
                solid={false}
              />
              <Cyl pos={[0, 0.245, 0]} r={0.72} h={0.02} color="#634d3c" solid={false} />
            </group>
          );
        })}
        <Ball pos={[s.x * 3, 1.4, s.y * 3]} r={0.16} color="#f9e3a4" />
        {m.parametros.reparar && (
          <>
            <Block pos={[3, 1.5, 0]} size={[0.12, 1.8, 0.1]} color="#c1c9cd" mat="metal" solid={false} />
            <Ball pos={[3, 2.6, 0]} r={0.4} color="#b8d9df" mat="metal" />
          </>
        )}
        <Label
          pos={[0, 3.7, 0]}
          text={
            s.secando > 0
              ? 'Secando · No cargués más peso'
              : m.parametros.reparar
                ? 'El barro de práctica hace resorte'
                : 'Cada cuello sostiene el peso mojado'
          }
          h={0.3}
        />
      </Mesa>
    );
  },
});
export const Barro = motor.Escena;
export const guia = motor.guia;
