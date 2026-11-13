// Motor «Canales de silencio»: cada F es una remada silenciosa. Si el hidrófono marca presencia, no remés: esperá o
// cambiá de canal en el próximo cruce. Remar con presencia o remar seguido hace ruido y te obliga a retroceder.
import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { Barra, casilla, centro, cursor, Escena, Monito, moverCursor, texto } from './comun';

const CANALES = [-3.6, -1.2, 1.2];
const CRUCES = [-5.2, -2, 1];
const XI = -8.2;
const XL = 3;
const PASO = 0.7;
type Manati = { c: number; x: number; v: number; cambia: number };
type Estado = {
  c: ReturnType<typeof cursor>;
  r: () => number;
  canal: number;
  x: number;
  vista: number;
  ruido: number;
  golpesViaje: number;
  ultima: number;
  manatis: Manati[];
  espera: number;
  bot: number;
  llegadas: number;
  golpes: number;
  acercadas: number;
  remadas: number;
  retrocesos: number;
  aviso: string;
};
type Param = { umbral: number; vel: number; cuantos: number; nombre: string; semilla: number };
type Sesion = Motor<Param, Estado>;

/** Lo que oye el hidrófono: 0 nada, 1 el manatí está pegado en tu canal. */
export function presencia(s: Estado) {
  let p = 0;
  for (const m of s.manatis) {
    const d = Math.abs(m.x - s.x) + Math.abs(m.c - s.canal) * 2.6;
    p = Math.max(p, 1 - d / 4.2);
  }
  return Math.max(0, p);
}
const elegido = (s: Estado) => casilla(-s.c.y, 3);
function retroceder(s: Estado) {
  const atras = [...CRUCES].reverse().find((x) => x < s.x - 0.1);
  s.x = atras !== undefined ? atras - 0.4 : XI;
  s.golpesViaje = 0;
  s.retrocesos++;
}
function nuevoViaje(s: Estado, m: Sesion) {
  s.x = XI;
  s.canal = 1;
  s.vista = XI;
  s.golpesViaje = 0;
  s.manatis = Array.from({ length: m.parametros.cuantos }, (_, i) => ({
    c: Math.floor(s.r() * 3),
    x: -4 + i * 3 + s.r() * 3,
    v: (s.r() < 0.5 ? -1 : 1) * m.parametros.vel,
    cambia: 2 + s.r() * 3,
  }));
}
function remar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.remadas++;
  const p = presencia(s);
  s.ruido += m.tiempo - s.ultima < 0.45 ? 0.45 : 0.12;
  s.ultima = m.tiempo;
  if (p >= m.parametros.umbral || s.ruido > 1) {
    s.golpes++;
    s.golpesViaje++;
    m.sumar(-10);
    s.ruido = 0.3;
    s.aviso = p >= m.parametros.umbral ? '¡Remaste con el manatí cerca! Esperá.' : 'Mucho ruido: remá más despacio.';
    if (s.golpesViaje >= 2) {
      retroceder(s);
      s.aviso = 'El ruido te obligó a retroceder al cruce anterior.';
    }
    s.espera = 0.6;
    return;
  }
  const antes = s.x;
  s.x += PASO;
  const cruce = CRUCES.find((c) => antes < c && s.x >= c);
  if (cruce !== undefined) s.canal = elegido(s);
  if (s.manatis.some((mn) => mn.c === s.canal && Math.abs(mn.x - s.x) < 0.9)) {
    s.acercadas++;
    m.sumar(-30);
    s.aviso = 'Te acercaste demasiado al manatí. Retrocedé.';
    retroceder(s);
    return;
  }
  if (s.x >= XL) {
    s.llegadas++;
    m.sumar(60 + (s.golpesViaje ? 0 : 20));
    s.aviso = s.golpesViaje ? 'Llegaste a la laguna.' : '¡Llegaste a la laguna sin un solo ruido!';
    nuevoViaje(s, m);
  } else s.aviso = 'Remada suave…';
}

