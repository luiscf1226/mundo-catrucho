// Volumen bajo el dosel: un escaneo LiDAR de práctica, columna por columna. Cortás la copa con un umbral de altura
// y quitás el ruido que cae debajo del suelo. Cortar bajo el suelo borra la evidencia del terreno.
import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover, variante } from './comun';

type Columna = {
  suelo: number;
  hojas: number[];
  ruido: number[];
  hueco: boolean;
  estado: 'pendiente' | 'bien' | 'mal' | 'perdida';
};
type Estado = ReturnType<typeof cursor> & {
  cols: Columna[];
  i: number;
  paciencia: number;
  mirando: number;
  espera: number;
  estornudo: number;
  achis: number;
  bien: number;
  mal: number;
  quitados: number;
  perdidas: number;
  azar: () => number;
};
type Param = { margen: number; ruido: number; doble: number; paciencia: number; huecos: boolean; seed: number };
type Sesion = Motor<Param, Estado>;

const TOL_HUECO = 0.14;
const alto = (h: number) => 1 + (h + 1) * 1.25;
const tope = (n: number) => Math.max(-0.95, Math.min(0.95, n));

function nueva(s: Estado, p: Param): Columna {
  const r = s.azar,
    a = s.cols[s.cols.length - 1],
    b = s.cols[s.cols.length - 2];
  // el hueco se deduce siguiendo la pendiente de las dos columnas anteriores
  const pendiente = a && b ? a.suelo - b.suelo : 0;
  const extrapolado = a ? a.suelo + pendiente : 0;
  const hueco = p.huecos && !!a && !!b && !a.hueco && extrapolado > -0.9 && extrapolado < 0.45 && r() < 0.3;
  const suelo = hueco ? extrapolado : Math.max(-0.9, Math.min(0.45, (a?.suelo ?? -0.2) + (r() - 0.5) * 0.7));
  const baja = suelo + p.margen + r() * 0.12;
  const hojas = [baja, ...[0, 1, 2].map(() => tope(baja + 0.1 + r() * (0.95 - baja)))];
  const ruido: number[] = [];
  if (!hueco && r() < p.ruido) ruido.push(Math.max(-1, suelo - 0.13 - r() * 0.25));
  if (!hueco && ruido.length && r() < p.doble) ruido.push(Math.max(-1, suelo - 0.2 - r() * 0.3));
  return { suelo, hojas, ruido, hueco, estado: 'pendiente' };
}
function siguiente(m: Sesion) {
  const s = m.datos;
  s.i++;
  while (s.cols.length < s.i + 6) s.cols.push(nueva(s, m.parametros));
  s.paciencia = m.parametros.paciencia;
  s.mirando = 0;
}
function cerrar(m: Sesion, c: Columna, bien: boolean, puntos: number, texto: string, icono: string) {
  const s = m.datos,
    antes = s.cols[s.i - 1];
  c.estado = bien ? 'bien' : 'mal';
  if (bien) s.bien++;
  else s.mal++;
  // relieve continuo: dos columnas bien seguidas suman extra
  m.sumar(puntos + (bien && antes?.estado === 'bien' ? 10 : 0));
  if (!bien) useGame.getState().toast(texto, icono);
  // equivocarse cuesta tiempo: así machacar F no compensa
  s.espera = bien ? 0.6 : 1;
  siguiente(m);
}
function cortar(m: Sesion) {
  const s = m.datos,
    c = s.cols[s.i];
  if (s.espera > 0 || !c) return;
  if (c.hueco) {
    if (Math.abs(s.y - c.suelo) <= TOL_HUECO) cerrar(m, c, true, 30, '', '');
    else cerrar(m, c, false, -25, 'Ese suelo no sigue la pendiente de los vecinos.', '📉');
    return;
  }
  if (c.suelo >= s.y) cerrar(m, c, false, -35, 'Borraste puntos bajos con las hojas: se perdió el terreno.', '🕳️');
  else if (c.hojas.some((h) => h < s.y))
    cerrar(m, c, false, -25, 'Quedaron hojas abajo: el relieve sale con chichotes.', '🍃');
  else if (c.ruido.length) cerrar(m, c, false, -25, 'El ruido quedó como suelo: quitalo antes de cortar.', '✳️');
  else cerrar(m, c, true, 30, '', '');
}
function quitar(m: Sesion) {
  const s = m.datos,
    c = s.cols[s.i];
  if (s.espera > 0 || !c) return;
  s.espera = 0.35;
  const toast = useGame.getState().toast;
  const puntos = [
    ...(c.hueco ? [] : [{ h: c.suelo, tipo: 'suelo' as const, k: 0 }]),
    ...c.hojas.map((h, k) => ({ h, tipo: 'hoja' as const, k })),
    ...c.ruido.map((h, k) => ({ h, tipo: 'ruido' as const, k })),
  ].sort((a, b) => Math.abs(a.h - s.y) - Math.abs(b.h - s.y));
  const p = puntos[0];
  if (!p || Math.abs(p.h - s.y) > 0.12) {
    m.sumar(-5);
    toast('Ahí no hay ningún punto que quitar.', '🔦');
  } else if (p.tipo === 'ruido') {
    c.ruido.splice(p.k, 1);
    s.quitados++;
    m.sumar(10);
  } else if (p.tipo === 'suelo') cerrar(m, c, false, -30, 'Quitaste el suelo: esa era la evidencia del terreno.', '🕳️');
  else {
    c.hojas.splice(p.k, 1);
    m.sumar(-5);
    toast('Esa era hoja: con el corte se iba sola.', '🍃');
  }
}
const COLOR = { suelo: '#9c6644', hoja: '#52b788', ruido: '#ff70a6' };
const CONFETI = ['#ffd166', '#06d6a0', '#ef476f', '#118ab2', '#f78c6b', '#c77dff'];

