// Eco de Taulabé: chasquido, eco y plano. El retardo se ve (anillo que vuelve y barra) además de oírse.
import { audio } from '../../../core/audio';
import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label, P } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import {
  acercar,
  cursor,
  haciaIndice,
  indice,
  loco,
  metasLineales,
  moverCursor,
  reloj,
  Taller,
  texto,
  turno,
} from './comun';

const RUMBOS = [-60, -30, 0, 30, 60].map((g) => (g * Math.PI) / 180);
const N = RUMBOS.length;
const SONIDO = 12;
const UMBRAL = 0.9;
const ESCALA = 0.62;
const CENTRO: [number, number] = [-1.8, 3];
/** Galería dibujada sin medir su eco ni poder deducirla. Con ~1,75 galerías y ~1,9 paredes por cruce, marcar
 *  al azar rinde −18 por cruce en promedio (con +30 rendía +17 y el oro salía sin chasquear). */
const A_CIEGAS = 10;
type Rumbo = { lejos: number; abierto: boolean; eco: number | null; marca: 0 | 1 | -1 };
type Pulso = { rumbo: number; t: number; vuelta: number; oido: boolean };
type Estado = {
  c: ReturnType<typeof cursor>;
  rumbos: Rumbo[];
  pulso: Pulso | null;
  pulsos: number;
  cruce: number;
  errados: number;
  pasar: number;
  plano: boolean[][];
  azar: () => number;
  espera: number;
  ayuda: boolean;
  galerias: number;
  paredes: number;
  emitidos: number;
  aviso: string;
};
type Param = { loco: boolean; pulsos: number; pared: number; nombre: string; semilla: number };
type Sesion = Motor<Param, Estado>;
const retardo = (r: Rumbo) => (2 * r.lejos) / SONIDO;
const abiertas = (s: Estado) => s.rumbos.filter((r) => r.abierto).length;

