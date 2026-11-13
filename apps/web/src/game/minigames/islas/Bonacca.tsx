import { input } from '../../../core/input';
import { Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { acercar, CasaPilotes, cursor, Isla, Laguna, Lancha, loco, Muelle, moverCursor, texto } from './comun';

const CASAS = [
  { x: -5.6, balcon: 1.5, color: '#7fd1c7', techo: '#c0392b' },
  { x: -2.8, balcon: 2.3, color: '#ffd166', techo: '#2a6f97' },
  { x: 0, balcon: 1.8, color: '#f4a3b5', techo: '#3a7d44' },
  { x: 2.8, balcon: 2.7, color: '#a5c8ff', techo: '#c0392b' },
];
const BODEGA = -8.2;
type Estado = {
  c: ReturnType<typeof cursor>;
  bx: number;
  gancho: number;
  carga: boolean;
  destino: number;
  azar: () => number;
  ayuda: boolean;
  entregas: number;
  mojados: number;
  equivocadas: number;
  intentos: number;
  aviso: string;
};
type Param = { marea: number; ritmo: number; tolerancia: number; loco: boolean; nombre: string; semilla: number };
type Sesion = Motor<Param, Estado>;
const marea = (m: Sesion, t = m.tiempo) => 0.55 + m.parametros.marea * (0.5 + 0.5 * Math.sin(t * m.parametros.ritmo));
const balcon = (m: Sesion, i: number, t = m.tiempo) =>
  CASAS[i].balcon + (m.parametros.loco ? Math.sin(t * 0.9 + i * 1.7) * 0.55 : 0);
const alturaGancho = (m: Sesion) => marea(m) + 0.4 + m.datos.gancho;

function entregar(m: Sesion) {
  const s = m.datos;
  s.intentos++;
  if (!s.carga) {
    s.aviso = 'No llevás paquete: pasá por la bodega (a la izquierda).';
    return;
  }
  const i = CASAS.findIndex((c) => Math.abs(c.x - s.bx) < 0.8);
  if (i < 0) {
    s.aviso = 'Acercá la lancha frente a una casa.';
    return;
  }
  if (i !== s.destino) {
    s.equivocadas++;
    m.sumar(-5);
    s.aviso = `Esa es la ${i + 1}; el paquete va a la ${s.destino + 1}.`;
    return;
  }
  const dif = alturaGancho(m) - balcon(m, i);
  const tol = m.parametros.tolerancia + (s.ayuda ? 0.06 : 0);
  if (Math.abs(dif) <= tol) {
    s.entregas++;
    m.sumar(40);
    s.carga = false;
    s.aviso = m.parametros.loco
      ? '¡Devolución recogida! Llevala a la bodega.'
      : '¡Entregado en la puerta! Volvé por otro.';
  } else {
    s.mojados++;
    m.sumar(-15);
    s.carga = false;
    s.aviso =
      dif < 0 ? 'Muy bajo: el paquete se mojó. La marea manda.' : 'Muy alto: chocó con el alero y cayó al agua.';
  }
}
const motor = defineMotor({
  id: 'islas.bonacca',
  modos: { duo: { tipo: 'apoyo' }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'mar',
  guia: {
    goal: 'Cargá en la bodega, llevá la lancha a la casa marcada y ajustá el gancho a su balcón según la marea.',
    keys: [
      ['A / D', 'mover la lancha por el canal'],
      ['W / S', 'subir o bajar el gancho'],
      ['Mouse / stick derecho', 'lancha (←→) y gancho (↑↓)'],
      ['F / clic / RT', 'entregar en el balcón'],
    ],
    touch: [
      ['Palanca / arrastrá', 'lancha y gancho'],
      ['🎯', 'entregar'],
    ],
  },
  etapa: (p) => ({
    marea: 0.35 + p.dif * 0.55,
    ritmo: 0.35 + p.dif * 0.4,
    tolerancia: 0.32 - p.dif * 0.14,
    loco: loco(p),
    nombre: texto(p.tema.nombre, 'Paquetes por canales'),
    semilla: p.seed,
  }),
  metas: (p) => [120 + Math.round(p.dif * 80), 260 + Math.round(p.dif * 80), 400 + Math.round(p.dif * 80)],
  duracion: (p) => 80 + Math.round(p.dif * 15),
  crear: (p): Estado => {
    const azar = rng(p.semilla);
    return {
      c: { ...cursor(), x: -0.9, y: -0.4 },
      bx: BODEGA,
      gancho: 0.8,
      carga: true,
      destino: Math.floor(azar() * CASAS.length),
      azar,
      ayuda: false,
      entregas: 0,
      mojados: 0,
      equivocadas: 0,
      intentos: 0,
      aviso: 'Llevá el paquete a la casa marcada con 📦.',
    };
  },
  actualizar: (m, dt) => {
    const s = m.datos;
    moverCursor(s.c, dt, 0.9);
    const meta = -8.2 + ((s.c.x + 1) / 2) * 11.4;
    s.bx = acercar(s.bx, meta, 2.6 * dt);
    s.gancho = Math.max(0, Math.min(2.6, 0.2 + ((s.c.y + 1) / 2) * 2.4));
    if (!s.carga && s.bx < BODEGA + 0.6) {
      s.carga = true;
      let d = Math.floor(s.azar() * CASAS.length);
      if (d === s.destino) d = (d + 1) % CASAS.length;
      s.destino = d;
      s.aviso = `Paquete cargado para la casa ${d + 1}.`;
    }
    if (input.take('fire')) entregar(m);
    s.ayuda = false;
    const dif = alturaGancho(m) - balcon(m, s.destino);
    m.objetivo = s.aviso;
    m.lineas = [
      s.carga
        ? `Casa ${s.destino + 1} · gancho ${dif > 0 ? 'alto' : 'bajo'} por ${Math.abs(dif).toFixed(2)} m`
        : 'Sin paquete: volvé a la bodega',
      `Entregas ${s.entregas} · Mojados ${s.mojados} · Marea ${marea(m).toFixed(2)} m`,
    ];
    m.stats = { entregas: s.entregas, mojados: s.mojados, equivocadas: s.equivocadas, intentos: s.intentos };
  },
  bot: (m, _dt, actor) => {
    const s = m.datos;
    if (actor === 'compa') {
      s.ayuda = true;
      return;
    }
    const x = s.carga ? CASAS[s.destino].x : BODEGA;
    const gancho = s.carga ? balcon(m, s.destino) - marea(m) - 0.4 : 1;
    s.c.x = Math.max(-1, Math.min(1, ((x + 8.2) / 11.4) * 2 - 1));
    s.c.y = Math.max(-1, Math.min(1, ((gancho - 0.2) / 2.4) * 2 - 1));
    s.c.auto = true;
    if (
      s.carga &&
      Math.abs(s.bx - x) < 0.3 &&
      Math.abs(alturaGancho(m) - balcon(m, s.destino)) < m.parametros.tolerancia * 0.6
    )
      entregar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    const p = m.parametros;
    const agua = marea(m);
    const g = alturaGancho(m);
    return (
      <Isla nombre={p.nombre} aviso="A/D lancha · W/S gancho · F entrega en el balcón">
        <Laguna ancho={14} largo={7.5} x={-2.4} z={-1.6} color="#2b9fb6" />
        <Block
          pos={[-2.4, agua / 2, -1.6]}
          size={[14, agua, 7.5]}
          color="#2b9fb6"
          mat="water"
          solid={false}
          cast={false}
        />
        <Muelle letrero="Bonacca · canal del pueblo" />
        <Block pos={[-2.4, 0.12, 1.9]} size={[14, 0.24, 0.9]} color="#a7794a" mat="wood" solid={false} />
        {CASAS.map((c, i) => (
          <CasaPilotes
            key={i}
            x={c.x}
            balcon={balcon(m, i)}
            color={c.color}
            techo={c.techo}
            numero={i + 1}
            activa={s.carga && s.destino === i}
          />
        ))}
        {p.loco &&
          CASAS.map((c, i) => (
            <Block
              key={i}
              pos={[c.x, balcon(m, i) / 2, -2.7]}
              size={[1.4, balcon(m, i), 0.05]}
              color="#c8a97e"
              mat="cloth"
              solid={false}
              cast={false}
            />
          ))}
        <group position={[BODEGA, 0, -3.2]}>
          <Block pos={[0, 1.4, -0.3]} size={[1.8, 1.6, 1.4]} color="#8a6a45" mat="wood" solid={false} />
          <Block pos={[0, 2.35, -0.3]} size={[2.1, 0.25, 1.7]} color="#5b6b73" mat="metal" solid={false} />
          {[-0.5, 0.4].map((x) => (
            <Block key={x} pos={[x, 0.75, 0.6]} size={[0.6, 0.5, 0.5]} color="#c49a6c" mat="cloth" solid={false} />
          ))}
          <Label pos={[0, 3, 0]} text="Bodega" h={0.32} bg="#5b3a24" />
        </group>
        <group position={[-7, 0, 1.1]}>
          <Cyl pos={[0, 1.5, 0]} r={0.08} h={3} color="#f4f1e8" mat="wood" solid={false} />
          {[0.5, 1, 1.5, 2].map((y) => (
            <Block
              key={y}
              pos={[0.12, y, 0]}
              size={[0.18, 0.04, 0.04]}
              color="#d1495b"
              mat="plastic"
              solid={false}
              cast={false}
            />
          ))}
          <Label pos={[0, 3.3, 0]} text={`Marea ${agua.toFixed(2)} m`} h={0.24} bg="#14627a" />
        </group>
        <group position={[s.bx, agua - 0.15, -1.3]}>
          <Lancha pos={[0, 0, 0]} toldo={false} color="#e9dcc3" franja="#2a6f97" />
          <Cyl pos={[-0.6, 1.5, 0]} r={0.06} h={3} color="#5d4630" mat="wood" solid={false} />
          <Block pos={[-0.2, 3, -0.75]} size={[0.1, 0.1, 1.6]} color="#5d4630" mat="wood" solid={false} />
        </group>
        <Cyl
          pos={[s.bx - 0.2, (g + agua + 2.85) / 2, -2.05]}
          r={0.02}
          h={Math.max(0.1, agua + 2.85 - g)}
          color="#2b2b2b"
          solid={false}
          cast={false}
        />
        {s.carga && (
          <group position={[s.bx - 0.2, g + 0.1, -2.05]}>
            <Block pos={[0, -0.22, 0]} size={[0.55, 0.42, 0.45]} color="#c49a6c" mat="cloth" solid={false} />
            <Block
              pos={[0, -0.22, 0]}
              size={[0.57, 0.08, 0.47]}
              color="#f4f1e8"
              mat="cloth"
              solid={false}
              cast={false}
            />
          </group>
        )}
        <Label
          pos={[s.bx, agua + 3, -1.3]}
          text={s.carga ? `📦 → ${s.destino + 1}` : 'a la bodega'}
          h={0.28}
          bg="#d1495b"
        />
      </Isla>
    );
  },
});
export const Bonacca = motor.Escena;
export const guia = motor.guia;
