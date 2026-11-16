import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label, Plate } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover, Puntero } from './comun';

interface Poza {
  o2: number;
  sal: number;
}
type Estado = ReturnType<typeof cursor> & {
  pozas: [Poza, Poza];
  energia: number;
  revision: number;
  estables: number;
  caidas: number;
  apagones: number;
  espera: number;
  aviso: string;
};
type Sesion = Motor<{ consumo: number; sube: number; recarga: number; loco: boolean; semilla: number }, Estado>;
const estable = (p: Poza) => p.o2 >= 0.4 && p.sal <= 0.7;
const REVISION = 5;
/** Acción del cursor: arriba = aireador, abajo = recambio de agua, en medio = nada. */
const accion = (y: number) => (y > 0.3 ? 'aire' : y < -0.3 ? 'agua' : null);
function operar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  const a = accion(s.y);
  if (!a) {
    s.aviso = 'Elegí aireador (arriba) o recambio (abajo)';
    return;
  }
  s.espera = 0.5;
  const p = s.pozas[s.x < 0 ? 0 : 1];
  if (a === 'aire') {
    if (s.energia < 1) {
      s.apagones++;
      s.aviso = 'Sin potencia: esperá que se recargue';
      m.sumar(-20);
      return;
    }
    s.energia -= 1;
    p.o2 = Math.min(1, p.o2 + 0.35);
    s.aviso = 'Aireador encendido';
  } else {
    // agua nueva: baja la sal, pero entra con menos oxígeno
    p.sal = Math.max(0.2, p.sal - 0.35);
    p.o2 = Math.max(0, p.o2 - 0.15);
    s.aviso = 'Recambio: menos sal, menos oxígeno';
  }
}
const motor = defineMotor({
  id: 'choluteca.estanque',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'finca',
  guia: {
    goal: 'A/D elegí estanque. W aireador (gasta potencia), S recambio (baja sal y oxígeno). F aplicá. Cada 5 s se revisa.',
    ...controles,
  },
  etapa: (p) => {
    const loco = p.tema.variante === 'el-camaron-pidio-ventilador';
    return {
      consumo: 0.035 + p.dif * 0.02,
      sube: 0.02 + p.dif * 0.012,
      recarga: loco ? 0.5 : 0.65,
      loco,
      semilla: p.seed,
    };
  },
  metas,
  duracion,
  crear: (p): Estado => {
    const azar = rng(p.semilla);
    return {
      ...cursor(),
      pozas: [
        { o2: 0.75 + azar() * 0.1, sal: 0.45 + azar() * 0.1 },
        { o2: 0.7 + azar() * 0.1, sal: 0.5 + azar() * 0.1 },
      ],
      energia: 3,
      revision: REVISION,
      estables: 0,
      caidas: 0,
      apagones: 0,
      espera: 0,
      aviso: '',
    };
  },
  actualizar(m, dt) {
    const s = m.datos,
      q = m.parametros;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.energia = Math.min(3, s.energia + dt * q.recarga);
    s.pozas.forEach((p, i) => {
      p.o2 = Math.max(0, p.o2 - dt * q.consumo * (1 + i * 0.3));
      p.sal = Math.min(1, p.sal + dt * q.sube * (1.3 - i * 0.3));
    });
    if (input.take('fire')) operar(m);
    s.revision -= dt;
    if (s.revision <= 0) {
      s.revision += REVISION;
      if (s.pozas.every(estable)) {
        s.estables++;
        m.sumar(60);
      } else {
        s.caidas++;
        m.sumar(-20);
      }
    }
    const [a, b] = s.pozas,
      fmt = (p: Poza) => `O₂ ${p.o2.toFixed(2)} · sal ${p.sal.toFixed(2)}`;
    m.objetivo = `Revisión en ${Math.ceil(s.revision)} s · ${s.x < 0 ? 'Estanque A' : 'Estanque B'} · ${accion(s.y) === 'aire' ? 'Aireador' : accion(s.y) === 'agua' ? 'Recambio' : '—'}`;
    m.lineas = [
      `A: ${fmt(a)} | B: ${fmt(b)} · Estable: O₂ ≥ 0.40 y sal ≤ 0.70`,
      `Potencia ${'⚡'.repeat(Math.floor(s.energia))} · Noches estables ${s.estables} · ${s.aviso}`,
    ];
    m.stats = { x: s.x, y: s.y, estables: s.estables, caidas: s.caidas, apagones: s.apagones };
  },
  bot(m) {
    const s = m.datos;
    s.auto = true;
    // atiende primero el oxígeno con potencia; la sal solo si sobra oxígeno para el recambio
    const orden = [0, 1].sort((i, j) => s.pozas[i].o2 - s.pozas[j].o2);
    for (const i of orden) {
      const p = s.pozas[i];
      s.x = i ? 0.6 : -0.6;
      if (p.sal > 0.58 && p.o2 > 0.6) {
        s.y = -0.8;
        operar(m);
        return;
      }
      if (p.o2 < 0.62 && s.energia >= 1) {
        s.y = 0.8;
        operar(m);
        return;
      }
    }
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    return (
      <Mesa titulo={`${m.partida.juego?.name ?? 'Estanques de Marcovia'} · Oxígeno y sal de noche`}>
        {s.pozas.map((p, i) => (
          <group key={i} position={[(i ? 1 : -1) * 2.4, 0, -0.5]}>
            <Block
              pos={[0, 0.78, 0]}
              size={[3.6, 0.12, 4]}
              color={estable(p) ? '#3f8fa6' : '#7a7f55'}
              mat="water"
              solid={false}
            />
            <Block pos={[-2, 0.8 + p.o2, 1.6]} size={[0.25, p.o2 * 2, 0.25]} color="#7ed6ff" mat="neon" solid={false} />
            <Block pos={[2, 0.8 + p.sal, 1.6]} size={[0.25, p.sal * 2, 0.25]} color="#f0e2a8" solid={false} />
            <Cyl pos={[0, 1.05, 0]} r={0.35} h={0.25} color="#d9d2c1" mat="plastic" solid={false} />
            <Label pos={[0, 3, 0]} text={`${i ? 'B' : 'A'} · ${estable(p) ? 'estable' : 'en riesgo'}`} h={0.3} />
          </group>
        ))}
        {[0, 1, 2].map((i) => (
          <Ball key={i} pos={[-5.2, 1, -2 + i * 0.6]} r={0.18} color={i < s.energia ? '#ffd23f' : '#555'} mat="neon" />
        ))}
        {m.parametros.loco && (
          <group position={[-5, 0.7, 1.6]}>
            <Block pos={[0, 0.9, 0]} size={[1.2, 0.9, 0.08]} color="#f28b6a" mat="cloth" solid={false} />
            <Plate pos={[0, 1.9, 0]} text="🦐 ¡Quiero un ventilador así de grande!" h={0.2} bg="#c0392b" />
          </group>
        )}
        <Puntero x={s.x} y={s.y} />
      </Mesa>
    );
  },
});
export const Estanque = motor.Escena;
export const guia = motor.guia;