const motor = defineMotor({
  id: 'atlantida.manati',
  fondo: 'selva',
  guia: {
    goal: 'Remá con F hasta la laguna. Si el hidrófono pasa la raya, pará. Cambiá de canal en los cruces con W/S.',
    keys: [
      ['F / clic / RT', 'remada silenciosa'],
      ['W / S · mouse', 'canal para el próximo cruce'],
    ],
    touch: [
      ['🎯', 'remada silenciosa'],
      ['Palanca ↑ ↓', 'elegir canal'],
    ],
  },
  etapa: (p) => ({
    umbral: 0.62 - p.dif * 0.12,
    vel: 0.35 + p.dif * 0.35,
    cuantos: p.dif > 0.6 ? 2 : 1,
    nombre: texto(p.tema.nombre, 'Canales de silencio'),
    semilla: p.seed,
  }),
  metas: (p) => [100 + Math.round(p.dif * 60), 220 + Math.round(p.dif * 60), 340 + Math.round(p.dif * 60)],
  duracion: (p) => 80 + Math.round(p.dif * 15),
  crear: (p): Estado => {
    const s: Estado = {
      c: { ...cursor(), y: 0 },
      r: rng(p.semilla),
      canal: 1,
      x: XI,
      vista: XI,
      ruido: 0,
      golpesViaje: 0,
      ultima: -9,
      manatis: [],
      espera: 0,
      bot: 0,
      llegadas: 0,
      golpes: 0,
      acercadas: 0,
      remadas: 0,
      retrocesos: 0,
      aviso: 'Llegá a la laguna sin acercarte al manatí.',
    };
    return s;
  },
  actualizar: (m, dt) => {
    const s = m.datos;
    const p = m.parametros;
    if (!s.manatis.length) nuevoViaje(s, m);
    moverCursor(s.c, dt, 1.6);
    s.espera = Math.max(0, s.espera - dt);
    s.ruido = Math.max(0, s.ruido - dt * 0.6);
    if (input.take('fire')) remar(m);
    for (const mn of s.manatis) {
      mn.x += mn.v * dt;
      if (mn.x < -7.4 || mn.x > 2.4) mn.v = -mn.v;
      mn.cambia -= dt;
      const cruce = CRUCES.find((c) => Math.abs(mn.x - c) < 0.15);
      if (mn.cambia <= 0 && cruce !== undefined) {
        mn.cambia = 3 + s.r() * 3;
        mn.c = Math.max(0, Math.min(2, mn.c + (s.r() < 0.5 ? -1 : 1)));
        mn.x = cruce + Math.sign(mn.v) * 0.2;
      }
    }
    s.vista += (s.x - s.vista) * Math.min(1, dt * 6);
    const pr = presencia(s);
    m.objetivo = s.aviso;
    m.lineas = [
      `Hidrófono ${Math.round(pr * 100)}%${pr >= p.umbral ? ' · ¡PRESENCIA! No remés' : ''} · Ruido ${Math.round(s.ruido * 100)}%`,
      `Próximo cruce: canal ${['de arriba', 'del medio', 'de abajo'][elegido(s)]} · Llegadas ${s.llegadas}`,
    ];
    m.stats = {
      llegadas: s.llegadas,
      golpes: s.golpes,
      acercadas: s.acercadas,
      remadas: s.remadas,
      retrocesos: s.retrocesos,
      canal: s.canal,
      elegido: elegido(s),
      x: s.x,
    };
  },
  bot: (m, dt, actor) => {
    const s = m.datos;
    if (actor === 'compa') {
      // el compa vigila el hidrófono y calma el agua
      s.ruido = Math.max(0, s.ruido - dt * 0.3);
      return;
    }
    s.c.auto = true;
    // en el próximo cruce, el canal más lejos de los manatíes
    const sig = CRUCES.find((c) => c > s.x);
    let mejor = s.canal,
      lejos = -1;
    for (let c = 0; c < 3; c++) {
      const d = Math.min(...s.manatis.map((mn) => (mn.c === c ? Math.abs(mn.x - (sig ?? s.x) - 1.5) : 9)));
      if (d > lejos + 0.3) {
        lejos = d;
        mejor = c;
      }
    }
    s.c.y = -centro(mejor, 3);
    s.bot -= dt;
    if (s.bot > 0) return;
    const futuro = { ...s, x: s.x + PASO, canal: sig !== undefined && s.x + PASO >= sig ? mejor : s.canal };
    if (presencia(s) >= m.parametros.umbral - 0.06 || presencia(futuro) >= m.parametros.umbral - 0.02) return;
    if (s.manatis.some((mn) => mn.c === futuro.canal && Math.abs(mn.x - futuro.x) < 1.3)) return;
    s.bot = 0.5;
    remar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    const p = m.parametros;
    const pr = presencia(s);
    const sel = elegido(s);
    return (
      <Escena nombre={p.nombre} aviso="F remada silenciosa · W/S canal en el cruce">
        <Block
          pos={[-2.6, 0.02, -1.2]}
          size={[12.6, 0.03, 7.4]}
          color="#4f7f52"
          mat="grass"
          solid={false}
          cast={false}
        />
        {CANALES.map((z, i) => (
          <Block
            key={z}
            pos={[(XI + XL) / 2 - 0.3, 0.05, z]}
            size={[XL - XI + 0.6, 0.03, 1.4]}
            color={i === sel ? '#4fa3a0' : '#3d8a8a'}
            mat="water"
            solid={false}
            cast={false}
          />
        ))}
        {CRUCES.map((x) => (
          <group key={x}>
            <Block
              pos={[x, 0.055, -1.2]}
              size={[1, 0.03, 6.2]}
              color="#3d8a8a"
              mat="water"
              solid={false}
              cast={false}
            />
            <Label pos={[x, 0.9, 2.5]} text="cruce" h={0.18} />
          </group>
        ))}
        <Block
          pos={[XL + 0.9, 0.05, -1.2]}
          size={[1.6, 0.03, 6.2]}
          color="#57b7c4"
          mat="water"
          solid={false}
          cast={false}
        />
        <Label pos={[XL + 0.9, 1.2, -1.2]} text="Laguna" h={0.3} bg="#1d6f7a" />
        {[-6.8, -3.6, -0.4, 2.1].flatMap((x) =>
          [-2.4, 0].map((z) => (
            <Cyl
              key={`${x}${z}`}
              pos={[x, 0.5, z]}
              r={0.18}
              rTop={0.1}
              h={1}
              color="#5a3d26"
              mat="wood"
              solid={false}
              cast={false}
            />
          )),
        )}
        {s.manatis.map((mn, i) => (
          <group key={i} position={[mn.x, 0.02, CANALES[mn.c]]} rotation-y={mn.v > 0 ? 0 : Math.PI}>
            <group scale={[1.5, 0.35, 0.6]}>
              <Ball pos={[0, 0, 0]} r={0.5} color="#5d6b6e" mat="plastic" cast={false} />
            </group>
            <Ball pos={[0.75, 0, 0]} r={0.2} color="#5d6b6e" cast={false} />
            {pr > 0.3 && <Label pos={[0, 0.8, 0]} text="〰" h={0.24} bg="rgba(0,0,0,0)" fg="#e0f7fa" />}
          </group>
        ))}
        <group position={[s.vista, 0.06, CANALES[s.canal]]}>
          <Block pos={[0, 0.12, 0]} size={[1.6, 0.24, 0.5]} color="#7f5539" mat="wood" solid={false} />
          <Monito
            pos={[-0.1, 0.12, 0]}
            color="#2a9d8f"
            s={0.55}
            rot={Math.PI / 2}
            brazo={s.espera > 0 ? 0 : Math.sin(m.tiempo * 3) * 0.2}
          />
        </group>
        <Barra
          pos={[-4.2, 0.4, 2.9]}
          valor={pr}
          alerta={p.umbral}
          ancho={4}
          texto={`🎧 Hidrófono ${Math.round(pr * 100)}%`}
        />
        <Barra pos={[1.2, 0.4, 2.9]} valor={s.ruido} alerta={1} ancho={2} color="#f4a261" texto="Ruido" />
        <Label pos={[XI - 0.4, 1.2, CANALES[sel]]} text="➜" h={0.32} fg="#ffd166" bg="rgba(0,0,0,0)" />
      </Escena>
    );
  },
});
export const Manati = motor.Escena;
export const guia = motor.guia;
