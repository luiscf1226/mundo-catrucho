import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover, sector } from './comun';

const RUMBOS = ['oriente', 'nororiente', 'norte', 'norponiente', 'poniente', 'surponiente', 'sur', 'suroriente'];
const OCT = Math.PI / 4;
type Estado = ReturnType<typeof cursor> & {
  viento: number;
  troncos: number[];
  pide: 'barlovento' | 'sotavento';
  marca: number;
  tramo: number;
  paciencia: number;
  mirando: number;
  invertida: boolean;
  espera: number;
  enlazadas: number;
  invertidas: number;
  errores: number;
  perdidas: number;
  azar: () => number;
};
type Sesion = Motor<{ ruido: number; enganoso: boolean; paciencia: number; seed: number }, Estado>;
/** rumbo que pide la marca: barlovento es de donde viene el viento (el lado húmedo); sotavento, el contrario */
const correcto = (s: Estado) => (s.pide === 'barlovento' ? s.viento : (s.viento + 4) % 8);
function marca(m: Sesion) {
  const s = m.datos,
    p = m.parametros;
  // el viento es constante durante un tramo de cuatro marcas
  if (s.marca % 4 === 0) {
    s.tramo++;
    s.viento = Math.floor(s.azar() * 8);
  }
  s.marca++;
  s.pide = s.azar() < 0.5 ? 'barlovento' : 'sotavento';
  s.troncos = [0, 1, 2].map(() => s.viento * OCT + (s.azar() * 2 - 1) * p.ruido);
  // un tronco junto a una quebrada se moja del lado que no es: hay que fiarse de la mayoría
  if (p.enganoso) s.troncos[Math.floor(s.azar() * 3)] = (s.viento + 2 + Math.floor(s.azar() * 5)) * OCT;
  s.paciencia = p.paciencia;
  s.mirando = 0;
}
function elegir(m: Sesion) {
  const s = m.datos,
    toast = useGame.getState().toast;
  let k = sector(s.x, s.y, 8);
  if (s.espera > 0 || k < 0) return;
  s.espera = 0.5;
  if (s.invertida) k = (k + 4) % 8;
  const bien = correcto(s);
  if (k === bien) {
    s.enlazadas++;
    s.invertida = false;
    m.sumar(40);
    toast(`Marca enlazada al ${RUMBOS[bien]}.`, '🌲');
    marca(m);
    return;
  }
  if (k === (bien + 4) % 8) {
    s.invertidas++;
    s.invertida = !s.invertida;
    m.sumar(-30);
    toast('Confundiste sotavento con barlovento: tu orientación quedó al revés.', '🔄');
    return;
  }
  s.errores++;
  m.sumar(-20);
  toast('Por ahí no hay marca. Mirá de qué lado están mojados los troncos.', '🌫️');
}
const motor = defineMotor({
  id: 'ocotepeque.gotasviento',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'montana',
  guia: {
    goal: 'El lado mojado de los troncos mira hacia donde viene el viento: eso es barlovento. Sotavento es el lado contrario. Apuntá el rumbo que pide la marca y F lo confirma. Confundirlos te deja la orientación al revés.',
    ...controles(),
  },
  etapa: (p) => ({
    ruido: 0.2 + p.dif * 0.35,
    enganoso: p.dif > 0.4,
    paciencia: 11 - p.dif * 4,
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => ({
    ...cursor(),
    viento: 0,
    troncos: [],
    pide: 'barlovento',
    marca: 0,
    tramo: 0,
    paciencia: p.paciencia,
    mirando: 0,
    invertida: false,
    espera: 0,
    enlazadas: 0,
    invertidas: 0,
    errores: 0,
    perdidas: 0,
    azar: rng(p.seed),
  }),
  actualizar(m, dt) {
    const s = m.datos;
    if (!s.troncos.length) marca(m);
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.mirando += dt;
    s.paciencia -= dt;
    if (s.paciencia <= 0) {
      s.perdidas++;
      m.sumar(-10);
      useGame.getState().toast('La niebla tapó la marca. Seguí con la próxima.', '🌫️');
      marca(m);
    }
    if (input.take('fire')) elegir(m);
    const k = sector(s.x, s.y, 8);
    m.objetivo = `Marca: seguí a ${s.pide}`;
    m.lineas = [
      `Rumbo: ${k < 0 ? 'ninguno' : RUMBOS[k]}${s.invertida ? ' · ¡orientación al revés!' : ''} · ${Math.max(0, s.paciencia).toFixed(0)} s`,
      `Marcas ${s.enlazadas} · Al revés ${s.invertidas} · Errores ${s.errores} · Perdidas ${s.perdidas}`,
    ];
    m.stats = { x: s.x, enlazadas: s.enlazadas, invertidas: s.invertidas, errores: s.errores, perdidas: s.perdidas };
  },
  bot(m) {
    const s = m.datos;
    // el bot también se toma un momento para mirar los troncos
    if (s.espera > 0 || s.mirando < 1.8 || !s.troncos.length) return;
    s.auto = true;
    let k = correcto(s);
    if (s.invertida) k = (k + 4) % 8;
    s.x = Math.cos(k * OCT) * 0.8;
    s.y = Math.sin(k * OCT) * 0.8;
    elegir(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      k = sector(s.x, s.y, 8);
    return (
      <Mesa titulo="Sendero de Güisayote · bajo la niebla">
        {RUMBOS.map((r, i) => {
          const a = i * OCT;
          return (
            <Block
              key={r}
              pos={[-1 + Math.cos(a) * 3.1, 0.78, -Math.sin(a) * 3.1]}
              size={[0.5, 0.08, 0.5]}
              rot={-a}
              color={i === k ? '#ffd166' : i === 2 ? '#e63946' : '#d6ccc2'}
              solid={false}
            />
          );
        })}
        <Label pos={[-1, 1.1, -3.6]} text="N" h={0.3} />
        {s.troncos.map((a, i) => {
          const x = -1 + [-1.3, 0, 1.3][i],
            z = [0.5, -0.9, 0.5][i];
          return (
            <group key={i}>
              <Cyl pos={[x, 1.5, z]} r={0.32} h={1.6} color="#5f4a36" mat="wood" solid={false} />
              {/* musgo y gotas del lado húmedo */}
              <Block
                pos={[x + Math.cos(a) * 0.28, 1.6, z - Math.sin(a) * 0.28]}
                size={[0.14, 1.3, 0.32]}
                rot={a}
                color="#4c956c"
                mat="leaf"
                solid={false}
              />
              <Ball pos={[x + Math.cos(a) * 0.4, 1.2, z - Math.sin(a) * 0.4]} r={0.07} color="#90e0ef" />
            </group>
          );
        })}
        {[
          [-3.2, 2.2, -1.5],
          [1.4, 2.6, -2],
          [-0.6, 2.4, 1.8],
        ].map((p, i) => (
          <mesh key={i} position={p as [number, number, number]} scale={[1.8, 0.6, 1.2]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.18 + m.partida.dif * 0.12} depthWrite={false} />
          </mesh>
        ))}
        <Label pos={[-1, 3.4, -2.4]} text={`Seguí a ${s.pide}${s.invertida ? ' · 🔄 al revés' : ''}`} h={0.34} />
      </Mesa>
    );
  },
});
export const Brujula = motor.Escena;
export const guia = motor.guia;
