import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label, Plate } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { columna, controles, cursor, duracion, Mesa, metas, mover, Puntero, xDe } from './comun';

type Estado = ReturnType<typeof cursor> & {
  azar: () => number;
  foco: number;
  /** hacia dónde se escapa la luz del foco: −1 izquierda, +1 derecha */
  lado: number;
  /** segundos que le faltan a la cría para salir de la columna del foco */
  cria: number;
  mueve: number;
  oscuro: number;
  desorientadas: number;
  tocadas: number;
  espera: number;
  ultima: number;
};
type Sesion = Motor<{ movil: boolean; giro: number; semilla: number }, Estado>;
function nuevoFoco(s: Estado) {
  s.foco = Math.floor(s.azar() * 3);
  s.lado = s.azar() < 0.5 ? -1 : 1;
  s.cria = s.azar() < 0.4 ? 1.2 : 0;
}
function tapar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 1;
  const c = columna(s.x);
  if (c === s.foco && s.cria > 0) {
    s.tocadas++;
    m.sumar(-40);
    return;
  }
  if (c !== s.foco || Math.sign(s.y) !== s.lado || Math.abs(s.y) < m.parametros.giro) {
    s.desorientadas++;
    s.ultima = 1.2;
    m.sumar(-35);
    return;
  }
  s.oscuro++;
  m.sumar(55);
  nuevoFoco(s);
  s.mueve = 2.4;
}
const motor = defineMotor({
  id: 'choluteca.tortuga',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'costa',
  guia: {
    goal: 'A/D poné la pantalla frente al foco encendido; W/S girala hacia donde se escapa la luz; F fijala. Nunca encima de una cría.',
    ...controles,
  },
  etapa: (p) => ({
    movil: p.tema.variante === 'la-linterna-mira-al-suelo',
    giro: 0.3 + p.dif * 0.2,
    semilla: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      azar: rng(p.semilla),
      foco: 1,
      lado: 1,
      cria: 0,
      mueve: 2.4,
      oscuro: 0,
      desorientadas: 0,
      tocadas: 0,
      espera: 0,
      ultima: 0,
    };
    nuevoFoco(s);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.cria = Math.max(0, s.cria - dt);
    s.ultima = Math.max(0, s.ultima - dt);
    if (m.parametros.movil) {
      s.mueve -= dt;
      if (s.mueve <= 0) {
        // la luz móvil se pasa a otro poste
        s.foco = (s.foco + 1) % 3;
        s.mueve = 2.4;
      }
    }
    if (input.take('fire')) tapar(m);
    m.objetivo = `Foco ${s.foco + 1} · su luz se escapa a la ${s.lado < 0 ? 'izquierda' : 'derecha'}`;
    m.lineas = [
      s.cria > 0 ? '🐢 Una cría va pasando frente al foco: esperá' : 'Corredor despejado: tapá la luz',
      `Corredor oscuro ${s.oscuro} · Crías desorientadas ${s.desorientadas} · Tocadas ${s.tocadas}${m.parametros.movil ? ' · La luz se mueve' : ''}`,
    ];
    m.stats = { x: s.x, y: s.y, oscuro: s.oscuro, desorientadas: s.desorientadas, tocadas: s.tocadas };
  },
  bot(m) {
    const s = m.datos;
    s.auto = true;
    s.x = xDe(s.foco);
    s.y = s.lado * 0.75;
    if (s.cria === 0) tapar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      c = columna(s.x);
    return (
      <Mesa titulo={`${m.partida.juego?.name ?? 'Noche de Punta Ratón'} · Bajá la luz, no toqués las crías`}>
        <Block pos={[-1, 0.72, -0.5]} size={[10, 0.04, 6]} color="#3b3a46" mat="sand" solid={false} />
        <Block pos={[-1, 0.73, 3.4]} size={[10, 0.04, 1.2]} color="#1e4a6b" mat="water" solid={false} />
        <Label pos={[-1, 1.3, 3.4]} text="Horizonte marino" h={0.28} />
        {[0, 1, 2].map((i) => (
          <group key={i} position={[xDe(i) * 5, 0, -3]}>
            <Cyl pos={[0, 1.6, 0]} r={0.07} h={1.8} color="#5e6670" mat="metal" solid={false} />
            <Ball
              pos={[0, 2.6, 0]}
              r={0.22}
              color={i === s.foco ? '#ffe38a' : '#4f5560'}
              mat={i === s.foco ? 'neon' : 'metal'}
            />
            {i === s.foco && (
              <Block
                pos={[s.lado * 0.55, 0.78, 1.5]}
                size={[1.1, 0.03, 2.8]}
                color="#fff2a8"
                mat="neon"
                solid={false}
              />
            )}
          </group>
        ))}
        {s.cria > 0 && <Ball pos={[xDe(s.foco) * 5, 0.85, 2.6 - s.cria * 2]} r={0.16} color="#6b4f2f" />}
        {[0.4, 1.4].map((z, i) => (
          <Ball key={i} pos={[-5 + i * 0.6, 0.83, z + 1]} r={0.12} color="#6b4f2f" />
        ))}
        <group position={[xDe(c) * 5, 1.2, -2.3]} rotation={[0, s.y * 0.9, 0]}>
          <Block pos={[0, 0, 0]} size={[1.4, 0.9, 0.08]} color="#2c2f36" mat="cloth" solid={false} />
        </group>
        {s.ultima > 0 && <Label pos={[-1, 3.2, 0]} text="¡Le apuntaste luz a las crías!" h={0.32} fg="#ff9678" />}
        {m.parametros.movil && (
          <group position={[-5, 0.7, -1]}>
            {/* la linterna se pone lentes oscuros y baja sola el foco, una y otra vez */}
            <group position={[0, 0.2, 0]} rotation={[Math.min(1.3, (m.tiempo % 5) * 0.6), 0, 0]}>
              <Cyl pos={[0, 0.5, 0]} r={0.18} h={1} color="#d9d2c1" mat="plastic" solid={false} />
              <Block pos={[0, 0.85, 0.2]} size={[0.42, 0.1, 0.06]} color="#111318" solid={false} />
              <Block pos={[0, 1.4, 0]} size={[0.12, 0.8, 0.12]} color="#fff2a8" mat="neon" solid={false} />
            </group>
            <Plate pos={[0, 2.2, 0]} text="🕶️ ⬇ Linterna al suelo" h={0.22} bg="#2c2f36" />
          </group>
        )}
        <Puntero x={s.x} y={s.y} color="#9ad1ff" />
      </Mesa>
    );
  },
});
export const Tortuga = motor.Escena;
export const guia = motor.guia;
