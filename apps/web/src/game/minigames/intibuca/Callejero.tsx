import { input } from '../../../core/input';
import { Block, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & {
  municipio: number;
  armada: boolean;
  entregas: number;
  errores: number;
  espera: number;
  consulta: boolean;
};
type Sesion = Motor<{ ambigua: boolean; margen: number }, Estado>;
function destino(s: Estado) {
  return { x: ((s.entregas % 3) - 1) * 0.65, y: s.entregas % 2 ? 0.5 : -0.5, municipio: s.entregas % 2 };
}
function entregar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 1;
  const d = destino(s);
  if (s.municipio === d.municipio && Math.hypot(s.x - d.x, s.y - d.y) < m.parametros.margen) {
    if (s.armada) {
      s.entregas++;
      m.sumar(45);
      s.armada = m.parametros.ambigua;
      s.consulta = false;
    } else {
      s.armada = true;
    }
  } else {
    s.errores++;
    m.sumar(-25);
  }
}
const motor = defineMotor({
  id: 'intibuca.callejero',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  guia: {
    goal: 'E cambia municipio. Ubicá la manzana con ambos ejes; F la coloca y F entrega. Las plazas se conservan.',
    ...controles,
  },
  etapa: (p) => ({ ambigua: p.tema.variante === 'la-direccion-cambio-de-acera', margen: 0.32 - p.dif * 0.12 }),
  metas,
  duracion,
  crear: (p): Estado => ({
    ...cursor(),
    municipio: 0,
    armada: p.ambigua,
    entregas: 0,
    errores: 0,
    espera: 0,
    consulta: false,
  }),
  actualizar(m, dt) {
    const s = m.datos;
    const d = destino(s);
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('use')) s.municipio = 1 - s.municipio;
    if ((input.take('alt') || input.take('jump')) && !s.consulta) s.consulta = true;
    if (input.take('fire')) entregar(m);
    m.objetivo = `${s.armada ? 'Entregá' : 'Colocá manzana'} en ${d.municipio ? 'Intibucá' : 'La Esperanza'} · columna ${(s.entregas % 3) + 1} · ${d.y > 0 ? 'norte' : 'sur'}`;
    m.lineas = [
      `E: municipio ${s.municipio ? 'Intibucá' : 'La Esperanza'} · F: confirmar`,
      m.parametros.ambigua
        ? `Tres referencias: plaza ${d.municipio + 1}, columna ${(s.entregas % 3) + 1}, lado ${d.y > 0 ? 'norte' : 'sur'} · Q / Salto: una consulta al plano`
        : 'Dos plazas, dos municipios. Cerca no significa correcto.',
      s.consulta ? 'Plano consultado: seguí las tres referencias' : 'Plano disponible',
    ];
    m.stats = { x: s.x, entregas: s.entregas, errores: s.errores };
  },
  bot(m, _dt) {
    const s = m.datos;
    s.auto = true;
    Object.assign(s, destino(s));
    entregar(m);
  },
  Escena: ({ motor: m }) => (
    <Mesa titulo="Maqueta urbana · Límites municipales">
      {[-1, 1].map((lado) => (
        <group key={lado}>
          <Block
            pos={[-1 + lado * 2.2, 0.9, 0]}
            size={[3.7, 0.1, 5]}
            color={lado < 0 ? '#e8c397' : '#b7cbd7'}
            solid={false}
          />
          <Label pos={[-1 + lado * 2.2, 2.8, -2.5]} text={lado < 0 ? 'La Esperanza' : 'Intibucá'} h={0.3} />
          <Block pos={[-1 + lado * 2.2, 1.1, 0]} size={[0.7, 0.2, 0.7]} color="#67a869" solid={false} />
        </group>
      ))}
      <group visible={!m.parametros.ambigua || m.datos.consulta}>
        {Array.from({ length: 6 }, (_, i) => (
          <Block
            key={i}
            pos={[-3 + (i % 3) * 2, 1.2, i < 3 ? -1.5 : 1.5]}
            size={[0.8, 0.4, 0.6]}
            color="#a688a7"
            solid={false}
          />
        ))}
      </group>
      <Block pos={[-1 + m.datos.x * 3, 1.7, m.datos.y * 3]} size={[0.4, 0.2, 0.4]} color="#ffd764" solid={false} />
    </Mesa>
  ),
});
export const Callejero = motor.Escena;
export const guia = motor.guia;
