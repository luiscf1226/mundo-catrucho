import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { cursorInicial, Mesa, movioPuntero } from './Mesa';

type Masa = {
  cursor: ReturnType<typeof cursorInicial>;
  izq: number;
  der: number;
  auto: boolean;
  buenas: number;
  rotas: number;
  espera: number;
  ayuda: number;
};
type Param = { velocidad: number; margen: number; nombre: string };
type Sesion = Motor<Param, Masa>;
const frijol = (m: Sesion) => Math.sin(m.tiempo * m.parametros.velocidad) * 0.18;
function servir(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  const centro = frijol(m);
  const buena =
    Math.abs(s.izq - (0.65 + centro)) < m.parametros.margen &&
    Math.abs(s.der - (0.65 - centro)) < m.parametros.margen &&
    s.izq + s.der < 1.65;
  m.sumar(buena ? 35 : -15);
  if (buena) s.buenas++;
  else s.rotas++;
  s.izq = s.der = 0;
  s.espera = 0.8;
}
const motor = defineMotor({
  id: 'franciscomorazan.baleada',
  guia: {
    goal: 'Doblá ambos bordes siguiendo los frijoles. Dejá abertura y serví con F; si jalás de más, rompés la masa.',
    keys: [
      ['A / D', 'doblar borde izquierdo / derecho'],
      ['W / S', 'aflojar izquierdo / derecho'],
      ['Mouse / stick derecho', 'posición horizontal elige borde, vertical lo dobla'],
      ['F / clic', 'servir'],
    ],
    touch: [
      ['Palanca', 'doblar bordes'],
      ['Arrastrá', 'elegir borde y doblarlo'],
      ['🎯', 'servir'],
    ],
  },
  etapa: (p) => ({
    velocidad: 1 + p.dif * 1.5,
    margen: 0.23 - p.dif * 0.12,
    nombre: typeof p.tema.nombre === 'string' ? p.tema.nombre : 'Origami de baleada',
  }),
  metas: (p) => [100 + Math.round(p.dif * 80), 220 + Math.round(p.dif * 80), 340 + Math.round(p.dif * 80)],
  duracion: () => 70,
  crear: (): Masa => ({
    cursor: cursorInicial(),
    izq: 0,
    der: 0,
    auto: false,
    buenas: 0,
    rotas: 0,
    espera: 0,
    ayuda: 0,
  }),
  actualizar: (m, dt) => {
    const s = m.datos;
    s.espera = Math.max(0, s.espera - dt);
    const puntero = movioPuntero(s.cursor);
    if (!s.auto && s.espera === 0) {
      s.izq = Math.max(0, s.izq + Math.max(0, -input.mx) * dt - Math.max(0, -input.mz) * dt);
      s.der = Math.max(0, s.der + Math.max(0, input.mx) * dt - Math.max(0, input.mz) * dt);
      if (puntero) {
        const v = Math.max(0, Math.min(1.2, (1 - input.py) * 0.6));
        if (input.px < 0) s.izq = v;
        else s.der = v;
      }
      if (input.take('fire')) servir(m);
    }
    s.auto = false;
    if (s.izq > 1.05 + s.ayuda || s.der > 1.05 + s.ayuda) {
      m.sumar(-15);
      s.rotas++;
      s.izq = s.der = 0;
      s.espera = 0.8;
    }
    const c = frijol(m);
    m.objetivo = 'Ajustá cada borde a su meta y serví';
    m.lineas = [
      `Izquierdo ${Math.round(s.izq * 100)}% / meta ${Math.round((0.65 + c) * 100)}%`,
      `Derecho ${Math.round(s.der * 100)}% / meta ${Math.round((0.65 - c) * 100)}% · Buenas ${s.buenas} · Rotas ${s.rotas}`,
    ];
    m.stats = { buenas: s.buenas, rotas: s.rotas, izq: s.izq, der: s.der };
  },
  bot: (m, _dt, actor) => {
    const s = m.datos;
    if (actor === 'compa') {
      s.ayuda = 0.05;
      return;
    }
    s.auto = true;
    if (s.espera > 0) return;
    s.izq = 0.65 + frijol(m);
    s.der = 0.65 - frijol(m);
    servir(m);
  },
  Escena: ({ motor: m }: { motor: Sesion }) => (
    <Mesa nombre={m.parametros.nombre} aviso="Encerrá los frijoles · Dejá la boca abierta">
      <Cyl pos={[0, 1.1, 0]} r={2.7} h={0.12} color="#edcf96" mat="sand" solid={false} />
      {[-1, 1].map((lado, i) => (
        <group key={lado} position={[lado * 2, 1.2, 0]} rotation-z={lado * (i ? m.datos.der : m.datos.izq) * 1.7}>
          <Block pos={[0, 0.2, 0]} size={[1.6, 0.12, 3.4]} color="#f4dba4" mat="sand" solid={false} />
        </group>
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Ball
          key={i}
          pos={[Math.sin(i * 2 + m.tiempo * m.parametros.velocidad) * 0.5, 1.4, (i - 2.5) * 0.35]}
          r={0.16}
          color="#603721"
          mat="dirt"
        />
      ))}
      <Label
        pos={[0, 2.5, 3]}
        text={
          m.datos.espera > 0
            ? 'Preparando tortilla…'
            : `Pliegues ${Math.round(m.datos.izq * 100)}% / ${Math.round(m.datos.der * 100)}%`
        }
        h={0.35}
      />
    </Mesa>
  ),
});
export const Baleada = motor.Escena;
export const guia = motor.guia;
