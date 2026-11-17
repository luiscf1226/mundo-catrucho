import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Block, Cyl, Label, Plate } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { casilla, centro, controles, cursor, duracion, Mesa, metas, mover, Puntero } from './comun';

const PESAS = [1, 2, 5, 10];
const OPCIONES = ['1 kg', '2 kg', '5 kg', '10 kg', 'Quitar'];
/** altura en la mesa de un kilo en las columnas de grano y contrapesos */
const KG = 0.1;
type Estado = ReturnType<typeof cursor> & {
  azar: () => number;
  fase: 'tara' | 'pesar';
  tara: number;
  seco: number;
  humedad: number;
  puestas: number[];
  reloj: number;
  espera: number;
  lotes: number;
  aguadas: number;
  errores: number;
  pesas: number;
  taradas: number;
};
type Sesion = Motor<{ seca: number; semilla: number }, Estado>;

const agua = (s: Estado) => (s.seco * s.humedad) / (1 - s.humedad);
const contrapeso = (s: Estado) => s.puestas.reduce((a, b) => a + b, 0);
function nuevoLote(s: Estado) {
  s.fase = 'tara';
  s.tara = 1 + Math.floor(s.azar() * 3);
  s.seco = 8 + Math.floor(s.azar() * 17);
  s.humedad = 0.18 + s.azar() * 0.14;
  s.puestas = [];
  s.reloj = 0;
}
function tarar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.5;
  if (s.fase === 'tara') {
    s.fase = 'pesar';
    s.taradas++;
    return;
  }
  const c = contrapeso(s);
  if (c === s.seco) {
    s.lotes++;
    m.sumar(50 + (s.reloj < 8 ? 10 : 0));
  } else if (c === Math.round(s.seco + agua(s))) {
    // confundir agua con grano descuadra el inventario
    s.aguadas++;
    m.sumar(-50);
    useGame.getState().toast('Pesaste agua como si fuera grano: inventario descuadrado.', '⚖️');
  } else {
    s.errores++;
    m.sumar(-30);
  }
  nuevoLote(s);
}
function pesa(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.4;
  if (s.fase === 'tara') {
    s.errores++;
    m.sumar(-10);
    useGame.getState().toast('Primero tará la balanza con el saco vacío (E).', '⚖️');
    return;
  }
  const k = casilla(s.x, OPCIONES.length);
  if (k === 4) s.puestas.pop();
  else {
    s.puestas.push(PESAS[k]);
    s.pesas++;
  }
}
const motor = defineMotor({
  id: 'lapaz.pesas',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'finca',
  guia: {
    goal: 'E tara el saco vacío. Con F poné contrapesos iguales al grano seco (café), no al agua. E registra el peso.',
    ...controles('tarar / registrar'),
  },
  etapa: (p) => ({ seca: 0.006 + p.dif * 0.01, semilla: p.seed }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      azar: rng(p.semilla),
      fase: 'tara',
      tara: 2,
      seco: 10,
      humedad: 0.2,
      puestas: [],
      reloj: 0,
      espera: 0,
      lotes: 0,
      aguadas: 0,
      errores: 0,
      pesas: 0,
      taradas: 0,
    };
    nuevoLote(s);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (s.fase === 'pesar') {
      s.reloj += dt;
      // el lote se va secando: pierde agua, el grano queda igual
      s.humedad = Math.max(0.08, s.humedad - m.parametros.seca * dt);
    }
    if (input.take('use')) tarar(m);
    if (input.take('fire')) pesa(m);
    const total = s.fase === 'tara' ? s.tara : s.seco + agua(s);
    m.objetivo =
      s.fase === 'tara'
        ? `Saco vacío: ${s.tara} kg de tara. Tarala con E`
        : `Humedad ${Math.round(s.humedad * 100)}% · Contrapesos ${contrapeso(s)} kg`;
    m.lineas = [
      `Balanza: ${(total - (s.fase === 'pesar' ? contrapeso(s) : 0)).toFixed(1)} kg de diferencia`,
      `Lotes cuadrados ${s.lotes} · Agua pesada ${s.aguadas} · Errores ${s.errores}`,
    ];
    m.stats = { x: s.x, y: s.y, lotes: s.lotes, aguadas: s.aguadas, pesas: s.pesas, taradas: s.taradas };
  },
  bot(m) {
    const s = m.datos;
    s.auto = true;
    if (s.fase === 'tara') return tarar(m);
    const falta = s.seco - contrapeso(s);
    if (falta === 0) return tarar(m);
    const k = falta < 0 ? 4 : PESAS.reduce((best, p, i) => (p <= falta ? i : best), 0);
    s.x = centro(k, OPCIONES.length);
    pesa(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      sel = casilla(s.x, OPCIONES.length),
      w = s.fase === 'pesar' ? agua(s) : 0,
      dif = (s.fase === 'pesar' ? s.seco + w - contrapeso(s) : s.tara) * 0.03,
      giro = Math.max(-0.35, Math.min(0.35, dif));
    return (
      <Mesa titulo={`${m.partida.juego?.name ?? 'Humedad en el beneficio'} · Pesá el grano, no el agua`}>
        <Cyl pos={[-1, 1.6, -1.8]} r={0.15} h={1.8} color="#6b6f75" mat="metal" solid={false} />
        <group position={[-1, 2.6, -1.8]} rotation={[0, 0, giro]}>
          <Block pos={[0, 0, 0]} size={[5, 0.12, 0.2]} color="#9aa0a6" mat="metal" solid={false} />
        </group>
        <Block pos={[-3.4, 0.8, -1.8]} size={[1.4, 0.1, 1]} color="#c9b48a" mat="cloth" solid={false} />
        {s.fase === 'pesar' && (
          <>
            <Block
              pos={[-3.4, 0.85 + (s.seco * KG) / 2, -1.8]}
              size={[0.9, s.seco * KG, 0.6]}
              color="#6b3f22"
              solid={false}
            />
            <Block
              pos={[-3.4, 0.85 + s.seco * KG + (w * KG) / 2, -1.8]}
              size={[0.9, w * KG, 0.6]}
              color="#5aa9e0"
              mat="glass"
              solid={false}
            />
            <Label pos={[-3.4, 1.2 + (s.seco + w) * KG, -1.8]} text={`💧 ${Math.round(s.humedad * 100)}%`} h={0.3} />
          </>
        )}
        {[5, 10, 15, 20, 25, 30].map((k) => (
          <Block key={k} pos={[-2.4, 0.85 + k * KG, -1.8]} size={[0.5, 0.03, 0.05]} color="#2b2b2b" solid={false} />
        ))}
        <Block
          pos={[1.4, 0.85 + (contrapeso(s) * KG) / 2, -1.8]}
          size={[0.9, contrapeso(s) * KG + 0.01, 0.6]}
          color="#8d8f94"
          mat="metal"
          solid={false}
        />
        <Label pos={[1.4, 1.2 + contrapeso(s) * KG, -1.8]} text={`${contrapeso(s)} kg`} h={0.3} />
        {OPCIONES.map((o, k) => (
          <group key={o} position={[-1 + centro(k, OPCIONES.length) * 4.4, 0.8, 2]}>
            <Block
              pos={[0, 0, 0]}
              size={[1.3, 0.12, 0.8]}
              color={k === sel ? '#e8c77a' : '#c9b48a'}
              mat="wood"
              solid={false}
            />
            <Label pos={[0, 0.45, 0]} text={o} h={0.26} />
          </group>
        ))}
        {s.fase === 'tara' && <Plate pos={[-3.4, 2.2, -1.8]} text={`Saco vacío · tara ${s.tara} kg`} h={0.26} />}
        <Puntero x={centro(sel, OPCIONES.length)} y={-0.62} />
      </Mesa>
    );
  },
});
export const Pesas = motor.Escena;
export const guia = motor.guia;
