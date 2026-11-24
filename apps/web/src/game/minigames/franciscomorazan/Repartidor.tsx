import { input } from '../../../core/input';
import { Ball, Block, Label, P } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { cursorInicial, Mesa, movioPuntero } from './Mesa';

type Cruce = { sentido: number; ocupado: number; colas: number[] };
type Trafico = {
  cursor: ReturnType<typeof cursorInicial>;
  cruces: Cruce[];
  elegido: number;
  auto: boolean;
  reloj: number;
  choques: number;
  entregas: number;
  ayuda: number;
};
type Param = { llegada: number; paso: number; nombre: string };
type Sesion = Motor<Param, Trafico>;
function cambiar(m: Sesion, i: number) {
  const s = m.datos,
    c = s.cruces[i];
  if (c.ocupado > 0) {
    s.choques++;
    m.sumar(-12);
    c.ocupado = m.parametros.paso * 1.5;
  } else c.sentido = 1 - c.sentido;
}
const motor = defineMotor({
  id: 'franciscomorazan.repartidor',
  modos: { duo: { tipo: 'apoyo' }, abierto: { tipo: 'ambiente', bots: 3 } },
  guia: {
    goal: 'Alterná los dos semáforos para vaciar colas. Esperá a que el cruce quede libre antes de cambiar.',
    keys: [
      ['A / D o mouse / stick derecho', 'elegir cruce'],
      ['F / clic', 'alternar semáforo'],
    ],
    touch: [
      ['Palanca / tocá', 'elegir cruce'],
      ['🎯', 'alternar semáforo'],
    ],
  },
  etapa: (p) => ({
    // en la última etapa las colas crecen más rápido, pero no tanto que vaciarlas sea imposible
    llegada: 2.4 - p.dif * 0.5,
    paso: 1.1 + p.dif * 0.35,
    nombre: typeof p.tema.nombre === 'string' ? p.tema.nombre : 'Puentes de las dos ciudades',
  }),
  metas: (p) => [80 + Math.round(p.dif * 50), 160 + Math.round(p.dif * 50), 260 + Math.round(p.dif * 50)],
  duracion: () => 75,
  crear: (): Trafico => ({
    cursor: cursorInicial(),
    cruces: [
      { sentido: 0, ocupado: 0, colas: [0, 3] },
      { sentido: 0, ocupado: 0, colas: [0, 3] },
    ],
    elegido: 0,
    auto: false,
    reloj: 0,
    choques: 0,
    entregas: 0,
    ayuda: 0,
  }),
  actualizar: (m, dt) => {
    const s = m.datos;
    const puntero = movioPuntero(s.cursor);
    if (!s.auto) {
      if (Math.abs(input.mx) > 0.2 || puntero) s.elegido = (Math.abs(input.mx) > 0.2 ? input.mx : input.px) < 0 ? 0 : 1;
      if (input.take('fire')) cambiar(m, s.elegido);
    }
    s.auto = false;
    s.reloj += dt;
    if (s.reloj >= m.parametros.llegada) {
      s.reloj = 0;
      s.cruces.forEach((c) => {
        c.colas[1]++;
        if (c.colas[1] > 9) {
          c.colas[1] = 9;
          m.sumar(-5);
        }
      });
    }
    s.cruces.forEach((c, i) => {
      if (c.ocupado > 0) {
        c.ocupado = Math.max(0, c.ocupado - dt);
        return;
      }
      const destino = s.cruces[1 - i];
      if (c.colas[c.sentido] > 0 && (c.sentido === 0 || destino.colas[0] < 5)) {
        c.colas[c.sentido]--;
        c.ocupado = Math.max(0.5, m.parametros.paso - s.ayuda);
        if (c.sentido === 1) destino.colas[0]++;
        else {
          m.sumar(8);
          s.entregas++;
        }
      }
    });
    m.objetivo = 'Verde 1 lleva al otro puente · Verde 0 sale de la ciudad';
    m.lineas = s.cruces.map(
      (c, i) =>
        `Cruce ${i + 1}${s.elegido === i ? ' ◀' : ''} · Cola salida ${c.colas[0]} / entrada ${c.colas[1]} · ${c.ocupado > 0 ? 'OCUPADO: esperá' : 'LIBRE: podés cambiar'}`,
    );
    m.stats = { entregas: s.entregas, choques: s.choques, cruce: s.elegido };
  },
  bot: (m, _dt, actor) => {
    if (actor === 'compa') {
      m.datos.ayuda = 0.15;
      return;
    }
    m.datos.auto = true;
    m.datos.cruces.forEach((c, i) => {
      const sentido = c.colas[0] > 0 ? 0 : 1;
      if (c.ocupado === 0 && c.sentido !== sentido) cambiar(m, i);
    });
  },
  Escena: ({ motor: m }: { motor: Sesion }) => (
    <Mesa nombre={m.parametros.nombre} aviso="No cambiés en amarillo · Los dos puentes están conectados">
      <Block pos={[0, 1.05, 0]} size={[1, 0.1, 7]} color="#349bbd" mat="water" solid={false} />
      {m.datos.cruces.map((c, i) => (
        <group key={i}>
          <Block pos={[-2.4 + i * 4.8, 1.2, 0]} size={[3.5, 0.2, 5]} color="#545b65" mat="asphalt" solid={false} />
          <Ball pos={[-2.4 + i * 4.8, 2.8, -1]} r={0.4} color={c.ocupado > 0 ? '#ffca42' : '#44da83'} mat="neon" />
          <Label
            pos={[-2.4 + i * 4.8, 3.5, 0]}
            text={`${i + 1}: ${c.ocupado > 0 ? 'OCUPADO' : c.sentido === 0 ? 'SALIDA' : 'ENTRADA'} ${m.datos.elegido === i ? '◀' : ''}`}
            h={0.3}
          />
          {c.colas.map((n, j) => (
            <group key={j}>
              {Array.from({ length: Math.min(n, 9) }, (_, k) => (
                <P.Car
                  key={k}
                  pos={[-3.2 + i * 4.8 + j * 1.4, 1.3, 2 - k * 0.4]}
                  scale={0.17}
                  color={j ? '#ffc857' : '#5ac8ed'}
                  solid={false}
                />
              ))}
            </group>
          ))}
        </group>
      ))}
    </Mesa>
  ),
});
export const Repartidor = motor.Escena;
export const guia = motor.guia;
