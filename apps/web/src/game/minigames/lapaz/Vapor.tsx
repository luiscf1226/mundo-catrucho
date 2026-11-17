import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label, Plate } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { casilla, centro, controles, cursor, duracion, Mesa, metas, mover, Puntero } from './comun';

const BAJA = 0.45,
  ALTA = 0.8,
  TOPE = 5;
type Estado = ReturnType<typeof cursor> & {
  azar: () => number;
  /** envoltorios en cada altura de la olla (columna 0, 1, 2) */
  carga: number[];
  calor: number[];
  presion: number[];
  valvula: boolean;
  llevando: boolean;
  coccion: number;
  cambio: number;
  espera: number;
  reventadas: number;
  reventadasTanda: number;
  tandas: number;
  movidos: number;
};
type Sesion = Motor<{ cambio: number; coccion: number; semilla: number }, Estado>;

/** Vapor que empuja cada columna: calor de la llama por envoltorios encima. */
const empuje = (s: Estado, c: number) => (s.calor[c] * s.carga[c]) / 3;
function avivar(s: Estado, dif: number) {
  s.calor = [0, 1, 2].map(() => 0.6 + s.azar() * (0.6 + dif * 0.3));
}
function nuevaTanda(s: Estado) {
  s.carga = [3, 3, 3];
  s.presion = [0.35, 0.35, 0.35];
  s.coccion = 0;
  s.llevando = false;
  s.reventadasTanda = 0;
}
function mover1(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.4;
  const c = casilla(s.x, 3);
  if (!s.llevando) {
    if (s.carga[c] <= 0) return;
    s.carga[c]--;
    s.llevando = true;
    // sacar un envoltorio destapa la olla un ratito
    s.coccion = Math.max(0, s.coccion - 0.03);
    return;
  }
  if (s.carga[c] >= TOPE) return;
  s.carga[c]++;
  s.llevando = false;
  s.movidos++;
}
const motor = defineMotor({
  id: 'lapaz.vapor',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'montana',
  guia: {
    goal: 'E abre o cierra la válvula. Con F pasá envoltorios de la columna más caliente a la más tibia: todas las presiones en la franja verde cuecen la tanda.',
    ...controles('abrir/cerrar la válvula'),
  },
  etapa: (p) => ({ cambio: 13 - p.dif * 4, coccion: 7 + p.dif * 2, semilla: p.seed }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      azar: rng(p.semilla),
      carga: [3, 3, 3],
      calor: [1, 1, 1],
      presion: [0.35, 0.35, 0.35],
      valvula: false,
      llevando: false,
      coccion: 0,
      cambio: p.cambio,
      espera: 0,
      reventadas: 0,
      reventadasTanda: 0,
      tandas: 0,
      movidos: 0,
    };
    avivar(s, 0);
    nuevaTanda(s);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.cambio -= dt;
    if (s.cambio <= 0) {
      s.cambio = m.parametros.cambio;
      avivar(s, m.partida.dif);
      useGame.getState().toast('La llama se movió: redistribuí los envoltorios.', '🔥');
    }
    let parejo = true,
      alguno = false;
    for (let c = 0; c < 3; c++) {
      // la válvula suelta más vapor donde hay más presión
      s.presion[c] = Math.max(0, s.presion[c] + (0.1 * empuje(s, c) - (s.valvula ? 0.25 * s.presion[c] : 0)) * dt);
      if (s.presion[c] >= 1) {
        // vapor retenido abre las costuras: se pierde el envoltorio de arriba
        s.presion[c] = 0.4;
        if (s.carga[c] > 0) s.carga[c]--;
        s.reventadas++;
        s.reventadasTanda++;
        m.sumar(-40);
      }
      if (s.carga[c] > 0) {
        alguno = true;
        if (s.presion[c] < BAJA || s.presion[c] > ALTA) parejo = false;
      }
    }
    if (alguno && parejo && !s.llevando) s.coccion += dt / m.parametros.coccion;
    if (s.coccion >= 1) {
      const quedan = s.carga.reduce((a, b) => a + b, 0);
      s.tandas++;
      m.sumar(quedan * 12 + (s.reventadasTanda ? 0 : 30));
      useGame.getState().toast(`Tanda cocida: ${quedan} ticucos enteros.`, '🫔');
      nuevaTanda(s);
    }
    if (input.take('use')) s.valvula = !s.valvula;
    if (input.take('fire')) mover1(m);
    m.objetivo = `Cocción ${Math.round(s.coccion * 100)}% · ${parejo ? 'presión pareja' : 'presión dispareja'}`;
    m.lineas = [
      `Válvula ${s.valvula ? 'abierta' : 'cerrada'}${s.llevando ? ' · Llevás un envoltorio' : ''} · Envoltorios ${s.carga.join(' · ')}`,
      `Tandas ${s.tandas} · Costuras abiertas ${s.reventadas}`,
    ];
    m.stats = { x: s.x, y: s.y, tandas: s.tandas, reventadas: s.reventadas, movidos: s.movidos, valvula: +s.valvula };
  },
  bot(m) {
    const s = m.datos;
    s.auto = true;
    const alta = Math.max(...s.presion.filter((_, c) => s.carga[c] > 0));
    if (alta > 0.72 !== s.valvula && (alta > 0.72 || alta < 0.58)) s.valvula = !s.valvula;
    const r = [0, 1, 2].map((c) => empuje(s, c)),
      mx = r.indexOf(Math.max(...r)),
      mn = r.indexOf(Math.min(...r));
    if (s.llevando) {
      const destino = [0, 1, 2]
        .filter((c) => s.carga[c] < TOPE)
        .sort((a, b) => (s.calor[a] * (s.carga[a] + 1)) / 3 - (s.calor[b] * (s.carga[b] + 1)) / 3)[0];
      s.x = centro(destino ?? mn, 3);
      mover1(m);
      return;
    }
    // solo conviene mover si después queda más parejo
    const despues = [...s.carga];
    despues[mx]--;
    despues[mn]++;
    const r2 = [0, 1, 2].map((c) => (s.calor[c] * despues[c]) / 3);
    if (despues[mn] <= TOPE && Math.max(...r2) - Math.min(...r2) < r[mx] - r[mn] - 0.05) {
      s.x = centro(mx, 3);
      mover1(m);
    }
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      sel = casilla(s.x, 3);
    return (
      <Mesa titulo={`${m.partida.juego?.name ?? 'Olla de ticucos'} · Presión pareja`}>
        <Cyl pos={[-1.5, 1.9, -0.6]} r={2.6} h={2.4} color="#5b5f66" mat="metal" solid={false} />
        {[0, 1, 2].map((c) => {
          const x = -1.5 + (c - 1) * 1.55;
          return (
            <group key={c}>
              <Ball pos={[x, 0.75, 0.9]} r={0.2 + s.calor[c] * 0.25} color="#ff8a2a" mat="neon" />
              {Array.from({ length: s.carga[c] }, (_, k) => (
                <Block
                  key={k}
                  pos={[x, 3.25 + k * 0.32, -0.6]}
                  size={[1.1, 0.28, 0.8]}
                  color={k % 2 ? '#5f9a3a' : '#6aa84f'}
                  mat="leaf"
                  solid={false}
                />
              ))}
              {/* manómetro de la columna con su franja buena */}
              <Block
                pos={[2.8 + c * 0.55, 0.8 + BAJA * 2.4 + ((ALTA - BAJA) * 2.4) / 2, -2.4]}
                size={[0.5, (ALTA - BAJA) * 2.4, 0.1]}
                color="#7cc47a"
                solid={false}
              />
              <Block
                pos={[2.8 + c * 0.55, 0.8 + s.presion[c] * 1.2, -2.25]}
                size={[0.3, s.presion[c] * 2.4 + 0.02, 0.18]}
                color={s.presion[c] > ALTA ? '#d9503a' : '#e8e2d0'}
                solid={false}
              />
              {c === sel && <Ball pos={[x, 5.1, -0.6]} r={0.12} color="#ffffff" mat="neon" />}
            </group>
          );
        })}
        <Label pos={[3.35, 3.9, -2.4]} text="Presión" h={0.3} />
        <Cyl
          pos={[-3.6, 3.3, -0.6]}
          r={0.15}
          h={0.6}
          color={s.valvula ? '#7cc47a' : '#a8473b'}
          mat="metal"
          solid={false}
        />
        {s.valvula && <Ball pos={[-3.6, 4 + (m.tiempo % 1) * 0.6, -0.6]} r={0.3} color="#f4f4f4" mat="glass" />}
        {s.llevando && <Plate pos={[-1, 5.6, 1]} text="🫔 Envoltorio en la mano" h={0.26} />}
        <Block pos={[-1.5, 0.75, 2.4]} size={[4 * s.coccion + 0.02, 0.1, 0.3]} color="#e8c77a" solid={false} />
        <Puntero x={centro(sel, 3) * 0.528 - 0.114} y={0.2} />
      </Mesa>
    );
  },
});
export const Vapor = motor.Escena;
export const guia = motor.guia;
