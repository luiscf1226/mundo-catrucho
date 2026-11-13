// Escape del reloj: encajá ruedas en los tres ejes y afiná el péndulo entre campanadas. Es la réplica del taller.
import { audio } from '../../../core/audio';
import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import {
  acercar,
  cursor,
  Engranaje,
  haciaIndice,
  indice,
  loco,
  Mesa,
  metasLineales,
  moverCursor,
  reloj,
  Taller,
  texto,
  turno,
} from './comun';

const BASES = [12, 16, 20, 24];
const RAZONES = [1.5, 2, 0.75];
const HORA = 5;
const BANDEJA = 6;
const EJES_X = [-6.4, -4.6, -2.8];
// Modo loco: cada rueda mala hay que diagnosticarla a puro desfase y eso cuesta dos o tres horas. Con la paga
// normal un buen jugador simulado no llegaba al oro (0–1 %); con estas, entre 12 % (dif 1) y 54 % (dif 0).
const HORA_LOCA = 35;
const ARREGLO = 40;
type Rueda = { dientes: number; eje: number };
type Estado = {
  c: ReturnType<typeof cursor>;
  pide: number[];
  ruedas: Rueda[];
  sel: number;
  deriva: number;
  minutos: number;
  sincronizado: boolean;
  campana: number;
  hora: number;
  racha: number;
  ultimo: number | null;
  azar: () => number;
  /** eje donde se coló la rueda mala (−1: ninguno); corregirlo en el modo loco paga el diagnóstico */
  danado: number;
  espera: number;
  ayuda: boolean;
  aciertos: number;
  fallos: number;
  encajes: number;
  aviso: string;
};
type Param = { loco: boolean; tolerancia: number; deriva: number; razones: boolean; nombre: string; semilla: number };
type Sesion = Motor<Param, Estado>;
const enEje = (s: Estado, e: number) => s.ruedas.findIndex((r) => r.eje === e);
const perilla = (s: Estado) => s.c.y;
function factor(s: Estado) {
  let f = 1;
  for (let e = 0; e < 3; e++) {
    const i = enEje(s, e);
    if (i < 0) return 0;
    f *= s.ruedas[i].dientes / s.pide[e];
  }
  return f * s.deriva * (1 + 0.12 * perilla(s));
}
/** Saca una rueda equivocada en un eje (para el modo loco y después de tres horas buenas). */
function danar(s: Estado) {
  const e = Math.floor(s.azar() * 3);
  const mala = s.ruedas.findIndex((r) => r.eje < 0 && r.dientes !== s.pide[e]);
  const buena = enEje(s, e);
  if (mala < 0 || buena < 0) return;
  s.ruedas[buena].eje = -1;
  s.ruedas[mala].eje = e;
  s.danado = e;
}
function encajar(m: Sesion) {
  const s = m.datos;
  const i = indice(s.c.x, BANDEJA);
  const r = s.ruedas[i];
  s.encajes++;
  const vieja = enEje(s, s.sel);
  if (vieja === i) {
    r.eje = -1;
    s.aviso = `Sacaste la rueda del eje ${s.sel + 1}.`;
    return;
  }
  if (vieja >= 0) s.ruedas[vieja].eje = -1;
  r.eje = s.sel;
  s.aviso = `Rueda de ${r.dientes} dientes en el eje ${s.sel + 1}.`;
  if (s.danado === s.sel && r.dientes === s.pide[s.sel]) {
    s.danado = -1;
    if (m.parametros.loco) {
      m.sumar(ARREGLO);
      s.aviso = `¡Diste con la rueda mala del eje ${s.sel + 1}! +${ARREGLO}`;
    }
  }
  s.sel = (s.sel + 1) % 3;
}
function cambiarEje(m: Sesion) {
  const s = m.datos;
  s.sel = (s.sel + 1) % 3;
}
function campanada(m: Sesion) {
  const s = m.datos;
  s.hora++;
  s.campana = 1;
  if (factor(s) === 0) {
    s.racha = 0;
    s.ultimo = null;
    s.minutos = 0;
    s.aviso = 'Sonó la campana y la aguja ni se movió: faltan ruedas.';
    return;
  }
  const error = s.minutos - 60;
  s.ultimo = error;
  const tol = m.parametros.tolerancia + (s.ayuda ? 1.5 : 0);
  if (Math.abs(error) <= tol) {
    s.aciertos++;
    s.racha++;
    const pago = m.parametros.loco ? HORA_LOCA : 30;
    m.sumar(pago);
    s.aviso = `¡Aguja y campana juntas! +${pago}`;
    audio.tone(660, 0.5, { type: 'sine', gain: 0.12 });
    if (s.racha % 3 === 0) {
      m.sumar(50);
      s.aviso = '¡Tres horas al pelo! +50. Algo se desajustó…';
      s.deriva = 1 + (s.azar() < 0.5 ? -1 : 1) * m.parametros.deriva;
      if (m.parametros.loco || m.partida.dif > 0.4) danar(s);
    }
  } else {
    s.fallos++;
    s.racha = 0;
    s.aviso = error > 0 ? `Adelanta ${Math.round(error)} min.` : `Atrasa ${Math.round(-error)} min.`;
    audio.tone(330, 0.4, { type: 'triangle', gain: 0.1 });
  }
  s.minutos = 0;
}
const motor = defineMotor({
  id: 'comayagua.reloj',
  modos: { duo: { tipo: 'apoyo' }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'pueblo',
  guia: {
    goal: 'Encajá la rueda justa en cada eje y afiná el péndulo: la aguja tiene que llegar a la hora con la campana.',
    keys: [
      ['A / D', 'elegir rueda de la bandeja'],
      ['W / S', 'perilla del péndulo'],
      ['E / mando X', 'cambiar de eje'],
      ['F / clic / RT', 'encajar la rueda'],
      ['Mouse / stick derecho', 'rueda (←→) y péndulo (↑↓)'],
    ],
    touch: [
      ['Palanca / arrastrá', 'rueda y péndulo'],
      ['E', 'cambiar de eje'],
      ['🎯', 'encajar'],
    ],
  },
  etapa: (p) => ({
    loco: loco(p),
    tolerancia: 6 - p.dif * 3,
    deriva: 0.04 + p.dif * 0.06,
    razones: p.dif >= 0.3,
    nombre: texto(p.tema.nombre, 'Reloj del taller'),
    semilla: p.seed,
  }),
  metas: metasLineales(120, 300, 460, 60),
  duracion: reloj(80, 10),
  crear: (p): Estado => {
    const azar = rng(p.semilla);
    const base = BASES[Math.floor(azar() * BASES.length)];
    const pide = [base];
    for (let i = 1; i < 3; i++) {
      const previa = pide[i - 1];
      const sirven = RAZONES.filter((r) => Number.isInteger(previa * r) && previa * r >= 9 && previa * r <= 40);
      pide.push(previa * (sirven[Math.floor(azar() * sirven.length)] ?? 1.5));
    }
    const malas = pide.map((d) =>
      azar() < 0.6 && d * 1.5 <= 48 ? Math.round(d * 1.5) : Math.max(8, Math.round(d * 0.6)),
    );
    const ruedas = [...pide, ...malas]
      .map((dientes) => ({ dientes, eje: -1, k: azar() }))
      .sort((a, b) => a.k - b.k)
      .map(({ dientes }) => ({ dientes, eje: -1 }));
    const s: Estado = {
      c: cursor(-1, 0),
      pide,
      ruedas,
      sel: 0,
      deriva: 1 + (azar() < 0.5 ? -1 : 1) * p.deriva,
      minutos: 0,
      sincronizado: false,
      campana: 0,
      hora: 0,
      racha: 0,
      ultimo: null,
      azar,
      danado: -1,
      espera: 0.5,
      ayuda: false,
      aciertos: 0,
      fallos: 0,
      encajes: 0,
      aviso: p.loco ? 'La réplica ya trae ruedas, pero una está mala. Escuchá el desfase.' : 'Armá la transmisión.',
    };
    if (p.loco) {
      pide.forEach((d, e) => {
        const i = s.ruedas.findIndex((r) => r.eje < 0 && r.dientes === d);
        if (i >= 0) s.ruedas[i].eje = e;
      });
      danar(s);
    }
    return s;
  },
  actualizar: (m, dt) => {
    const s = m.datos;
    moverCursor(s.c, dt, 1.1);
    if (input.take('use')) cambiarEje(m);
    if (input.take('fire')) encajar(m);
    // la primera vez que arranca la transmisión, el relojero pone la aguja en la hora de ese momento;
    // después ya no: parar el reloj o cambiar ruedas a media hora se nota en la campanada
    if (!s.sincronizado && factor(s) > 0) {
      s.sincronizado = true;
      s.minutos = ((m.tiempo - s.hora * HORA) / HORA) * 60;
    }
    s.minutos += (60 / HORA) * factor(s) * dt;
    s.campana = Math.max(0, s.campana - dt);
    if (m.tiempo >= (s.hora + 1) * HORA) campanada(m);
    s.ayuda = false;
    m.objetivo = s.aviso;
    const pista = s.pide
      .map((d, e) =>
        m.parametros.loco
          ? `Eje ${e + 1}: ?`
          : !m.parametros.razones || e === 0
            ? `Eje ${e + 1}: ${d}`
            : `Eje ${e + 1}: ×${d / s.pide[e - 1]}`,
      )
      .join(' · ');
    m.lineas = [
      pista,
      `Campana en ${Math.ceil((s.hora + 1) * HORA - m.tiempo)} s · Péndulo ${perilla(s) >= 0 ? '+' : ''}${perilla(s).toFixed(1)}`,
      s.ultimo === null
        ? `Horas buenas ${s.aciertos} · Racha ${s.racha}`
        : `Último desfase ${s.ultimo > 0 ? '+' : ''}${Math.round(s.ultimo)} min · Racha ${s.racha}`,
    ];
    m.stats = {
      aciertos: s.aciertos,
      fallos: s.fallos,
      encajes: s.encajes,
      sel: s.sel,
      rueda: indice(s.c.x, BANDEJA),
      perilla: perilla(s),
      puestas: s.ruedas.filter((r) => r.eje >= 0).length,
    };
  },
  bot: (m, dt, actor) => {
    const s = m.datos;
    if (actor === 'compa') {
      s.ayuda = true;
      return;
    }
    s.c.auto = true;
    // primero la rueda justa de cada eje, después la perilla que cancela la deriva
    const e = [0, 1, 2].find((k) => {
      const i = enEje(s, k);
      return i < 0 || s.ruedas[i].dientes !== s.pide[k];
    });
    const objetivoY = Math.max(-1, Math.min(1, (1 / s.deriva - 1) / 0.12));
    s.c.y = acercar(s.c.y, objetivoY, dt * 0.8);
    if (e === undefined) return;
    const i = s.ruedas.findIndex(
      (r) => r.dientes === s.pide[e] && r.eje !== e && (r.eje < 0 || r.dientes !== s.pide[r.eje]),
    );
    if (i < 0) return;
    const x = haciaIndice(i, BANDEJA);
    s.c.x = acercar(s.c.x, x, dt * 2);
    if (s.c.x !== x || !turno(s, dt, 0.6)) return;
    if (s.sel !== e) cambiarEje(m);
    else encajar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    const p = m.parametros;
    const f = factor(s);
    const giro = m.tiempo * 1.4 * f;
    const sel = indice(s.c.x, BANDEJA);
    const aguja = -(s.minutos / 60) * Math.PI * 2;
    const pendulo = Math.sin(m.tiempo * 3.2 * (1 + 0.12 * perilla(s))) * (f ? 0.35 : 0.05);
    return (
      <Taller nombre={p.nombre} aviso="A/D rueda · E eje · F encajar · W/S péndulo">
        {/* torre de la réplica, con la esfera y la campana */}
        <Block pos={[2, 2, -3.6]} size={[3.2, 4, 0.8]} color="#f2e6cf" mat="stucco" solid={false} />
        <group position={[2, 2.7, -3.15]}>
          <group rotation-x={Math.PI / 2}>
            <Cyl pos={[0, 0, 0]} r={1.25} h={0.1} color="#fffdf2" mat="plastic" solid={false} />
            <Cyl pos={[0, -0.02, 0]} r={1.35} h={0.08} color="#3a3a3a" mat="metal" solid={false} cast={false} />
          </group>
          {[0, 1, 2, 3].map((i) => (
            <Block
              key={i}
              pos={[Math.sin((i * Math.PI) / 2) * 1.05, Math.cos((i * Math.PI) / 2) * 1.05, 0.08]}
              size={[0.14, 0.14, 0.04]}
              color={i === 0 ? '#b5523b' : '#3a3a3a'}
              mat="metal"
              solid={false}
              cast={false}
            />
          ))}
          <group rotation-z={aguja}>
            <Block
              pos={[0, 0.45, 0.12]}
              size={[0.07, 0.95, 0.03]}
              color="#1d1d1f"
              mat="metal"
              solid={false}
              cast={false}
            />
          </group>
          <group rotation-z={-((s.hora + s.minutos / 60) / 12) * Math.PI * 2}>
            <Block
              pos={[0, 0.28, 0.14]}
              size={[0.1, 0.6, 0.03]}
              color="#1d1d1f"
              mat="metal"
              solid={false}
              cast={false}
            />
          </group>
        </group>
        <group position={[2, 4.45, -3.4]} rotation-z={Math.sin(m.tiempo * 14) * s.campana * 0.4}>
          <Cyl pos={[0, -0.25, 0]} r={0.2} rTop={0.42} h={0.6} color="#d9a520" mat="gold" solid={false} />
        </group>
        {s.campana > 0 && (
          <Label
            pos={[2, 5.2, -3.2]}
            text={p.loco ? '¡Buuurp… DONG!' : '¡DONG!'}
            h={0.4}
            bg={s.racha > 0 ? '#2a9d8f' : '#c0392b'}
          />
        )}
        <group position={[2, 1.5, -3.1]} rotation-z={pendulo}>
          <Block pos={[0, -0.45, 0]} size={[0.05, 0.9, 0.04]} color="#8a8f96" mat="metal" solid={false} cast={false} />
          <Ball pos={[0, -0.95, 0]} r={0.18} color="#d9a520" mat="gold" />
        </group>
        <Label pos={[4.1, 1, -2.9]} text={`Péndulo ${perilla(s) >= 0 ? '+' : ''}${perilla(s).toFixed(1)}`} h={0.26} />
        {/* tablero de la transmisión: tres ejes */}
        <Block pos={[-4.6, 1.6, -1.6]} size={[5.4, 2.4, 0.2]} color="#6b4226" mat="wood" solid={false} />
        {EJES_X.map((x, e) => {
          const i = enEje(s, e);
          return (
            <group key={e}>
              <Cyl pos={[x, 1.6, -1.35]} r={0.07} h={0.4} color="#3a3a3a" mat="metal" solid={false} cast={false} />
              {i >= 0 && (
                <Engranaje
                  pos={[x, 1.6, -1.35]}
                  dientes={s.ruedas[i].dientes}
                  giro={giro * (e % 2 ? -1 : 1)}
                  color={p.loco ? '#b8b0a0' : '#e0b040'}
                />
              )}
              {p.loco && i >= 0 && (
                <Block
                  pos={[x, 1.6, -1.15]}
                  size={[1.1, 1.1, 0.04]}
                  color="#f4ecd8"
                  mat="cloth"
                  solid={false}
                  cast={false}
                />
              )}
              <Label
                pos={[x, 2.95, -1.3]}
                text={`${s.sel === e ? '▶ ' : ''}Eje ${e + 1}${p.loco ? '' : i >= 0 ? ` · ${s.ruedas[i].dientes}` : ' · vacío'}`}
                h={0.24}
                bg={s.sel === e ? '#c0392b' : '#14627a'}
              />
            </group>
          );
        })}
        {p.loco && (
          <>
            {[0, 1, 2].map((i) => (
              <Block
                key={i}
                pos={[-3 + Math.sin(m.tiempo * 1.3 + i * 2) * 1.6, 3.4 + ((m.tiempo * 0.6 + i * 0.33) % 1) * 1.4, -3]}
                size={[0.36, 0.26, 0.02]}
                color="#fffdf2"
                mat="cloth"
                solid={false}
                cast={false}
              />
            ))}
            <Label pos={[-4.6, 3.35, -1.4]} text="Réplica de papel: masca minutos" h={0.22} bg="#7a3b1f" />
          </>
        )}
        {/* bandeja de ruedas */}
        <Mesa pos={[-2.4, 0, 1.6]} size={[8.2, 1.4]} />
        {s.ruedas.map((r, i) => {
          const x = -6 + i * 1.45;
          return (
            <group key={i}>
              {i === sel && (
                <Block
                  pos={[x, 0.9, 1.6]}
                  size={[1.25, 0.04, 1.2]}
                  color="#ffd166"
                  mat="neon"
                  solid={false}
                  cast={false}
                />
              )}
              {r.eje < 0 ? (
                <group position={[x, 1.05, 1.6]} rotation-x={-Math.PI / 2}>
                  <Engranaje pos={[0, 0, 0]} dientes={r.dientes} s={0.85} />
                </group>
              ) : (
                <Cyl pos={[x, 0.9, 1.6]} r={0.2} h={0.04} color="#5a3d26" mat="wood" solid={false} cast={false} />
              )}
              <Label
                pos={[x, 1.75, 1.9]}
                text={r.eje < 0 ? `${r.dientes}` : `→ eje ${r.eje + 1}`}
                h={0.24}
                bg={i === sel ? '#c0392b' : '#3a3a3a'}
              />
            </group>
          );
        })}
      </Taller>
    );
  },
});
export const Reloj = motor.Escena;
export const guia = motor.guia;