const motor = defineMotor({
  id: 'graciasadios.lidar',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'selva',
  guia: {
    goal: 'Cada columna del escaneo trae hojas (verde), suelo (café) y a veces ruido (rosado) debajo del suelo. Quitá el ruido con E y cortá la copa con F: el umbral va entre el suelo y la hoja más baja. Cortar debajo del suelo borra el terreno.',
    ...controles('cortar la copa', 'quitar el punto del umbral', 'subir o bajar el umbral'),
  },
  etapa: (p) => ({
    margen: 0.3 - p.dif * 0.12,
    ruido: 0.3 + p.dif * 0.3,
    doble: p.dif > 0.5 ? 0.35 : 0,
    paciencia: 9 - p.dif * 3,
    huecos: variante(p) === 'la-nube-de-puntos-estornudo',
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      cols: [],
      i: 0,
      paciencia: p.paciencia,
      mirando: 0,
      espera: 0,
      estornudo: p.huecos ? 5 : 1e9,
      achis: 0,
      bien: 0,
      mal: 0,
      quitados: 0,
      perdidas: 0,
      azar: rng(p.seed),
    };
    while (s.cols.length < 6) s.cols.push(nueva(s, p));
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos,
      c = s.cols[s.i];
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.mirando += dt;
    s.paciencia -= dt;
    s.achis = Math.max(0, s.achis - dt);
    s.estornudo -= dt;
    if (s.estornudo <= 0) {
      // la nube de utilería estornuda: por un ratito los colores no dicen nada; las alturas sí
      s.estornudo = 7;
      s.achis = 2.6;
      useGame.getState().toast('¡Achís! La nube revolvió los colores: fiate de la altura.', '🤧');
    }
    if (s.paciencia <= 0 && c) {
      c.estado = 'perdida';
      s.perdidas++;
      m.sumar(-10);
      useGame.getState().toast('Se fue la columna sin clasificar.', '⏱️');
      siguiente(m);
    }
    if (input.take('fire')) cortar(m);
    if (input.take('use')) quitar(m);
    const actual = s.cols[s.i];
    m.objetivo = actual?.hueco
      ? 'Hueco sin suelo: poné el umbral donde sigue la pendiente y F'
      : actual?.ruido.length
        ? 'Hay ruido bajo el suelo: E lo quita'
        : 'F corta todo lo que queda arriba del umbral';
    m.lineas = [
      `Columna ${s.i + 1} · ${Math.max(0, s.paciencia).toFixed(0)} s${s.achis > 0 ? ' · 🤧 colores revueltos' : ''}`,
      `Bien ${s.bien} · Mal ${s.mal} · Ruido quitado ${s.quitados} · Perdidas ${s.perdidas}`,
    ];
    m.stats = { x: s.x, y: s.y, bien: s.bien, mal: s.mal, quitados: s.quitados, perdidas: s.perdidas };
  },
  bot(m) {
    const s = m.datos,
      c = s.cols[s.i];
    if (!c || s.espera > 0 || s.mirando < 0.75) return;
    s.auto = true;
    if (c.ruido.length) {
      s.y = c.ruido[0];
      quitar(m);
    } else {
      s.y = c.hueco ? c.suelo : (c.suelo + Math.min(...c.hojas)) / 2;
      cortar(m);
    }
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      loco = m.parametros.huecos;
    const visibles = [];
    for (let k = s.i - 4; k <= s.i + 4; k++) if (k >= 0 && s.cols[k]) visibles.push(k);
    return (
      <Mesa titulo={loco ? 'Escaneo de utilería · repará los huecos' : 'Escaneo del dosel · Río Plátano'}>
        <Block pos={[-1, 0.75, -0.6]} size={[9.4, 0.08, 1.2]} color="#2d3a2e" solid={false} />
        {visibles.map((k) => {
          const c = s.cols[k],
            x = -1 + (k - s.i) * 1.02,
            actual = k === s.i;
          const color = (tipo: keyof typeof COLOR, j: number) =>
            s.achis > 0 ? CONFETI[(j * 7 + k * 3 + Math.floor(m.tiempo * 3)) % CONFETI.length] : COLOR[tipo];
          return (
            <group key={k}>
              {k < s.i ? (
                <Block
                  pos={[x, alto(c.suelo), -0.6]}
                  size={[1, 0.1, 0.3]}
                  color={c.estado === 'bien' ? '#a47148' : c.estado === 'mal' ? '#e63946' : '#6c757d'}
                  solid={false}
                />
              ) : (
                <>
                  {!c.hueco && <Ball pos={[x, alto(c.suelo), -0.6]} r={0.12} color={color('suelo', 0)} />}
                  {c.hojas.map((h, j) => (
                    <Ball
                      key={`h${j}`}
                      pos={[x + (j % 2 ? 0.18 : -0.18), alto(h), -0.6]}
                      r={0.1}
                      color={color('hoja', j + 1)}
                    />
                  ))}
                  {c.ruido.map((h, j) => (
                    <Ball key={`r${j}`} pos={[x + 0.12, alto(h), -0.6]} r={0.09} color={color('ruido', j + 5)} />
                  ))}
                  {c.hueco && <Label pos={[x, alto(-1) - 0.1, -0.2]} text="hueco" h={0.22} />}
                </>
              )}
              {actual && (
                <>
                  <Block pos={[x - 0.5, 2.3, -0.6]} size={[0.04, 2.7, 0.04]} color="#ffffff" solid={false} />
                  <Block pos={[x + 0.5, 2.3, -0.6]} size={[0.04, 2.7, 0.04]} color="#ffffff" solid={false} />
                  <Block pos={[x, alto(s.y), -0.6]} size={[1.1, 0.05, 0.5]} color="#ffd166" solid={false} />
                </>
              )}
            </group>
          );
        })}
        <Label pos={[-6.4, alto(0.8), -0.6]} text="copa" h={0.28} />
        <Label pos={[-6.4, alto(-0.7), -0.6]} text="suelo" h={0.28} />
        {loco && (
          <group position={[3.2, 3.9 + (s.achis > 0 ? Math.sin(m.tiempo * 30) * 0.1 : 0), -2]}>
            {[-0.4, 0, 0.4].map((x, j) => (
              <Ball key={x} pos={[x, j === 1 ? 0.15 : 0, 0]} r={j === 1 ? 0.38 : 0.3} color="#e9ecef" />
            ))}
            <Label pos={[0, 0.85, 0]} text={s.achis > 0 ? '¡Achís!' : 'nube de utilería'} h={0.26} />
          </group>
        )}
      </Mesa>
    );
  },
});
export const Lidar = motor.Escena;
export const guia = motor.guia;
