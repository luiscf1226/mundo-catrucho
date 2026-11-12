// Motor «Remadas del Cangrejal»: cuatro remeros (proa y popa, izquierda y derecha). Paladas adelante o atrás giran la
// balsa; combinar fuerzas opuestas gira fuerte y fuerzas iguales en los dos lados no giran nada.
import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { casilla, centro, cursor, Escena, limitar, Monito, moverCursor, Palo, Rio, texto } from './comun';

const X0 = -8.4;
const X1 = 3.2;
const ZB = 1.2; // donde va la balsa
const IZQ: [number, number] = [X0, X0 + 2];
const DER: [number, number] = [X1 - 2, X1];
const ASIENTOS = ['proa izquierda', 'proa derecha', 'popa izquierda', 'popa derecha'];
const QUEBRADO = 3;
type Cosa = { z: number; tipo: 'remanso' | 'roca'; x: number; lado: 0 | 1; paso: boolean };
type Estado = {
  c: ReturnType<typeof cursor>;
  x: number;
  h: number;
  vx: number;
  cosas: Cosa[];
  sale: number;
  lado: 0 | 1;
  enfria: number;
  ultima: { t: number; lado: number; dir: number; dh: number } | null;
  combo: boolean;
  brazo: number[];
  reversa: number;
  bot: number;
  r: () => number;
  calma: boolean;
  paladas: number;
  remansos: number;
  pasados: number;
  choques: number;
  iguales: number;
  combinados: number;
  quebradas: number;
  aviso: string;
};
type Param = {
  vel: number;
  cada: number;
  rocas: number;
  remolino: number;
  reversa: boolean;
  nombre: string;
  semilla: number;
};
type Sesion = Motor<Param, Estado>;

/** La corriente principal empuja hacia el centro del río. */
const jalon = (x: number) => ((X0 + X1) / 2 - x) * 0.2;
const asiento = (s: Estado) => casilla(s.c.x, 2) + (s.c.y > 0 ? 0 : 2);

function remar(m: Sesion, dir: 1 | -1) {
  const s = m.datos;
  if (s.enfria > 0) return;
  s.enfria = 0.22;
  const a = asiento(s);
  s.brazo[a] = dir;
  if (m.parametros.reversa && a === QUEBRADO) {
    s.quebradas++;
    s.aviso = 'Ese remo está quebrado: usá los otros tres.';
    return;
  }
  s.paladas++;
  const lado = a % 2,
    proa = a < 2;
  let dh = dir * (lado === 0 ? 1 : -1) * (proa ? 0.3 : 0.22);
  const u = s.ultima;
  if (u && m.tiempo - u.t < 0.45 && u.lado !== lado) {
    if (u.dir === dir) {
      // fuerzas iguales en los dos lados: se anulan y la corriente te saca de la línea
      s.h -= u.dh;
      s.iguales++;
      s.vx += s.x < (X0 + X1) / 2 ? 2.2 : -2.2;
      s.aviso = 'Fuerzas iguales: no giraste y la corriente te sacó de la línea.';
      s.ultima = null;
      return;
    }
    dh *= 1.8;
    s.combinados++;
    s.combo = true;
    s.aviso = '¡Giro combinado! Adelante de un lado, atrás del otro.';
  }
  if (m.parametros.reversa && s.reversa > 0 && dir === -1) {
    m.sumar(5);
    s.aviso = '¡Reversa, como pidió la balsa!';
  }
  s.h = limitar(s.h + dh, -1.2, 1.2);
  s.ultima = { t: m.tiempo, lado, dir, dh };
}

