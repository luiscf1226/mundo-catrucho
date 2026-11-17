import { input } from '../../../core/input';
import { Block, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { aviso, casilla, controles, cursor, duracion, ejeDe, entre, Mesa, metas, mover, revolver } from './comun';

const TIRAS = 3;
const COLORES = ['#d8c27a', '#b5c96a', '#e9c46a', '#a8b858', '#cdb36a', '#c2b668'];
type Estado = ReturnType<typeof cursor> & {
  largo: number;
  /** lo cortado de cada tira, en orden */
  cortes: number[][];
  cola: number[];
  espera: number;
  mirando: number;
  piezas: number;
  tejidos: number;
  empalmes: number;
  trabados: number;
  intentos: number;
  azar: () => number;
};
type Sesion = Motor<{ largo: number; justo: boolean; seed: number }, Estado>;
const usado = (c: number[]) => c.reduce((a, b) => a + b, 0);
/** ¿Se puede terminar la cola desde aquí? Devuelve la tira para la primera pieza, o −1. */
function plan(libres: number[], cola: number[]): number {
  if (!cola.length) return 0;
  const [pieza, ...resto] = cola,
    vistos = new Set<number>();
  for (let t = 0; t < libres.length; t++) {
    if (libres[t] < pieza || vistos.has(libres[t])) continue;
    vistos.add(libres[t]);
    const otra = [...libres];
    otra[t] -= pieza;
    if (plan(otra, resto) >= 0) return t;
  }
  return -1;
}
function patron(m: Sesion) {
  const s = m.datos,
    p = m.parametros;
  s.largo = p.largo;
  const piezas: number[] = [];
  for (let t = 0; t < TIRAS; t++) {
    let falta = p.largo;
    while (falta > 0) {
      const n = falta <= 6 ? falta : entre(s.azar, 2, Math.min(6, falta - 2));
      piezas.push(n);
      falta -= n;
    }
  }
  // en las primeras etapas sobra una pieza entera de margen
  if (!p.justo) piezas.splice(piezas.indexOf(Math.min(...piezas)), 1);
  s.cola = revolver(piezas, s.azar);
  s.cortes = Array.from({ length: TIRAS }, () => []);
  s.mirando = 0;
}
function cortar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.intentos++;
  s.espera = 0.5;
  const t = casilla(s.x, TIRAS),
    pieza = s.cola[0],
    libre = s.largo - usado(s.cortes[t]);
  if (pieza > libre) {
    s.empalmes++;
    m.sumar(-25);
    aviso(`A esa tira le quedan ${libre}: un empalme no da los ${pieza}.`, '✂️');
    return;
  }
  s.cortes[t].push(pieza);
  s.cola.shift();
  s.piezas++;
  m.sumar(15);
  s.mirando = 0;
  const libres = s.cortes.map((c) => s.largo - usado(c));
  if (!s.cola.length) {
    s.tejidos++;
    const retazo = libres.some((l) => l === 1);
    m.sumar(retazo ? 10 : 40);
    aviso(retazo ? 'Completo, pero quedó un retazo que no sirve.' : '¡El junco rindió entero!', '🌾');
    patron(m);
  } else if (plan(libres, s.cola) < 0) {
    s.trabados++;
    m.sumar(-30);
    aviso('Con esos cortes ya no rinde: lo que viene no cabe sin empalmar.', '🧶');
    patron(m);
  }
}
const motor = defineMotor({
  id: 'santabarbara.juncocorte',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'pueblo',
  guia: {
    goal: 'Cada pieza de la fila sale de una sola tira: un empalme no sirve. Elegí la tira y F corta la pieza que sigue. Pensá en las que vienen: anchos que se completan dejan sobrantes enteros.',
    ...controles(),
  },
  etapa: (p) => ({ largo: 10 + Math.round(p.dif * 4), justo: p.dif > 0.3, seed: p.seed }),
  metas,
  duracion,
  crear: (p): Estado => ({
    ...cursor(),
    largo: p.largo,
    cortes: [],
    cola: [],
    espera: 0,
    mirando: 0,
    piezas: 0,
    tejidos: 0,
    empalmes: 0,
    trabados: 0,
    intentos: 0,
    azar: rng(p.seed),
  }),
  actualizar(m, dt) {
    const s = m.datos;
    if (!s.cola.length) patron(m);
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.mirando += dt;
    if (input.take('fire')) cortar(m);
    const t = casilla(s.x, TIRAS);
    m.objetivo = `Cortá la pieza de ${s.cola[0] ?? 0}`;
    m.lineas = [
      `Tira ${t + 1}: le quedan ${s.largo - usado(s.cortes[t] ?? [])} · Siguen ${s.cola.slice(1, 5).join(', ') || 'ninguna'}`,
      `Piezas ${s.piezas} · Tejidos ${s.tejidos} · Empalmes ${s.empalmes} · Trabados ${s.trabados}`,
    ];
    m.stats = {
      x: s.x,
      piezas: s.piezas,
      tejidos: s.tejidos,
      empalmes: s.empalmes,
      trabados: s.trabados,
      intentos: s.intentos,
    };
  },
  bot(m) {
    const s = m.datos;
    if (s.espera > 0 || s.mirando < 1.2 || !s.cola.length) return;
    const t = plan(
      s.cortes.map((c) => s.largo - usado(c)),
      s.cola,
    );
    if (t < 0) return;
    s.auto = true;
    s.x = ejeDe(t, TIRAS);
    cortar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      sel = casilla(s.x, TIRAS),
      escala = 5 / Math.max(1, s.largo);
    return (
      <Mesa titulo="Ilama · el junco rinde entero">
        {s.cortes.map((c, t) => {
          const x = -1 + ejeDe(t, TIRAS) * 2.6 - 1,
            libre = s.largo - usado(c);
          let z = 2.4;
          return (
            <group key={t}>
              <Block
                pos={[x, 0.74, 2.4 - (s.largo * escala) / 2]}
                size={[0.7, 0.04, s.largo * escala]}
                color={t === sel ? '#ffe8a3' : '#efe6c8'}
                mat="cloth"
                solid={false}
              />
              {c.map((n, i) => {
                const centro = z - (n * escala) / 2;
                z -= n * escala;
                return (
                  <group key={i}>
                    <Block
                      pos={[x, 0.8, centro]}
                      size={[0.6, 0.08, n * escala - 0.06]}
                      color={COLORES[(t * 3 + i) % COLORES.length]}
                      mat="leaf"
                      solid={false}
                    />
                    <Label pos={[x + 0.55, 1, centro]} text={`${n}`} h={0.24} />
                  </group>
                );
              })}
              <Label pos={[x, 1.2, 2.9]} text={`Tira ${t + 1} · quedan ${libre}`} h={0.24} />
            </group>
          );
        })}
        {s.cola.slice(0, 6).map((n, i) => (
          <group key={i}>
            <Block
              pos={[2.6 + (n * escala) / 2, 0.8, -2.2 + i * 0.75]}
              size={[n * escala, 0.08, 0.4]}
              color={i === 0 ? '#ffd166' : '#b5c96a'}
              mat="leaf"
              solid={false}
            />
            <Label pos={[2.3, 1, -2.2 + i * 0.75]} text={`${n}`} h={0.26} />
          </group>
        ))}
        <Label pos={[3.4, 1.5, -2.9]} text="Piezas que pide el tejido" h={0.26} />
      </Mesa>
    );
  },
});
export const Tiras = motor.Escena;
export const guia = motor.guia;
