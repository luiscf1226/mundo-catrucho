import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover, sector } from './comun';

const LADOS = ['derecha', 'arriba', 'izquierda', 'abajo'];
type Estado = ReturnType<typeof cursor> & {
  mira: number;
  pinza: 1 | -1;
  salida: number;
  saliendo: number;
  abierta: number;
  paciencia: number;
  espera: number;
  libres: number;
  enfrente: number;
  errores: number;
  escondidos: number;
  azar: () => number;
};
type Sesion = Motor<{ paciencia: number; pinza: number; seed: number }, Estado>;
/** el punche camina de lado, hacia donde tiene la pinza grande */
const correcta = (s: Estado) => (s.mira + s.pinza + 4) % 4;
function nuevo(s: Estado, paciencia: number) {
  s.mira = Math.floor(s.azar() * 4);
  s.pinza = s.azar() > 0.5 ? 1 : -1;
  s.saliendo = -1;
  s.abierta = -1;
  s.paciencia = paciencia;
}
function abrir(m: Sesion) {
  const s = m.datos,
    k = sector(s.x, s.y, 4),
    toast = useGame.getState().toast;
  if (s.espera > 0 || s.saliendo >= 0 || k < 0) return;
  s.espera = 0.5;
  s.abierta = k;
  if (k === correcta(s)) {
    s.libres++;
    s.salida = k;
    s.saliendo = 0;
    m.sumar(25);
    return;
  }
  if (k === s.mira) {
    s.enfrente++;
    m.sumar(-30);
    toast('Abriste enfrente: el punche no va de frente. Replanteá.', '🦀');
  } else {
    s.errores++;
    m.sumar(-20);
    toast('Por ahí no: fijate de qué lado tiene la pinza grande.', '🦀');
  }
}
const motor = defineMotor({
  id: 'valle.punche',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'rio',
  guia: {
    goal: 'El punche camina de lado, hacia su pinza grande. Apuntá a la compuerta de ese costado y abrila con F antes de que se esconda. Abrir enfrente no le da paso.',
    ...controles(),
  },
  etapa: (p) => ({ paciencia: 6 - p.dif * 2.5, pinza: 1.7 - p.dif * 0.4, seed: p.seed }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      mira: 0,
      pinza: 1,
      salida: -1,
      saliendo: -1,
      abierta: -1,
      paciencia: p.paciencia,
      espera: 0,
      libres: 0,
      enfrente: 0,
      errores: 0,
      escondidos: 0,
      azar: rng(p.seed),
    };
    nuevo(s, p.paciencia);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('fire')) abrir(m);
    if (s.saliendo >= 0) {
      s.saliendo += dt;
      if (s.saliendo >= 1.6) nuevo(s, m.parametros.paciencia);
    } else {
      s.paciencia -= dt;
      if (s.paciencia <= 0) {
        s.escondidos++;
        m.sumar(-10);
        useGame.getState().toast('Se cansó de esperar y se escondió.', '🦀');
        nuevo(s, m.parametros.paciencia);
      }
    }
    const k = sector(s.x, s.y, 4);
    m.objetivo = 'Abrí la compuerta del costado de la pinza grande';
    m.lineas = [
      `Compuerta: ${k < 0 ? 'ninguna' : LADOS[k]} · Paciencia ${Math.max(0, s.paciencia).toFixed(1)} s`,
      `Libres ${s.libres} · De frente ${s.enfrente} · Errores ${s.errores} · Escondidos ${s.escondidos}`,
    ];
    m.stats = { x: s.x, libres: s.libres, enfrente: s.enfrente, errores: s.errores, escondidos: s.escondidos };
  },
  bot(m) {
    const s = m.datos;
    if (s.saliendo >= 0 || s.espera > 0) return;
    s.auto = true;
    const k = correcta(s);
    s.x = Math.cos((k * Math.PI) / 2) * 0.8;
    s.y = Math.sin((k * Math.PI) / 2) * 0.8;
    abrir(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      k = sector(s.x, s.y, 4),
      paso = s.saliendo >= 0 ? s.saliendo * 2.2 : 0,
      dx = s.saliendo >= 0 ? Math.cos((s.salida * Math.PI) / 2) * paso : 0,
      dz = s.saliendo >= 0 ? -Math.sin((s.salida * Math.PI) / 2) * paso : 0,
      grande = m.parametros.pinza;
    return (
      <Mesa titulo="Refugio de maqueta · El punche va de lado">
        <Block pos={[-1, 0.8, 0]} size={[4.4, 0.1, 4.4]} color="#6b5440" mat="dirt" solid={false} />
        {[0, 1, 2, 3].map((g) => {
          const a = (g * Math.PI) / 2,
            abierta = g === s.abierta;
          return (
            <Block
              key={g}
              pos={[-1 + Math.cos(a) * 2.2, abierta ? 0.9 : 1.25, -Math.sin(a) * 2.2]}
              size={[g % 2 ? 1.6 : 0.15, abierta ? 0.1 : 0.8, g % 2 ? 0.15 : 1.6]}
              color={g === k ? '#ffd166' : '#8d5a2b'}
              mat="wood"
              solid={false}
            />
          );
        })}
        <group position={[-1 + dx, 1.05, dz]} rotation={[0, (s.mira * Math.PI) / 2, 0]}>
          <group scale={[1, 0.45, 1.2]}>
            <Ball pos={[0, 0, 0]} r={0.5} color="#b5452e" />
          </group>
          {[-1, 1].map((lado) => (
            <Ball
              key={lado}
              pos={[0.6, 0.05, lado * -0.35]}
              r={lado === s.pinza ? 0.18 * grande : 0.18}
              color="#d9643a"
            />
          ))}
          {[-0.3, 0, 0.3].map((x) =>
            [-1, 1].map((lado) => (
              <Block
                key={`${x}${lado}`}
                pos={[x, -0.1, lado * 0.55]}
                size={[0.06, 0.06, 0.4]}
                rot={Math.sin(m.tiempo * 12 + x * 9) * (s.saliendo >= 0 ? 0.4 : 0.1)}
                color="#8a3324"
                solid={false}
              />
            )),
          )}
        </group>
        <Label pos={[-1, 3.2, -2.6]} text={s.saliendo >= 0 ? '¡Salió de lado! 🦀' : 'Mirá las pinzas'} h={0.36} />
      </Mesa>
    );
  },
});
export const Punche = motor.Escena;
export const guia = motor.guia;
