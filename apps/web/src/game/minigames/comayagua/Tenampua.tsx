// Terrazas en sombra: bloques de réplica en tres terrazas; su sombra en la pared tiene que calzar con el relieve.
import { input } from '../../../core/input';
import { Ball, Block, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { acercar, cursor, haciaIndice, indice, metasLineales, moverCursor, reloj, Taller, texto, turno } from './comun';

const COLS = 7;
const NIVELES = 3;
const CELDA = 1.05;
const X0 = -5.6;
const ALTURA = 0.42;
type Bloque = { ancho: number; alto: number; col: number; meta: number };
type Terraza = { bloques: Bloque[]; estable: boolean };
type Estado = {
  c: ReturnType<typeof cursor>;
  terrazas: Terraza[];
  sombra: number;
  sel: number;
  ronda: number;
  vuelta: number;
  azar: () => number;
  espera: number;
  ayuda: boolean;
  estables: number;
  derrumbes: number;
  asentadas: number;
  cambios: number;
  aviso: string;
};
type Param = { bloques: number; sombras: number[]; nombre: string; semilla: number };
type Sesion = Motor<Param, Estado>;
// la terraza 0 es la de atrás (más alta) y la 2 la de adelante
const zDe = (n: number) => -2.7 + n * 1.7;
const yDe = (n: number) => 1.5 - n * 0.6;
const xDe = (col: number) => X0 + col * CELDA;
const nivelSel = (s: Estado) => indice(-s.c.y, NIVELES);

/** Alturas por columna que deja un juego de bloques corrido `sombra` columnas (la luz viene de la izquierda). */
function perfil(bloques: Bloque[], sombra: number, campo: 'col' | 'meta') {
  const h = Array.from({ length: COLS }, () => 0);
  for (const b of bloques)
    for (let k = 0; k < b.ancho; k++) {
      const x = b[campo] + k + sombra;
      if (x >= 0 && x < COLS) h[x] = Math.max(h[x], b.alto);
    }
  return h;
}
const ocupa = (bloques: Bloque[], salvo: Bloque, col: number) =>
  bloques.some((b) => b !== salvo && col < b.col + b.ancho && b.col < col + salvo.ancho);
function calza(t: Terraza, sombra: number) {
  const a = perfil(t.bloques, sombra, 'col'),
    b = perfil(t.bloques, sombra, 'meta');
  return a.every((v, i) => v === b[i]);
}
function ronda(s: Estado, p: Param) {
  s.ronda++;
  s.sombra = p.sombras[Math.floor(s.azar() * p.sombras.length)];
  const min = Math.max(0, -s.sombra),
    max = COLS - Math.max(0, s.sombra);
  s.terrazas = Array.from({ length: NIVELES }, () => {
    const anchos = Array.from({ length: p.bloques }, () => 1 + Math.floor(s.azar() * 2));
    // metas sin encimarse, dentro de lo que la sombra deja ver
    const bloques: Bloque[] = [];
    let x = min + Math.floor(s.azar() * 2);
    for (const ancho of anchos) {
      if (x + ancho > max) break;
      bloques.push({ ancho, alto: 1 + Math.floor(s.azar() * 2), col: 0, meta: x });
      x += ancho + Math.floor(s.azar() * 2);
    }
    // arrancan apilados a la orilla contraria para que no calcen solos
    let y = COLS;
    for (const b of [...bloques].reverse()) {
      y -= b.ancho;
      b.col = y;
    }
    const t = { bloques, estable: false };
    if (calza(t, s.sombra)) {
      let z = 0;
      for (const b of bloques) {
        b.col = z;
        z += b.ancho;
      }
    }
    return t;
  });
  s.sel = 0;
  s.c.y = 1;
  s.c.x = haciaIndice(s.terrazas[0].bloques[0]?.col ?? 0, COLS);
  s.vuelta = 0;
}
function bloqueSel(s: Estado) {
  const t = s.terrazas[nivelSel(s)];
  return t.bloques[s.sel % Math.max(1, t.bloques.length)];
}
function siguiente(m: Sesion) {
  const s = m.datos;
  const t = s.terrazas[nivelSel(s)];
  if (!t.bloques.length || t.estable) return;
  s.sel = (s.sel + 1) % t.bloques.length;
  s.cambios++;
  s.c.x = haciaIndice(t.bloques[s.sel].col, COLS);
}
function asentar(m: Sesion) {
  const s = m.datos;
  const n = nivelSel(s);
  const t = s.terrazas[n];
  if (t.estable || s.vuelta > 0) return;
  s.asentadas++;
  if (calza(t, s.sombra)) {
    t.estable = true;
    s.estables++;
    m.sumar(25);
    s.aviso = `¡Terraza ${NIVELES - n} estable! +25`;
    if (s.terrazas.every((x) => x.estable)) {
      m.sumar(30);
      s.aviso = '¡Las tres terrazas calzan con el relieve! +30. El sol se mueve…';
      s.vuelta = 2;
    }
  } else {
    s.derrumbes++;
    // con compa, él sostiene el relleno y el intento fallido no resta
    if (!s.ayuda) m.sumar(-10);
    s.aviso = s.ayuda
      ? 'La sombra no calza; tu compa sostiene el relleno.'
      : 'La sombra no calza: el relleno se desacomoda. −10';
  }
}
const motor = defineMotor({
  id: 'comayagua.tenampua',
  modos: { duo: { tipo: 'apoyo' }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'ruinas',
  guia: {
    goal: 'Corré los bloques de réplica en su terraza hasta que su sombra llene el relieve dorado. Cada terraza con lo suyo.',
    keys: [
      ['W / S', 'elegir terraza'],
      ['A / D', 'deslizar el bloque'],
      ['E / mando X', 'otro bloque'],
      ['F / clic / RT', 'asentar la terraza'],
      ['Mouse / stick derecho', 'terraza (↑↓) y bloque (←→)'],
    ],
    touch: [
      ['Palanca / arrastrá', 'terraza y bloque'],
      ['E', 'otro bloque'],
      ['🎯', 'asentar'],
    ],
  },
  etapa: (p) => ({
    bloques: p.dif < 0.4 ? 2 : 3,
    sombras: p.dif < 0.3 ? [1] : p.dif < 0.7 ? [1, -1] : [1, -1, 2],
    nombre: texto(p.tema.nombre, 'Terrazas del cerro'),
    semilla: p.seed,
  }),
  metas: metasLineales(100, 220, 340, 40),
  duracion: reloj(80, 10),
  crear: (p): Estado => {
    const s: Estado = {
      c: cursor(0, 1),
      terrazas: [],
      sombra: 1,
      sel: 0,
      ronda: 0,
      vuelta: 0,
      azar: rng(p.semilla),
      espera: 0.5,
      ayuda: false,
      estables: 0,
      derrumbes: 0,
      asentadas: 0,
      cambios: 0,
      aviso: 'La sombra cae corrida: llená el relieve dorado con ella.',
    };
    ronda(s, p);
    return s;
  },
  actualizar: (m, dt) => {
    const s = m.datos;
    const antes = nivelSel(s);
    moverCursor(s.c, dt, 1.1);
    if (nivelSel(s) !== antes) {
      // al cambiar de terraza el cursor salta al primer bloque: nada se mueve sin querer
      s.sel = 0;
      const b0 = bloqueSel(s);
      if (b0) s.c.x = haciaIndice(b0.col, COLS);
    }
    if (input.take('use')) siguiente(m);
    if (input.take('fire')) asentar(m);
    const t = s.terrazas[nivelSel(s)];
    const b = bloqueSel(s);
    if (b && !t.estable) {
      // el bloque sigue al cursor, pero no se encima ni se sale de su terraza
      const quiere = Math.max(0, Math.min(COLS - b.ancho, indice(s.c.x, COLS)));
      const paso = Math.sign(quiere - b.col);
      while (b.col !== quiere && !ocupa(t.bloques, b, b.col + paso)) b.col += paso;
    }
    if (s.vuelta > 0) {
      s.vuelta -= dt;
      if (s.vuelta <= 0) ronda(s, m.parametros);
    }
    m.objetivo = s.aviso;
    m.lineas = [
      `Terraza ${NIVELES - nivelSel(s)} · bloque ${(s.sel % Math.max(1, t.bloques.length)) + 1}/${t.bloques.length}${t.estable ? ' · ✓ estable' : ''}`,
      `Sombra corrida ${s.sombra > 0 ? `${s.sombra} → ` : `${-s.sombra} ←`} · Ronda ${s.ronda} · Estables ${s.estables}`,
    ];
    m.stats = {
      estables: s.estables,
      derrumbes: s.derrumbes,
      asentadas: s.asentadas,
      cambios: s.cambios,
      nivel: nivelSel(s),
      col: b?.col ?? -1,
      ronda: s.ronda,
    };
  },
  bot: (m, dt, actor) => {
    const s = m.datos;
    if (actor === 'compa') {
      s.ayuda = true;
      return;
    }
    if (s.vuelta > 0) return;
    s.c.auto = true;
    const n = s.terrazas.findIndex((t) => !t.estable);
    if (n < 0) return;
    const y = -haciaIndice(n, NIVELES);
    s.c.y = acercar(s.c.y, y, dt * 2);
    if (nivelSel(s) !== n) return;
    const t = s.terrazas[n];
    const b = bloqueSel(s);
    if (!b) return;
    const listo = t.bloques.every((x) => x.col === x.meta);
    if (listo) {
      if (turno(s, dt, 0.5)) asentar(m);
      return;
    }
    if (b.col === b.meta) {
      if (turno(s, dt, 0.4)) siguiente(m);
      return;
    }
    s.c.x = acercar(s.c.x, haciaIndice(b.meta, COLS), dt * 1.1);
    // si otro bloque le estorba, cambia al siguiente
    const x = indice(s.c.x, COLS);
    if (x === b.meta && b.col !== b.meta && turno(s, dt, 0.6)) siguiente(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    const sel = nivelSel(s);
    const bsel = bloqueSel(s);
    return (
      <Taller nombre={m.parametros.nombre} aviso="W/S terraza · A/D bloque · E otro · F asentar">
        <Ball pos={[s.sombra > 0 ? -7.6 : 4.4, 3.6, -0.5]} r={0.45} color="#ffd166" mat="neon" cast={false} />
        <Label
          pos={[s.sombra > 0 ? -7.6 : 4.4, 2.8, -0.5]}
          text={`Sol · sombra ${s.sombra > 0 ? '→' : '←'} ${Math.abs(s.sombra)}`}
          h={0.26}
          bg="#e76f51"
        />
        {s.terrazas.map((t, n) => {
          const z = zDe(n),
            y = yDe(n);
          const meta = perfil(t.bloques, s.sombra, 'meta');
          const sombra = perfil(t.bloques, s.sombra, 'col');
          return (
            <group key={n}>
              <Block
                pos={[X0 + (COLS * CELDA) / 2 - CELDA / 2, y / 2, z + 0.2]}
                size={[COLS * CELDA + 0.4, y, 1.75]}
                color={t.estable ? '#a8b58a' : '#b9a27c'}
                mat="stone"
                solid={false}
              />
              <Block
                pos={[X0 + (COLS * CELDA) / 2 - CELDA / 2, y + 0.55, z - 0.6]}
                size={[COLS * CELDA + 0.4, 1.1, 0.12]}
                color="#d9ccb0"
                mat="stone"
                solid={false}
              />
              {meta.map((h, i) =>
                h ? (
                  <Block
                    key={`m${i}`}
                    pos={[xDe(i), y + 0.04 + (h * ALTURA) / 2, z - 0.53]}
                    size={[CELDA * 0.98, h * ALTURA + 0.08, 0.02]}
                    color="#e9b949"
                    mat="neon"
                    solid={false}
                    cast={false}
                  />
                ) : null,
              )}
              {sombra.map((h, i) =>
                h ? (
                  <Block
                    key={`s${i}`}
                    pos={[xDe(i), y + (h * ALTURA) / 2, z - 0.5]}
                    size={[CELDA * 0.8, h * ALTURA - 0.02, 0.02]}
                    color={h === meta[i] ? '#3a3226' : '#5a2a2a'}
                    mat="cloth"
                    solid={false}
                    cast={false}
                  />
                ) : null,
              )}
              {t.bloques.map((b, k) => (
                <Block
                  key={k}
                  pos={[xDe(b.col) + ((b.ancho - 1) * CELDA) / 2, y + (b.alto * ALTURA) / 2, z + 0.25]}
                  size={[b.ancho * CELDA - 0.1, b.alto * ALTURA, 0.7]}
                  color={b === bsel && n === sel && !t.estable ? '#f1d9a8' : '#c9b28a'}
                  mat="stone"
                  solid={false}
                />
              ))}
              <Label
                pos={[X0 - 1.3, y + 0.5, z]}
                text={`${n === sel ? '▶ ' : ''}${t.estable ? '✓ ' : ''}T${NIVELES - n}`}
                h={0.38}
                bg={t.estable ? '#2a9d8f' : n === sel ? '#c0392b' : '#5b3a24'}
              />
            </group>
          );
        })}
        <Label pos={[X0 + 3, 3.2, -3.9]} text="Réplicas: el cerro de verdad no se toca" h={0.24} bg="#5b3a24" />
      </Taller>
    );
  },
});
export const Tenampua = motor.Escena;
export const guia = motor.guia;
