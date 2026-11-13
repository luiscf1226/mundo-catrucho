import { input } from '../../../core/input';
import { Ball, Block, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { cursorInicial, Mesa, movioPuntero } from './Mesa';

type Bosque = {
  cursor: ReturnType<typeof cursorInicial>;
  direccion: number;
  copas: number[];
  vivas: boolean[];
  elegida: number;
  agua: number;
  erosion: number;
  abiertas: boolean[];
  auto: boolean;
  ayuda: number;
};
type Param = { viento: number; margen: number; nombre: string };
type Sesion = Motor<Param, Bosque>;
const niebla = (m: Sesion, i: number) => Math.sin(m.tiempo * m.parametros.viento + i * 1.7) * 2;
function infiltrar(m: Sesion) {
  const s = m.datos;
  s.abiertas[s.elegida] = !s.abiertas[s.elegida];
}
const motor = defineMotor({
  id: 'franciscomorazan.niebla',
  modos: { duo: { tipo: 'apoyo' }, abierto: { tipo: 'ambiente', bots: 3 } },
  guia: {
    goal: 'Mové las copas bajo la niebla y abrí infiltraciones con F. Cuidá la ladera.',
    keys: [
      ['A / D', 'elegir árbol'],
      ['W / S', 'mover copa'],
      ['Mouse / stick derecho', 'elegir árbol y arrastrar copa'],
      ['F / clic', 'abrir o cerrar infiltración'],
      ['Q', 'talar (irreversible)'],
    ],
    touch: [
      ['Palanca', 'elegir y mover copa'],
      ['Arrastrá', 'ubicar copa'],
      ['🎯', 'abrir infiltración'],
    ],
  },
  etapa: (p) => ({
    viento: 0.3 + p.dif * 0.35,
    margen: 1.15 - p.dif * 0.4,
    nombre: typeof p.tema.nombre === 'string' ? p.tema.nombre : 'Agua de La Tigra',
  }),
  metas: (p) => [100 + Math.round(p.dif * 60), 220 + Math.round(p.dif * 60), 340 + Math.round(p.dif * 60)],
  duracion: () => 75,
  crear: (): Bosque => ({
    cursor: cursorInicial(),
    direccion: 0,
    copas: [0, 0, 0],
    vivas: [true, true, true],
    elegida: 0,
    agua: 0,
    erosion: 0,
    abiertas: [false, false, false],
    auto: false,
    ayuda: 0,
  }),
  actualizar: (m, dt) => {
    const s = m.datos;
    const puntero = movioPuntero(s.cursor);
    if (!s.auto) {
      const direccion = Math.sign(input.mx);
      if (direccion !== 0 && s.direccion === 0) s.elegida = Math.max(0, Math.min(2, s.elegida + direccion));
      s.direccion = direccion;
      if (puntero) s.elegida = Math.max(0, Math.min(2, Math.round(input.px + 1)));
      if (puntero) s.copas[s.elegida] = Math.max(-2, Math.min(2, -input.py * 2));
      else s.copas[s.elegida] = Math.max(-2, Math.min(2, s.copas[s.elegida] - input.mz * dt * 2));
      if (input.take('fire')) infiltrar(m);
      if (input.take('alt')) s.vivas[s.elegida] = false;
    }
    s.auto = false;
    s.copas.forEach((c, i) => {
      if (!s.vivas[i] || !s.abiertas[i]) return;
      const bien = Math.abs(c - niebla(m, i)) < m.parametros.margen;
      if (bien) s.agua += dt * (3 + s.ayuda);
      else s.erosion += dt * 0.8;
    });
    if (s.agua >= 1) {
      const n = Math.floor(s.agua);
      m.sumar(n);
      s.agua -= n;
    }
    if (s.erosion >= 1) {
      m.sumar(-2);
      s.erosion -= 1;
    }
    m.objetivo = 'Copas en la nube · cerrá la infiltración si queda descubierta';
    m.lineas = [
      `Árbol ${s.elegida + 1} · ${s.abiertas[s.elegida] ? 'Infiltración abierta' : 'Infiltración cerrada'}`,
      'W/S mueve · A/D elige · F abre/cierra · Q tala para siempre',
    ];
    m.stats = {
      arbol: s.elegida,
      abiertas: s.abiertas.filter(Boolean).length,
      vivas: s.vivas.filter(Boolean).length,
      captacion: m.puntos,
      copa: s.copas[s.elegida],
    };
  },
  bot: (m, _dt, actor) => {
    const s = m.datos;
    if (actor === 'compa') {
      s.ayuda = 0.3;
      return;
    }
    s.auto = true;
    s.copas.forEach((_, i) => {
      s.copas[i] = niebla(m, i);
      if (!s.abiertas[i]) {
        s.elegida = i;
        infiltrar(m);
      }
    });
  },
  Escena: ({ motor: m }: { motor: Sesion }) => (
    <Mesa nombre={m.parametros.nombre} aviso="Seguí la nube blanca · F abre el paso al depósito">
      {m.datos.copas.map((c, i) => (
        <group key={i}>
          <Block pos={[-3 + i * 3, 1.3, 0]} size={[0.2, 0.6, 5]} color="#a2825b" mat="dirt" solid={false} />
          <Block pos={[-3 + i * 3, 2, c]} size={[0.2, 1.5, 0.2]} color="#89623e" mat="wood" solid={false} />
          <Ball pos={[-3 + i * 3, 2.8, c]} r={0.65} color={m.datos.vivas[i] ? '#39975b' : '#594d3e'} mat="leaf" />
          <Ball pos={[-3 + i * 3, 3.4, niebla(m, i)]} r={0.5} color="#edf7fa" mat="cloth" />
          <Label
            pos={[-3 + i * 3, 1.8, 3]}
            text={`${i + 1} ${m.datos.abiertas[i] ? 'ABIERTO' : 'CERRADO'}${m.datos.elegida === i ? ' ◀' : ''}`}
            h={0.26}
          />
        </group>
      ))}
      <Block pos={[0, 1.2, 4]} size={[6, 0.3, 0.5]} color="#47afd1" mat="water" solid={false} />
    </Mesa>
  ),
});
export const Niebla = motor.Escena;
export const guia = motor.guia;
