// Rebotes del valle: dos mantas enlazadas (A inclina la de la izquierda, D la de la derecha) pasan mangos al guacal.
import { Block, Cyl, Label, P } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { acercar, cursor, limitar, Mango, metasLineales, moverCursor, reloj, Taller, texto } from './comun';

const G = 9.8;
const MANTAS = [-5, -1.2];
const ALTO = 1;
const MEDIO = 1.1;
const GUACAL = 2.7;
const BOCA = 0.75;
const LANCE = 6.4;
type Fruta = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  maduro: boolean;
  botes: number;
  ultima: number;
  giro: number;
};
type Estado = {
  c: ReturnType<typeof cursor>;
  mangos: Fruta[];
  elastico: [number, number];
  proximo: number;
  azar: () => number;
  ayuda: boolean;
  entregados: number;
  golpeados: number;
  caidos: number;
  rebotes: number;
  aviso: string;
};
type Param = { cada: number; maduros: number; nombre: string; semilla: number };
type Sesion = Motor<Param, Estado>;
/** Inclinación de cada manta: A (cursor a la izquierda) levanta la 1, D la 2; enlazadas, la otra se mueve un poco. */
function inclinacion(s: Estado): [number, number] {
  const a = limitar(-s.c.x, 0, 1),
    d = limitar(s.c.x, 0, 1);
  return [limitar(a + 0.3 * d, 0, 1), limitar(d + 0.3 * a, 0, 1)];
}
/** Velocidad vertical al salir de la manta k con la elasticidad de ahora. */
const salto = (s: Estado, k: number, vy: number) => Math.max(4, Math.abs(vy) * s.elastico[k] * 0.8 + 0.5);
function paso(m: Sesion, dt: number) {
  const s = m.datos;
  const inc = inclinacion(s);
  for (const f of s.mangos) {
    f.vy -= G * dt;
    const yAntes = f.y;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.giro += dt * (2 + Math.abs(f.vx));
    if (f.vy < 0 && yAntes >= ALTO && f.y < ALTO) {
      const k = MANTAS.findIndex((x) => Math.abs(f.x - x) <= MEDIO);
      if (k >= 0) {
        f.y = ALTO;
        f.vy = salto(s, k, f.vy);
        f.vx = inc[k] * LANCE + (s.ayuda ? 0.3 : 0);
        f.botes = f.ultima === k ? f.botes + 1 : 1;
        f.ultima = k;
        s.rebotes++;
        if (f.maduro) s.elastico[k] = Math.max(0.42, s.elastico[k] - 0.025);
        if (f.botes > 3) {
          // la manta se cansa de sostenerlo y se le resbala
          f.y = ALTO - 0.02;
          f.vx = 0.7;
          f.vy = -1;
        }
      }
    }
    if (f.vy < 0 && yAntes >= 0.7 && f.y < 0.7 && Math.abs(f.x - GUACAL) <= BOCA) {
      const golpe = Math.hypot(f.vx, f.vy) > (f.maduro ? 6.8 : 7.6);
      f.y = -9;
      if (golpe) {
        s.golpeados++;
        m.sumar(5);
        s.aviso = 'Llegó al guacal, pero golpeado. +5';
      } else {
        s.entregados++;
        m.sumar(30);
        s.aviso = `¡Mango ${f.maduro ? 'maduro' : 'verde'} sano en el guacal! +30`;
      }
    } else if (f.y < 0.15 || f.x > 8.5) {
      s.caidos++;
      m.sumar(-10);
      f.y = -9;
      s.aviso = 'Se cayó al suelo. −10';
    }
  }
  s.mangos = s.mangos.filter((f) => f.y > -5 && f.x < 9);
}
const motor = defineMotor({
  id: 'comayagua.mantas',
  fondo: 'finca',
  guia: {
    goal: 'Atajá los mangos con la primera manta, pasalos a la segunda y de ahí al guacal, sin golpes ni caídas.',
    keys: [
      ['A / ←', 'inclinar la manta de la izquierda'],
      ['D / →', 'inclinar la manta de la derecha'],
      ['Mouse / stick derecho', 'izquierda o derecha'],
    ],
    touch: [
      ['Palanca / arrastrá', 'izquierda inclina una, derecha la otra'],
      ['🎯', 'nada: ¡las dos manos en la manta!'],
    ],
  },
  etapa: (p) => ({
    cada: 3.4 - p.dif * 1.2,
    maduros: 0.35 + p.dif * 0.35,
    nombre: texto(p.tema.nombre, 'Mantas del valle'),
    semilla: p.seed,
  }),
  metas: metasLineales(120, 300, 480, 120),
  duracion: reloj(80, 10),
  crear: (p): Estado => ({
    c: cursor(),
    mangos: [],
    elastico: [0.82, 0.82],
    proximo: 1.5,
    azar: rng(p.semilla),
    ayuda: false,
    entregados: 0,
    golpeados: 0,
    caidos: 0,
    rebotes: 0,
    aviso: 'Ya viene el primer mango.',
  }),
  actualizar: (m, dt) => {
    const s = m.datos;
    moverCursor(s.c, dt, 2.4);
    s.proximo -= dt;
    if (s.proximo <= 0) {
      s.proximo = m.parametros.cada * (0.85 + s.azar() * 0.3);
      s.mangos.push({
        x: MANTAS[0] + (s.azar() - 0.5) * 0.9,
        y: 4.2,
        vx: 0,
        vy: 0,
        maduro: s.azar() < m.parametros.maduros,
        botes: 0,
        ultima: -1,
        giro: 0,
      });
    }
    // pasos cortos: un mango rápido no atraviesa la manta
    for (let k = 0; k < 2; k++) paso(m, dt / 2);
    s.ayuda = false;
    const [i1, i2] = inclinacion(s);
    m.objetivo = s.aviso;
    m.lineas = [
      `Manta 1 ${Math.round(i1 * 100)}% · Manta 2 ${Math.round(i2 * 100)}%`,
      `Elasticidad ${Math.round(s.elastico[0] * 100)}% · ${Math.round(s.elastico[1] * 100)}% (los maduros la aflojan)`,
      `Al guacal ${s.entregados} · Golpeados ${s.golpeados} · Al suelo ${s.caidos}`,
    ];
    m.stats = {
      entregados: s.entregados,
      golpeados: s.golpeados,
      caidos: s.caidos,
      rebotes: s.rebotes,
      i1,
      i2,
    };
  },
  bot: (m, dt, actor) => {
    const s = m.datos;
    if (actor === 'compa') {
      s.ayuda = true;
      return;
    }
    // el mango que va a tocar manta primero decide; calcula la inclinación que lo deja en el siguiente blanco
    let mejor: { t: number; k: number; f: Fruta } | null = null;
    for (const f of s.mangos) {
      const h = f.y - ALTO;
      const t = (f.vy + Math.sqrt(Math.max(0, f.vy * f.vy + 2 * G * h))) / G;
      const x = f.x + f.vx * t;
      const k = MANTAS.findIndex((mx) => Math.abs(x - mx) <= MEDIO);
      if (k >= 0 && h >= -0.05 && (!mejor || t < mejor.t)) mejor = { t, k, f };
    }
    let meta = 0;
    if (mejor) {
      const { t, k, f } = mejor;
      const vIn = -(f.vy - G * t);
      const vy = salto(s, k, vIn);
      const blanco = k === 0 ? MANTAS[1] : GUACAL;
      const yb = k === 0 ? ALTO : 0.7;
      const subida = (vy + Math.sqrt(Math.max(0, vy * vy - 2 * G * (yb - ALTO)))) / G;
      const xImpacto = f.x + f.vx * t;
      const inc = limitar((blanco - xImpacto) / subida / LANCE, 0, 1);
      meta = k === 0 ? -inc : inc;
    }
    s.c.x = acercar(s.c.x, meta, dt * 3);
    s.c.auto = true;
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    const inc = inclinacion(s);
    return (
      <Taller nombre={m.parametros.nombre} aviso="A inclina la manta 1 · D la manta 2 · al guacal sin golpes">
        <P.Tree pos={[-7.4, 0, -1.6]} scale={1.3} seed={7} solid={false} />
        <Label pos={[-6.8, 5.4, -0.4]} text="Palo de mango" h={0.26} bg="#3d8b40" />
        {MANTAS.map((x, k) => (
          <group key={k}>
            {[-1, 1].map((l) => (
              <Cyl
                key={l}
                pos={[x + l * (MEDIO + 0.15), ALTO / 2, 0.6]}
                r={0.06}
                h={ALTO + 0.1}
                color="#6b4226"
                mat="wood"
                solid={false}
                cast={false}
              />
            ))}
            <group position={[x, ALTO - 0.04, 0]} rotation-z={inc[k] * 0.45}>
              <Block
                pos={[0, 0, 0]}
                size={[MEDIO * 2, 0.06, 1.3]}
                color={k ? '#2a9d8f' : '#e76f51'}
                mat="cloth"
                solid={false}
              />
              <Block
                pos={[0, 0.02, 0]}
                size={[MEDIO * 2, 0.07, 0.12]}
                color="#f4f1e8"
                mat="cloth"
                solid={false}
                cast={false}
              />
            </group>
            <Label
              pos={[x, 0.35, 1.1]}
              text={`Manta ${k + 1} · ${k ? 'D' : 'A'}`}
              h={0.24}
              bg={k ? '#2a9d8f' : '#e76f51'}
            />
          </group>
        ))}
        {/* el lazo que enlaza las dos mantas */}
        <Block
          pos={[(MANTAS[0] + MANTAS[1]) / 2, ALTO - 0.1, 0.66]}
          size={[MANTAS[1] - MANTAS[0] - MEDIO * 2 - 0.3, 0.04, 0.04]}
          color="#d9c7a0"
          mat="cloth"
          solid={false}
          cast={false}
        />
        <group position={[GUACAL, 0, 0]}>
          <Cyl pos={[0, 0.35, 0]} r={BOCA} rTop={BOCA + 0.12} h={0.7} color="#8a5a32" mat="wood" solid={false} />
          <Cyl pos={[0, 0.66, 0]} r={BOCA - 0.06} h={0.04} color="#5a3d26" mat="wood" solid={false} cast={false} />
          <Label pos={[0, 1.35, 0.3]} text={`Guacal · ${s.entregados}`} h={0.26} bg="#7a3b1f" />
        </group>
        {s.mangos.map((f, i) => (
          <Mango key={i} pos={[f.x, f.y + 0.18, 0]} maduro={f.maduro} giro={f.giro} />
        ))}
      </Taller>
    );
  },
});
export const Mantas = motor.Escena;
export const guia = motor.guia;