const motor = defineMotor({
  id: 'atlantida.balsa',
  fondo: 'selva',
  guia: {
    goal: 'Elegí remero y dá paladas para meter la balsa en los remansos verdes sin pegarle a las rocas.',
    keys: [
      ['WASD / mouse', 'elegir remero (A/D lado, W/S proa o popa)'],
      ['F / clic / RT', 'palada adelante'],
      ['E / X', 'palada atrás'],
    ],
    touch: [
      ['Palanca / arrastrá', 'elegir remero'],
      ['🎯', 'palada adelante'],
      ['E', 'palada atrás'],
    ],
  },
  etapa: (p) => ({
    vel: 2.2 + p.dif * 0.8,
    cada: 3.8 - p.dif * 0.8,
    rocas: 0.35 + p.dif * 0.45,
    remolino: 0.12 + p.dif * 0.22 + (p.tema.reversa === true ? 0.25 : 0),
    reversa: p.tema.reversa === true,
    nombre: texto(p.tema.nombre, 'Remadas del Cangrejal'),
    semilla: p.seed,
  }),
  metas: (p) => [120 + Math.round(p.dif * 80), 260 + Math.round(p.dif * 80), 400 + Math.round(p.dif * 80)],
  duracion: (p) => 80 + Math.round(p.dif * 15),
  crear: (p): Estado => ({
    r: rng(p.semilla),
    c: { ...cursor(), x: -0.5, y: 0.5 },
    x: (X0 + X1) / 2,
    h: 0,
    vx: 0,
    cosas: [],
    sale: 0.5,
    lado: 0,
    enfria: 0,
    ultima: null,
    combo: false,
    brazo: [0, 0, 0, 0],
    reversa: 0,
    bot: 0,
    calma: false,
    paladas: 0,
    remansos: 0,
    pasados: 0,
    choques: 0,
    iguales: 0,
    combinados: 0,
    quebradas: 0,
    aviso: 'Meté la balsa en los remansos verdes de las orillas.',
  }),
  actualizar: (m, dt) => {
    const s = m.datos;
    const p = m.parametros;
    moverCursor(s.c, dt, 2.2);
    s.enfria = Math.max(0, s.enfria - dt);
    if (input.take('fire')) remar(m, 1);
    if (input.take('use')) remar(m, -1);
    s.brazo = s.brazo.map((b) => b * Math.exp(-dt * 6));
    // el río endereza la balsa y el remolino la tuerce
    s.h *= Math.exp(-dt * 0.45);
    s.h += Math.sin(m.tiempo * 1.3) * p.remolino * dt * (s.calma ? 0.4 : 1);
    s.calma = false;
    s.vx *= Math.exp(-dt * 2.5);
    // la corriente principal jala al centro: para quedarte en la orilla hay que remar
    s.x += (Math.sin(s.h) * 3.4 + s.vx + jalon(s.x)) * dt;
    s.x = Math.max(X0 + 0.7, Math.min(X1 - 0.7, s.x));
    if (p.reversa) {
      s.reversa -= dt;
      if (s.reversa < -6) s.reversa = 2.5;
    }
    // remansos y rocas que bajan con la corriente
    s.sale -= dt;
    if (s.sale <= 0) {
      s.sale = p.cada;
      const lado: 0 | 1 =
        m.partida.etapa === 0 && s.remansos + s.pasados < 2 ? s.lado : s.r() < 0.6 ? (s.lado ? 0 : 1) : s.lado;
      s.lado = lado;
      s.cosas.push({ z: -9, tipo: 'remanso', x: 0, lado, paso: false });
      if (s.r() < p.rocas)
        s.cosas.push({ z: -9 - p.cada * p.vel * 0.5, tipo: 'roca', x: -5 + s.r() * 5, lado: 0, paso: false });
    }
    for (const c of s.cosas) {
      c.z += p.vel * dt;
      if (c.paso || c.z < ZB) continue;
      c.paso = true;
      if (c.tipo === 'remanso') {
        const [a, b] = c.lado === 0 ? IZQ : DER;
        if (s.x >= a && s.x <= b) {
          s.remansos++;
          m.sumar(50 + (s.combo ? 20 : 0));
          s.aviso = s.combo ? '¡Remanso con giro combinado!' : '¡Adentro del remanso!';
        } else {
          s.pasados++;
          s.aviso = 'Se te pasó el remanso.';
        }
        s.combo = false;
      } else if (Math.abs(s.x - c.x) < 1.1) {
        s.choques++;
        m.sumar(-20);
        s.aviso = '¡Pegaste en la roca!';
      }
    }
    s.cosas = s.cosas.filter((c) => c.z < 5);
    m.objetivo = s.aviso;
    m.lineas = [
      `Remero: ${ASIENTOS[asiento(s)]}${p.reversa && asiento(s) === QUEBRADO ? ' (quebrado)' : ''} · F adelante · E atrás`,
      `Remansos ${s.remansos} · Rocas ${s.choques} · Giros combinados ${s.combinados}`,
    ];
    m.stats = {
      paladas: s.paladas,
      remansos: s.remansos,
      choques: s.choques,
      iguales: s.iguales,
      combinados: s.combinados,
      quebradas: s.quebradas,
      asiento: asiento(s),
      x: s.x,
      h: s.h,
    };
  },
  bot: (m, dt, actor) => {
    const s = m.datos;
    if (actor === 'compa') {
      s.calma = true;
      return;
    }
    const sig = s.cosas.filter((c) => c.tipo === 'remanso' && !c.paso).sort((a, b) => b.z - a.z)[0];
    let meta = sig ? (sig.lado === 0 ? IZQ[0] + 1 : DER[1] - 1) : (X0 + X1) / 2;
    const roca = s.cosas.find((c) => c.tipo === 'roca' && !c.paso && c.z > ZB - 4 && Math.abs(c.x - meta) < 1.4);
    if (roca && Math.abs(s.x - roca.x) < 1.6) meta = roca.x + (meta > roca.x ? 1.8 : -1.8);
    // rumbo que da la velocidad lateral buscada, contando el jalón de la corriente
    const lateral = limitar((meta - s.x) * 1.5, -2.6, 2.6) - jalon(s.x);
    const quiero = Math.asin(limitar(lateral / 3.4, -0.93, 0.93));
    s.c.auto = true;
    s.bot -= dt;
    if (s.enfria > 0 || s.bot > 0 || Math.abs(quiero - s.h) < 0.1) return;
    s.bot = 0.08;
    const derecha = quiero > s.h;
    // giro combinado: adelante de un lado y enseguida atrás del otro
    const segunda = s.ultima && m.tiempo - s.ultima.t < 0.4 && s.ultima.dir === 1;
    if (!segunda) {
      s.c.x = centro(derecha ? 0 : 1, 2);
      s.c.y = 0.5;
      remar(m, 1);
    } else {
      s.c.x = centro(derecha ? 1 : 0, 2);
      s.c.y = 0.5;
      remar(m, -1);
    }
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    const p = m.parametros;
    const sel = asiento(s);
    return (
      <Escena nombre={p.nombre} aviso="Elegí remero · F adelante · E atrás">
        <Rio x0={X0} x1={X1} color="#3ea6bd" />
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const z = ((m.tiempo * p.vel + i * 3.6) % 21) - 12;
          return (
            <Block
              key={i}
              pos={[X0 + 1.5 + ((i * 3.7) % 9), 0.07, z]}
              size={[0.08, 0.02, 1.4]}
              color="#e9fbff"
              mat="plastic"
              solid={false}
              cast={false}
            />
          );
        })}
        {s.cosas.map((c, i) =>
          c.tipo === 'remanso' ? (
            <group key={i} position={[c.lado === 0 ? (IZQ[0] + IZQ[1]) / 2 : (DER[0] + DER[1]) / 2, 0, c.z]}>
              <Block
                pos={[0, 0.06, 0]}
                size={[2, 0.04, 1.6]}
                color={c.paso ? '#b7e4c7' : '#2dc653'}
                mat="neon"
                solid={false}
                cast={false}
              />
              <Cyl pos={[0, 0.09, 0]} r={0.55} h={0.03} color="#e9fbff" mat="plastic" solid={false} cast={false} />
              <Cyl
                pos={[0, 0.1, 0]}
                r={0.4}
                h={0.03}
                color={c.paso ? '#b7e4c7' : '#2dc653'}
                mat="neon"
                solid={false}
                cast={false}
              />
              <Label pos={[0, 0.8, 0]} text="Remanso" h={0.32} bg="#2d6a4f" />
            </group>
          ) : (
            <group key={i} position={[c.x, 0, c.z]}>
              <group scale={[1.1, 0.6, 0.9]}>
                <Ball pos={[0, 0.3, 0]} r={0.75} color="#7d7f7d" mat="stone" />
              </group>
            </group>
          ),
        )}
        <group position={[s.x, 0.12, ZB]} rotation-y={-s.h}>
          <Block pos={[0, 0.2, 0]} size={[1.6, 0.36, 2.6]} color="#f4c430" mat="plastic" solid={false} />
          <Block pos={[0, 0.3, 0]} size={[1.1, 0.2, 2.1]} color="#2b6cb0" mat="plastic" solid={false} cast={false} />
          {ASIENTOS.map((_, a) => {
            const lado = a % 2 ? 1 : -1,
              z = a < 2 ? -0.7 : 0.6;
            return (
              <group key={a} position={[lado * 0.62, 0.32, z]}>
                <Monito
                  pos={[0, 0, 0]}
                  rot={lado > 0 ? Math.PI : 0}
                  color={p.reversa && a === QUEBRADO ? '#9a9a9a' : ['#e76f51', '#e9c46a', '#2a9d8f', '#8338ec'][a]}
                  brazo={s.brazo[a] * 0.9}
                  s={0.7}
                />
                <Palo
                  pos={[lado * 0.45, 0.2, s.brazo[a] * -0.35]}
                  largo={p.reversa && a === QUEBRADO ? 0.4 : 1}
                  r={0.04}
                  rotY={Math.PI / 2}
                  rotZ={0.5 * lado}
                  color="#5a3d26"
                />
                {sel === a && <Label pos={[0, 1.15, 0]} text="▼" h={0.3} fg="#ffd166" bg="rgba(0,0,0,0)" />}
              </group>
            );
          })}
        </group>
        <Label pos={[s.x, 2.4, ZB]} text={ASIENTOS[sel]} h={0.24} bg="#1d3557" />
        {p.reversa && (
          <>
            {s.reversa > 0 && <Label pos={[s.x + 1.4, 3.1, ZB]} text="💬 ¡Reversa!" h={0.34} bg="#ef476f" />}
            {[-1, 1].map((l) => (
              <Palo
                key={l}
                pos={[s.x + l * 0.3, 0.75, ZB + 1.2]}
                largo={0.35}
                r={0.03}
                rotZ={l * 0.8}
                color="#ffd166"
              />
            ))}
          </>
        )}
      </Escena>
    );
  },
});
export const Balsa = motor.Escena;
export const guia = motor.guia;