function cruceNuevo(s: Estado, p: Param) {
  const n = 1 + Math.floor(s.azar() * 2.4);
  const abiertos = new Set<number>();
  while (abiertos.size < n) abiertos.add(Math.floor(s.azar() * N));
  s.rumbos = RUMBOS.map((_, i) => {
    const abierto = abiertos.has(i);
    return {
      abierto,
      lejos: abierto ? 6.2 + s.azar() * 3 : 1.6 + s.azar() * p.pared,
      eco: null,
      marca: 0,
    };
  });
  s.errados = 0;
  s.cruce++;
  // un pulso en vuelo es del cruce anterior: su eco no se escribe en los rumbos nuevos
  s.pulso = null;
}
function chasquido(m: Sesion) {
  const s = m.datos;
  if (s.pulso || s.pasar > 0) return;
  if (s.pulsos <= 0) {
    s.aviso = 'Sin pulsos: el plano va a quedar incompleto. Marcá a tu suerte.';
    return;
  }
  const i = indice(s.c.x, N);
  s.pulsos--;
  s.emitidos++;
  s.pulso = { rumbo: i, t: 0, vuelta: retardo(s.rumbos[i]), oido: false };
  audio.tone(1900, 0.04, { type: 'square', gain: 0.08 });
}
function marcar(m: Sesion) {
  const s = m.datos;
  if (s.pasar > 0) return;
  const r = s.rumbos[indice(s.c.x, N)];
  if (r.marca) return;
  // sin oír su eco, el rumbo solo es seguro si todo lo que falta por medir tiene que ser galería
  const sinMedir = s.rumbos.filter((x) => x.eco === null && !x.marca).length;
  const pendientes = s.rumbos.filter((x) => x.abierto && x.marca !== 1).length;
  const sabido = r.eco !== null || sinMedir === pendientes;
  if (r.abierto) {
    r.marca = 1;
    s.galerias++;
    // dibujar a ciegas paga poco: marcar al azar no conviene
    const pago = sabido ? 30 : A_CIEGAS;
    m.sumar(pago);
    s.aviso = sabido ? `¡Galería dibujada en el plano! +${pago}` : `Le atinaste sin medir: +${pago}.`;
  } else {
    r.marca = -1;
    s.paredes++;
    s.errados++;
    m.sumar(-20);
    s.aviso = 'Ahí había pared: el plano se manchó. −20';
  }
  if (s.rumbos.every((x) => !x.abierto || x.marca === 1)) {
    if (!s.errados) m.sumar(20);
    s.aviso = s.errados ? 'Cruce dibujado, con manchones.' : '¡Cruce limpio! +20. Seguimos adentro.';
    s.plano.push(s.rumbos.map((x) => x.abierto));
    if (s.plano.length > 6) s.plano.shift();
    s.pasar = 1;
  }
}
const motor = defineMotor({
  id: 'comayagua.eco',
  fondo: 'cueva',
  guia: {
    goal: 'Apuntá, chasqueá y mirá cuánto tarda el eco: si tarda más de 0.9 s hay galería. Dibujá solo las galerías.',
    keys: [
      ['A / D', 'apuntar el chasquido'],
      ['F / clic / RT', 'chasquido'],
      ['E / mando X', 'dibujar galería'],
      ['Mouse / stick derecho', 'apuntar'],
    ],
    touch: [
      ['Palanca / arrastrá', 'apuntar'],
      ['🎯', 'chasquido'],
      ['E', 'dibujar galería'],
    ],
  },
  etapa: (p) => ({
    loco: loco(p),
    pulsos: Math.round(26 - p.dif * 8),
    pared: 2 + p.dif * 1.4,
    nombre: texto(p.tema.nombre, 'Eco en la cueva'),
    semilla: p.seed,
  }),
  metas: metasLineales(100, 220, 340, 40),
  duracion: reloj(80, 10),
  crear: (p): Estado => {
    const s: Estado = {
      c: cursor(),
      rumbos: [],
      pulso: null,
      pulsos: p.pulsos,
      cruce: 0,
      errados: 0,
      pasar: 0,
      plano: [],
      azar: rng(p.semilla),
      espera: 0.5,
      ayuda: false,
      galerias: 0,
      paredes: 0,
      emitidos: 0,
      aviso: 'Chasqueá hacia cada rumbo y mirá el retardo.',
    };
    cruceNuevo(s, p);
    return s;
  },
  actualizar: (m, dt) => {
    const s = m.datos;
    moverCursor(s.c, dt, 1.4);
    if (input.take('fire')) chasquido(m);
    if (input.take('use')) marcar(m);
    if (s.pulso) {
      s.pulso.t += dt * (s.ayuda ? 1.3 : 1);
      if (!s.pulso.oido && s.pulso.t >= s.pulso.vuelta) {
        s.pulso.oido = true;
        const r = s.rumbos[s.pulso.rumbo];
        r.eco = s.pulso.vuelta;
        audio.tone(1500, 0.05, { type: 'square', gain: 0.05 });
        s.aviso =
          r.eco > UMBRAL
            ? `Eco largo (${r.eco.toFixed(2)} s): parece galería.`
            : `Eco corto (${r.eco.toFixed(2)} s): pared.`;
      }
      // en el modo loco el chisme repite el eco dos veces más; el primero es el que manda
      if (s.pulso.t >= s.pulso.vuelta * (m.parametros.loco ? 3 : 1)) s.pulso = null;
    }
    if (s.pasar > 0) {
      s.pasar -= dt;
      if (s.pasar <= 0) cruceNuevo(s, m.parametros);
    }
    s.ayuda = false;
    const r = s.rumbos[indice(s.c.x, N)];
    m.objetivo = s.aviso;
    m.lineas = [
      `Pulsos ${s.pulsos} · Galerías por dibujar ${abiertas(s) - s.rumbos.filter((x) => x.marca === 1).length} · Cruce ${s.cruce}`,
      r.eco === null
        ? 'Rumbo sin medir'
        : m.parametros.loco
          ? `Ecos ${[1, 2, 3]
              .map((k) => (r.eco ?? 0) * k)
              .map((v) => v.toFixed(2))
              .join(' · ')} s (el primero manda)`
          : `Eco de este rumbo ${r.eco.toFixed(2)} s ${r.eco > UMBRAL ? '→ galería' : '→ pared'}`,
    ];
    m.stats = {
      galerias: s.galerias,
      paredes: s.paredes,
      pulsos: s.pulsos,
      emitidos: s.emitidos,
      cruce: s.cruce,
      rumbo: indice(s.c.x, N),
      medidos: s.rumbos.filter((x) => x.eco !== null).length,
    };
  },
  bot: (m, dt, actor) => {
    const s = m.datos;
    if (actor === 'compa') {
      s.ayuda = true;
      return;
    }
    if (s.pulso || s.pasar > 0) return;
    const encontradas = s.rumbos.filter((r) => r.eco !== null && r.eco > UMBRAL).length;
    // marca lo que ya oyó largo; si faltan, mide rumbos nuevos, salvo que lo que queda sin medir tenga que ser
    // galería; sin pulsos, se la juega
    let i = s.rumbos.findIndex((r) => r.eco !== null && r.eco > UMBRAL && !r.marca);
    let accion: 'marcar' | 'medir' = 'marcar';
    if (i < 0 && encontradas < abiertas(s)) {
      i = s.rumbos.findIndex((r) => r.eco === null && !r.marca);
      const sinMedir = s.rumbos.filter((r) => r.eco === null && !r.marca).length;
      const pendientes = s.rumbos.filter((r) => r.abierto && r.marca !== 1).length;
      accion = s.pulsos > 0 && sinMedir > pendientes ? 'medir' : 'marcar';
    }
    if (i < 0) return;
    const x = haciaIndice(i, N);
    s.c.x = acercar(s.c.x, x, dt * 2.4);
    s.c.auto = true;
    if (s.c.x !== x || !turno(s, dt, 0.45)) return;
    if (accion === 'medir') chasquido(m);
    else marcar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    const sel = indice(s.c.x, N);
    const [cx, cz] = CENTRO;
    const pulso = s.pulso;
    return (
      <Taller nombre={m.parametros.nombre} aviso="A/D apuntá · F chasquido · E dibujá la galería">
        <Cyl pos={[cx, 0.03, cz - 2.6]} r={6.2} h={0.06} color="#3b332c" mat="stone" solid={false} cast={false} />
        <Ball pos={[cx, 0.5, cz]} r={0.32} color="#ffd166" mat="neon" cast={false} />
        <Label pos={[cx, 1.3, cz + 0.2]} text="Vos" h={0.24} />
        {s.rumbos.map((r, i) => {
          const a = RUMBOS[i];
          const sx = Math.sin(a),
            sz = -Math.cos(a);
          const largo = r.lejos * ESCALA;
          const visto = r.eco !== null || r.marca !== 0;
          return (
            <group key={i}>
              <group position={[cx, 0.08, cz]} rotation-y={-a}>
                <Block
                  pos={[0, 0, -3]}
                  size={[i === sel ? 0.18 : 0.07, 0.03, 6]}
                  color={i === sel ? '#ffe28a' : '#6b6055'}
                  mat={i === sel ? 'neon' : 'stone'}
                  solid={false}
                  cast={false}
                />
                {r.marca === 1 && (
                  <Block
                    pos={[0, 0.03, -3]}
                    size={[0.42, 0.03, 6]}
                    color="#f4f1e8"
                    mat="cloth"
                    solid={false}
                    cast={false}
                  />
                )}
              </group>
              {visto && !r.abierto && (
                <P.Rock
                  pos={[cx + sx * largo, 0, cz + sz * largo]}
                  scale={0.42}
                  color={r.marca === -1 ? '#a33' : '#7a6e64'}
                  solid={false}
                />
              )}
              {r.eco !== null && (
                <Label
                  pos={[cx + sx * 3.4, 0.6, cz + sz * 3.4]}
                  text={`${r.eco.toFixed(2)} s${r.marca === 1 ? ' ✓' : r.marca === -1 ? ' ✗' : ''}`}
                  h={0.24}
                  bg={r.eco > UMBRAL ? '#2a9d8f' : '#6b4226'}
                />
              )}
            </group>
          );
        })}
        {pulso &&
          (() => {
            const a = RUMBOS[pulso.rumbo];
            const ida = pulso.vuelta / 2;
            const loco = m.parametros.loco;
            const ciclo = loco ? pulso.t % pulso.vuelta : pulso.t;
            const vuelta = Math.floor(pulso.t / pulso.vuelta);
            const d = (ciclo < ida ? ciclo / ida : 1 - (ciclo - ida) / ida) * s.rumbos[pulso.rumbo].lejos * ESCALA;
            return (
              <>
                <group position={[cx + Math.sin(a) * d, 0.5, cz - Math.cos(a) * d]} scale={1 + vuelta * 0.6}>
                  <group rotation-x={Math.PI / 2}>
                    <Cyl
                      pos={[0, 0, 0]}
                      r={0.36}
                      h={0.05}
                      color={ciclo < ida ? '#9be7ff' : '#ffd166'}
                      mat="neon"
                      solid={false}
                      cast={false}
                    />
                  </group>
                  {loco && vuelta > 0 && (
                    <Label pos={[0, 0.7, 0]} text={vuelta > 1 ? '💬💬 ¡hola!' : '💬 ¡hola!'} h={0.3} />
                  )}
                </group>
                <Block
                  pos={[2.6, 0.4 + Math.min(pulso.t, 1.6) * 0.9, 1.6]}
                  size={[0.3, 0.04, 0.3]}
                  color="#9be7ff"
                  mat="neon"
                  solid={false}
                  cast={false}
                />
              </>
            );
          })()}
        {/* barra de retardo: marca de 0.9 s */}
        <Block
          pos={[2.6, 1.12, 1.6]}
          size={[0.12, 1.44, 0.12]}
          color="#3a3a3a"
          mat="metal"
          solid={false}
          cast={false}
        />
        <Block
          pos={[2.6, 0.4 + UMBRAL * 0.9, 1.6]}
          size={[0.6, 0.05, 0.05]}
          color="#e63946"
          mat="neon"
          solid={false}
          cast={false}
        />
        <Label pos={[2.6, 2.1, 1.6]} text="0.9 s" h={0.24} bg="#e63946" />
        <Label pos={[2.6, 0.2, 2.3]} text="Retardo" h={0.24} bg="#3a3a3a" />
        {/* el plano: cruces ya dibujados */}
        <Block pos={[-6.6, 0.06, 2.4]} size={[2.6, 0.04, 2.4]} color="#f4ecd8" mat="cloth" solid={false} cast={false} />
        <Label pos={[-6.6, 0.6, 3.9]} text={`Tu plano · ${s.plano.length} cruces`} h={0.26} bg="#7a3b1f" />
        {s.plano.map((c, k) => (
          <group key={k} position={[-7.45 + (k % 3) * 0.85, 0.1, 3.05 - Math.floor(k / 3) * 1.1]}>
            <Block pos={[0, 0, 0]} size={[0.12, 0.03, 0.12]} color="#c0392b" mat="cloth" solid={false} cast={false} />
            {c.map((abierto, i) =>
              abierto ? (
                <group key={i} rotation-y={-RUMBOS[i]}>
                  <Block
                    pos={[0, 0, -0.22]}
                    size={[0.06, 0.02, 0.44]}
                    color="#3a3a3a"
                    mat="cloth"
                    solid={false}
                    cast={false}
                  />
                </group>
              ) : null,
            )}
          </group>
        ))}
        {[-4.5, -1, 2.2].map((x, i) => (
          <Cyl
            key={i}
            pos={[x, 3.8, -4.5 + i]}
            r={0.05}
            rTop={0.3}
            h={1.6}
            color="#8a7d70"
            mat="stone"
            solid={false}
            cast={false}
          />
        ))}
      </Taller>
    );
  },
});
export const Eco = motor.Escena;
export const guia = motor.guia;
