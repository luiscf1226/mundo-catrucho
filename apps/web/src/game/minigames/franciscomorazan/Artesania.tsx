import { input } from '../../../core/input';
import { Block, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { cursorInicial, Mesa, movioPuntero } from './Mesa';

type Caja = {
  cursor: ReturnType<typeof cursorInicial>;
  holguras: number[];
  giro: number;
  inclinacion: number;
  pieza: number;
  apoyadas: number;
  espera: number;
  auto: boolean;
  rotas: number;
  ayuda: number;
};
type Param = { margen: number; vibracion: number; nombre: string };
type Sesion = Motor<Param, Caja>;
const objetivo = (s: Caja) => ({
  giro: ((s.pieza % 4) * Math.PI) / 2,
  inclinacion: s.pieza % 2 === 0 ? 0 : Math.PI / 2,
});
const distancia = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
function encajar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  const o = objetivo(s);
  const holgura = Math.max(distancia(s.giro, o.giro), distancia(s.inclinacion, o.inclinacion));
  if (holgura < 0.8) {
    s.holguras.push(holgura);
    s.pieza++;
    s.espera = 0.6;
    if (s.holguras.length === 3) {
      const sueltas = s.holguras.filter((h) => h > m.parametros.margen + s.ayuda).length;
      s.rotas += sueltas;
      s.apoyadas += 3 - sueltas;
      m.sumar(sueltas === 0 ? 50 : -15 * sueltas);
      s.holguras = [];
      s.espera = m.parametros.vibracion;
    }
  } else {
    m.sumar(-15);
    s.rotas++;
    s.espera = 1;
  }
  s.giro = s.inclinacion = 0;
}
const motor = defineMotor({
  id: 'franciscomorazan.artesania',
  guia: {
    goal: 'Girá cada pieza hasta alinear los dos ejes del hueco. F la apoya. Cada tres piezas, la caja pasa la prueba de vibración.',
    keys: [
      ['A / D', 'girar horizontalmente'],
      ['W / S', 'inclinar'],
      ['Mouse / stick derecho', 'orientar los dos ejes'],
      ['F / clic', 'apoyar pieza y probar tapa'],
    ],
    touch: [
      ['Palanca / arrastrá', 'orientar pieza'],
      ['🎯', 'apoyar y probar tapa'],
    ],
  },
  etapa: (p) => ({
    margen: 0.35 - p.dif * 0.2,
    vibracion: 1 + p.dif,
    nombre: typeof p.tema.nombre === 'string' ? p.tema.nombre : 'Caja de Valle de Ángeles',
  }),
  metas: (p) => [100 + Math.round(p.dif * 100), 200 + Math.round(p.dif * 100), 350 + Math.round(p.dif * 100)],
  duracion: () => 75,
  crear: (): Caja => ({
    holguras: [],
    cursor: cursorInicial(),
    giro: 0,
    inclinacion: 0,
    pieza: 0,
    apoyadas: 0,
    espera: 0,
    auto: false,
    rotas: 0,
    ayuda: 0,
  }),
  actualizar: (m, dt) => {
    const s = m.datos;
    s.espera = Math.max(0, s.espera - dt);
    const puntero = movioPuntero(s.cursor);
    if (!s.auto) {
      s.giro += input.mx * dt * 2;
      s.inclinacion -= input.mz * dt * 2;
      if (puntero) {
        s.giro = (input.px + 1) * Math.PI;
        s.inclinacion = -input.py * Math.PI;
      }
      if (input.take('fire')) encajar(m);
    }
    s.auto = false;
    const o = objetivo(s);
    m.objetivo = 'Alineá la pieza con la silueta verde antes de apoyarla';
    m.lineas = [
      `Giro ${Math.round((s.giro * 180) / Math.PI)}° / ${(o.giro * 180) / Math.PI}° · Inclinación ${Math.round((s.inclinacion * 180) / Math.PI)}° / ${(o.inclinacion * 180) / Math.PI}°`,
      `Apoyadas ${s.apoyadas} · Rotas ${s.rotas} · ${s.espera > 0 ? 'Probando empaque…' : 'F para encajar'}`,
    ];
    m.stats = { apoyadas: s.apoyadas, rotas: s.rotas, giro: s.giro, inclinacion: s.inclinacion };
  },
  bot: (m, _dt, actor) => {
    const s = m.datos;
    if (actor === 'compa') {
      s.ayuda = 0.03;
      return;
    }
    s.auto = true;
    const o = objetivo(s);
    s.giro = o.giro;
    s.inclinacion = o.inclinacion;
    encajar(m);
  },
  Escena: ({ motor: m }: { motor: Sesion }) => {
    const s = m.datos,
      o = objetivo(s);
    return (
      <Mesa nombre={m.parametros.nombre} aviso="Pieza de madera a la izquierda · Hueco a la derecha">
        {[-2, 2].map((x, i) => (
          <group key={x} position={[x, 2.2, 0]} rotation={[i ? o.inclinacion : s.inclinacion, i ? o.giro : s.giro, 0]}>
            <Block pos={[0, 0, 0]} size={[1.7, 0.4, 0.5]} color={i ? '#57cc99' : '#c58c50'} mat="wood" solid={false} />
            <Block
              pos={[-0.65, 0.4, 0]}
              size={[0.4, 0.8, 0.5]}
              color={i ? '#57cc99' : '#c58c50'}
              mat="wood"
              solid={false}
            />
          </group>
        ))}
        {s.holguras.map((h, i) => (
          <Block
            key={i}
            pos={[1 + i * 0.65, 1.5, 1]}
            size={[0.5, 0.3, 0.8]}
            color={h > m.parametros.margen ? '#e5a15b' : '#57cc99'}
            mat="wood"
            solid={false}
          />
        ))}
        <Block pos={[2, 1.2, 0]} size={[3, 0.3, 3]} color="#8c5936" mat="wood" solid={false} />
        <Label
          pos={[0, 2.6, 3]}
          text={
            s.espera > 0 ? 'Probando vibración y apoyo…' : `Pieza ${s.pieza + 1} · ${s.holguras.length}/3 en la caja`
          }
          h={0.35}
        />
      </Mesa>
    );
  },
});
export const Artesania = motor.Escena;
export const guia = motor.guia;
