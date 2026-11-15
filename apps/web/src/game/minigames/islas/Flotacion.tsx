import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { Coral, Isla, Laguna, Muelle, Pez, texto } from './comun';

const SUP = 4.3;
const ESC = 0.38;
const FONDO = 9.6;
const yDe = (d: number) => SUP - d * ESC;
type Estado = {
  d: number;
  w: number;
  aire: number;
  pulmon: number;
  chaleco: number;
  resp: number;
  px: number;
  py: number;
  puntero: boolean;
  auto: boolean;
  meta: number;
  estable: number;
  espera: number;
  ruido: number;
  calma: number;
  azar: () => number;
  fotos: number;
  movidas: number;
  rapidas: number;
  fondos: number;
  aviso: string;
};
type Param = { peso: number; tolerancia: number; corriente: number; nombre: string; semilla: number };
type Sesion = Motor<Param, Estado>;

function reiniciar(s: Estado) {
  s.d = 3;
  s.w = 0;
  s.aire = 0.28;
  s.estable = 0;
}
function foto(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  const bien = Math.abs(s.d - s.meta) < m.parametros.tolerancia && Math.abs(s.w) < 0.16;
  if (bien && s.estable >= 1) {
    s.fotos++;
    m.sumar(30);
    s.espera = 1.5;
    s.estable = 0;
    s.meta = 3.5 + Math.round(s.azar() * 8) / 2;
    s.aviso = `¡Toma horizontal y estable! Siguiente: ${s.meta.toFixed(1)} m.`;
  } else {
    s.movidas++;
    s.espera = 0.6;
    s.aviso = bien ? 'Casi: quedate quieto un ratito más.' : `Foto movida. La toma es a ${s.meta.toFixed(1)} m.`;
  }
}
const motor = defineMotor({
  id: 'islas.flotacion',
  modos: { duo: { tipo: 'apoyo' }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'mar',
  guia: {
    goal: 'Con poquito aire en el chaleco y respiración pareja, quedate quieto a la profundidad pedida y tomá la foto.',
    keys: [
      ['W / S', 'inflar o desinflar el chaleco'],
      ['D / A', 'inhalar hondo o soltar el aire'],
      ['Mouse / stick derecho', 'chaleco (↑↓) y respiración (←→)'],
      ['F / clic / RT', 'tomar la foto'],
    ],
    touch: [
      ['Palanca / arrastrá', 'chaleco y respiración'],
      ['🎯', 'tomar la foto'],
    ],
  },
  etapa: (p) => ({
    peso: 0.32,
    tolerancia: 0.75 - p.dif * 0.3,
    corriente: 0.04 + p.dif * 0.12,
    nombre: texto(p.tema.nombre, 'Trimado de buceo'),
    semilla: p.seed,
  }),
  metas: (p) => [100 + Math.round(p.dif * 60), 220 + Math.round(p.dif * 60), 340 + Math.round(p.dif * 60)],
  duracion: (p) => 80 + Math.round(p.dif * 15),
  crear: (p): Estado => ({
    d: 3,
    w: 0,
    aire: 0.28,
    pulmon: 0.5,
    chaleco: 0,
    resp: 0,
    px: input.px,
    py: input.py,
    puntero: false,
    auto: false,
    meta: 5,
    estable: 0,
    espera: 0,
    ruido: 0,
    calma: 0,
    azar: rng(p.semilla),
    fotos: 0,
    movidas: 0,
    rapidas: 0,
    fondos: 0,
    aviso: 'Bajá despacio hasta la marca y quedate quieto.',
  }),
  actualizar: (m, dt) => {
    const s = m.datos;
    const p = m.parametros;
    if (input.px !== s.px || input.py !== s.py) s.puntero = true;
    if (input.mx || input.mz) s.puntero = false;
    s.px = input.px;
    s.py = input.py;
    if (!s.auto) {
      const zona = (v: number) => (Math.abs(v) > 0.25 ? Math.sign(v) : 0);
      s.chaleco = s.puntero ? zona(input.py) : -input.mz;
      s.resp = s.puntero ? zona(input.px) : input.mx;
    }
    s.auto = false;
    if (input.take('fire')) foto(m);
    s.aire = Math.max(0, Math.min(1, s.aire + s.chaleco * dt * (s.chaleco > 0 ? 0.22 : 0.32)));
    const respira = 0.5 + 0.35 * Math.sin(m.tiempo * 1.25);
    s.pulmon += ((s.resp ? 0.5 + s.resp * 0.5 : respira) - s.pulmon) * Math.min(1, dt * 2.5);
    s.chaleco = 0;
    s.resp = 0;
    s.ruido += ((s.azar() - 0.5) * 2 * p.corriente - s.ruido) * Math.min(1, dt * 0.8);
    const empuje = s.aire / (1 + s.d / 10) + s.pulmon * 0.16;
    const acel = p.peso - empuje + s.ruido * (1 - s.calma * 0.5);
    s.w += acel * dt * 0.9;
    s.w -= s.w * 0.8 * dt;
    s.d += s.w * dt;
    s.calma = 0;
    s.espera = Math.max(0, s.espera - dt);
    const quieto = Math.abs(s.d - s.meta) < p.tolerancia && Math.abs(s.w) < 0.16;
    s.estable = quieto ? s.estable + dt : 0;
    if (s.w < -0.55 || s.d < 0.3) {
      s.rapidas++;
      m.sumar(-15);
      s.aviso = 'Subiste muy rápido: toma cancelada. Soltá aire del chaleco.';
      reiniciar(s);
    } else if (s.d >= FONDO) {
      s.fondos++;
      m.sumar(-15);
      s.aviso = 'Tocaste el fondo: el coral no se pisa. Toma cancelada.';
      reiniciar(s);
    }
    m.objetivo = s.aviso;
    m.lineas = [
      `Profundidad ${s.d.toFixed(1)} m · meta ${s.meta.toFixed(1)} m · ${s.w > 0.05 ? 'bajando' : s.w < -0.05 ? 'subiendo' : 'quieto'}`,
      `Chaleco ${Math.round(s.aire * 100)}% · Fotos ${s.fotos}`,
    ];
    m.stats = {
      fotos: s.fotos,
      movidas: s.movidas,
      rapidas: s.rapidas,
      fondos: s.fondos,
      profundidad: s.d,
      aire: s.aire,
    };
  },
  bot: (m, _dt, actor) => {
    const s = m.datos;
    if (actor === 'compa') {
      s.calma = 1;
      return;
    }
    const p = m.parametros;
    // cuánto aire hace falta para frenar hacia la meta, igual que lo calcularía alguien con práctica
    const respira = s.pulmon * 0.16;
    const quiere = (s.meta - s.d) * 0.3 - s.w * 0.9;
    const necesita = (p.peso - respira - quiere) * (1 + s.d / 10);
    s.chaleco = s.aire < necesita - 0.015 ? 1 : s.aire > necesita + 0.015 ? -1 : 0;
    s.resp = 0;
    s.auto = true;
    if (s.estable >= 1.1) foto(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    const p = m.parametros;
    const t = m.tiempo;
    const y = yDe(s.d);
    const inclina = Math.max(-0.5, Math.min(0.5, -s.w * 0.8));
    const verde = Math.abs(s.d - s.meta) < p.tolerancia;
    return (
      <Isla nombre={p.nombre} aviso="W/S chaleco · A/D respiración · F foto estable">
        <Muelle letrero="West Bay · práctica de flotación" />
        <Laguna ancho={14} largo={3} x={-2.4} z={3} />
        {['#7fdbe6', '#3fb6d3', '#1f8fbf', '#14679a', '#0e4a78'].map((c, i) => (
          <Block
            key={c}
            pos={[-2.4, SUP - ((i + 0.5) * (SUP - 0.5)) / 5, -1.0]}
            size={[13.6, (SUP - 0.5) / 5 + 0.01, 0.2]}
            color={c}
            mat="plastic"
            solid={false}
            cast={false}
          />
        ))}
        <Block
          pos={[-2.4, SUP + 0.05, -0.2]}
          size={[13.8, 0.1, 1.8]}
          color="#e8fbff"
          mat="water"
          solid={false}
          cast={false}
        />
        <Block pos={[-2.4, 0.25, 0.0]} size={[13.6, 0.5, 2]} color="#ecd9a3" mat="sand" solid={false} />
        {[-8.2, -4, 0, 3.6].map((x) => (
          <Label key={x} pos={[x, SUP + 0.45, -0.2]} text="〰" h={0.3} bg="rgba(0,0,0,0)" fg="#ffffff" />
        ))}
        {[2, 4, 6, 8].map((d) => (
          <Label key={d} pos={[3.9, yDe(d), -0.8]} text={`${d} m`} h={0.2} bg="#0e4a78" />
        ))}
        {[-8, -6.4, -4.6, -1.2, 0.6, 2.4, 3.6].map((x, i) => (
          <Coral
            key={x}
            pos={[x, 0.45, -0.4 + (i % 2) * 0.7]}
            tipo={['cerebro', 'cuerno', 'abanico', 'tubo'][i % 4]}
            color={['#e98d6b', '#d9b44a', '#a05bd1', '#f2a541'][i % 4]}
            s={1}
          />
        ))}
        <Block
          pos={[-2.4, yDe(s.meta), -0.85]}
          size={[13.4, p.tolerancia * 2 * ESC, 0.04]}
          color={verde ? '#7ae582' : '#ffd166'}
          mat="glass"
          solid={false}
          cast={false}
        />
        <Label pos={[-8.6, yDe(s.meta), -0.2]} text={`toma ${s.meta.toFixed(1)} m`} h={0.24} bg="#2a9d8f" />
        <Label pos={[-8.6, yDe(FONDO) + 0.3, 0.2]} text="fondo · no tocar" h={0.22} bg="#d1495b" />
        {[0, 1, 2, 3].map((i) => {
          const a = t * 0.6 + i * 1.6;
          return (
            <Pez
              key={i}
              pos={[-2.4 + Math.cos(a) * 5.5, 1.4 + i * 0.75, -0.6]}
              rot={Math.sin(a) > 0 ? Math.PI : 0}
              color={['#4cc9f0', '#ffd166', '#f28482', '#90e0ef'][i]}
              s={0.8}
            />
          );
        })}
        <group position={[-2.6, y, 0.2]} rotation-z={inclina}>
          <group scale={[1.6, 0.48, 0.55]}>
            <Ball pos={[0, 0, 0]} r={0.5} color="#1d3557" mat="cloth" />
          </group>
          <Block
            pos={[-0.05, 0.12, 0]}
            size={[0.6, 0.3, 0.6]}
            color={s.aire > 0.55 ? '#ffb703' : '#f4a261'}
            mat="plastic"
            solid={false}
          />
          <group rotation-z={Math.PI / 2}>
            <Cyl pos={[0.3, 0.1, 0]} r={0.16} h={0.8} color="#c0c7cf" mat="metal" solid={false} />
          </group>
          <Ball pos={[0.95, 0.04, 0]} r={0.22} color="#8d5a3b" />
          <Block
            pos={[1.1, 0.06, 0]}
            size={[0.12, 0.16, 0.32]}
            color="#7bdff2"
            mat="glass"
            solid={false}
            cast={false}
          />
          {[-0.12, 0.12].map((z) => (
            <group key={z} position={[-0.95, 0, z]} rotation-z={Math.sin(t * 3 + z * 10) * 0.2}>
              <Block
                pos={[-0.35, 0, 0]}
                size={[0.7, 0.05, 0.22]}
                color="#ffd166"
                mat="plastic"
                solid={false}
                cast={false}
              />
            </group>
          ))}
        </group>
        {[0, 1, 2].map((i) => (
          <Ball
            key={i}
            pos={[-1.6, y + 0.3 + ((t * 0.9 + i * 0.4) % 1.2) * s.pulmon * 1.4, 0.2]}
            r={0.06 + i * 0.02}
            color="#ffffff"
            mat="glass"
            cast={false}
          />
        ))}
        <group position={[2.6, 0, 0.4]}>
          {[0, 1, 2].map((i) => (
            <Ball
              key={i}
              pos={[0, 3.6 - i * 0.5, 0]}
              r={0.18}
              color={
                (i === 0 && s.w < -0.3) || (i === 2 && s.d > FONDO - 1)
                  ? '#ef476f'
                  : i === 1 && s.estable > 0.5
                    ? '#7ae582'
                    : i === 1 && verde
                      ? '#ffd166'
                      : '#3a3a3a'
              }
              mat="neon"
              cast={false}
            />
          ))}
          <Block
            pos={[0, 3.1, -0.15]}
            size={[0.5, 1.6, 0.1]}
            color="#1d1d1f"
            mat="plastic"
            solid={false}
            cast={false}
          />
          <Label pos={[0, 4.2, 0]} text="semáforo" h={0.2} bg="#1d1d1f" />
        </group>
      </Isla>
    );
  },
});
export const Flotacion = motor.Escena;
export const guia = motor.guia;
