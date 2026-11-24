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
  /** «Tegus pide otra gota»: plantón que capta menos, reparaciones y los dos depósitos comunicados */
  planton: boolean[];
  reparadas: number;
  depositos: [number, number];
};
type Param = { viento: number; margen: number; nombre: string; racion: boolean };
/** en la variante el agua viene racionada: solo dos infiltraciones abiertas y reparar la ladera cuesta agua */
const MAX_ABIERTAS = 2,
  COSTO_REPARAR = 30;
type Sesion = Motor<Param, Bosque>;
const niebla = (m: Sesion, i: number) => Math.sin(m.tiempo * m.parametros.viento + i * 1.7) * 2;
function infiltrar(m: Sesion) {
  const s = m.datos;
  if (m.parametros.racion && !s.abiertas[s.elegida] && s.abiertas.filter(Boolean).length >= MAX_ABIERTAS) {
    m.sumar(-3);
    return;
  }
  s.abiertas[s.elegida] = !s.abiertas[s.elegida];
}
/** reparar la ladera: la cárcava se vuelve plantón (capta a medias) y el agua racionada lo paga */
function reparar(m: Sesion) {
  const s = m.datos;
  if (!m.parametros.racion || s.vivas[s.elegida] || m.puntos < COSTO_REPARAR) return;
  m.sumar(-COSTO_REPARAR);
  s.vivas[s.elegida] = true;
  s.planton[s.elegida] = true;
  s.reparadas++;
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
      ['E', 'reparar la ladera (cuando el agua viene racionada)'],
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
    racion: p.tema.variante === 'tegus-pide-otra-gota',
  }),
  metas: (p) => [100 + Math.round(p.dif * 60), 220 + Math.round(p.dif * 60), 340 + Math.round(p.dif * 60)],
  duracion: () => 75,
  crear: (p): Bosque => ({
    cursor: cursorInicial(),
    direccion: 0,
    copas: [0, 0, 0],
    // en la variante la ladera llega erosionada: el árbol del medio es una cárcava
    vivas: p.racion ? [true, false, true] : [true, true, true],
    planton: [false, false, false],
    reparadas: 0,
    depositos: [0, 0],
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
      if (input.take('use')) reparar(m);
    }
    s.auto = false;
    s.copas.forEach((c, i) => {
      if (!s.vivas[i] || !s.abiertas[i]) return;
      const bien = Math.abs(c - niebla(m, i)) < m.parametros.margen;
      const gota = dt * (3 + s.ayuda) * (s.planton[i] ? 0.6 : 1);
      if (bien) {
        s.agua += gota;
        // depósitos comunicados: cada lado llena el suyo y el tubo empareja el más bajo
        s.depositos[i < 1 ? 0 : i > 1 ? 1 : s.depositos[0] <= s.depositos[1] ? 0 : 1] += gota;
      } else s.erosion += dt * 0.8;
    });
    const tubo = (s.depositos[0] - s.depositos[1]) * Math.min(1, dt * 0.5);
    s.depositos[0] -= tubo;
    s.depositos[1] += tubo;
    if (s.agua >= 1) {
      const n = Math.floor(s.agua);
      m.sumar(n);
      s.agua -= n;
    }
    if (s.erosion >= 1) {
      m.sumar(-2);
      s.erosion -= 1;
    }
    m.objetivo = m.parametros.racion
      ? s.vivas.every(Boolean)
        ? 'Agua racionada: solo dos infiltraciones abiertas · llená los dos depósitos'
        : `La ladera está erosionada · E repara la cárcava con ${COSTO_REPARAR} de agua`
      : 'Copas en la nube · cerrá la infiltración si queda descubierta';
    m.lineas = [
      `Árbol ${s.elegida + 1}${s.vivas[s.elegida] ? (s.planton[s.elegida] ? ' (plantón)' : '') : ' (cárcava)'} · ${s.abiertas[s.elegida] ? 'Infiltración abierta' : 'Infiltración cerrada'}`,
      m.parametros.racion
        ? `Depósitos ${Math.round(s.depositos[0])} ⇄ ${Math.round(s.depositos[1])} · F abre/cierra (máx. ${MAX_ABIERTAS}) · E repara`
        : 'W/S mueve · A/D elige · F abre/cierra · Q tala para siempre',
    ];
    m.stats = {
      arbol: s.elegida,
      abiertas: s.abiertas.filter(Boolean).length,
      vivas: s.vivas.filter(Boolean).length,
      captacion: m.puntos,
      copa: s.copas[s.elegida],
      reparadas: s.reparadas,
      depositos: Math.round(s.depositos[0] + s.depositos[1]),
    };
  },
  bot: (m, _dt, actor) => {
    const s = m.datos;
    if (actor === 'compa') {
      s.ayuda = 0.3;
      return;
    }
    s.auto = true;
    if (m.parametros.racion) {
      // primero repara la cárcava; después deja abiertas las dos copas que más captan
      const carcava = s.vivas.indexOf(false);
      if (carcava >= 0 && m.puntos >= COSTO_REPARAR) {
        s.elegida = carcava;
        reparar(m);
      }
      s.copas.forEach((_, i) => {
        s.copas[i] = niebla(m, i);
      });
      const mejores = [0, 1, 2]
        .filter((i) => s.vivas[i])
        .sort((a, b) => +s.planton[a] - +s.planton[b])
        .slice(0, 2);
      s.abiertas = [0, 1, 2].map((i) => mejores.includes(i));
      return;
    }
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
          <Ball
            pos={[-3 + i * 3, 2.8, c]}
            r={m.datos.planton[i] ? 0.4 : 0.65}
            color={m.datos.vivas[i] ? '#39975b' : '#594d3e'}
            mat="leaf"
          />
          <Ball pos={[-3 + i * 3, 3.4, niebla(m, i)]} r={0.5} color="#edf7fa" mat="cloth" />
          <Label
            pos={[-3 + i * 3, 1.8, 3]}
            text={`${i + 1} ${m.datos.abiertas[i] ? 'ABIERTO' : 'CERRADO'}${m.datos.elegida === i ? ' ◀' : ''}`}
            h={0.26}
          />
        </group>
      ))}
      {m.parametros.racion ? (
        <>
          {m.datos.depositos.map((d, i) => (
            <group key={i}>
              <Block pos={[-2.2 + i * 4.4, 1.1, 4]} size={[1.6, 0.9, 0.9]} color="#8b9aa3" mat="stone" solid={false} />
              <Block
                pos={[-2.2 + i * 4.4, 0.75 + Math.min(0.75, d / 260), 4]}
                size={[1.4, Math.max(0.05, Math.min(1.5, d / 130)), 0.7]}
                color="#47afd1"
                mat="water"
                solid={false}
              />
            </group>
          ))}
          <Block pos={[0, 0.85, 4]} size={[2.8, 0.18, 0.18]} color="#5d6b72" mat="metal" solid={false} />
          <Label pos={[0, 1.4, 4.6]} text="Depósitos comunicados" h={0.24} />
        </>
      ) : (
        <Block pos={[0, 1.2, 4]} size={[6, 0.3, 0.5]} color="#47afd1" mat="water" solid={false} />
      )}
    </Mesa>
  ),
});
export const Niebla = motor.Escena;
export const guia = motor.guia;
