import { type ComponentType, useLayoutEffect, useMemo, useState } from 'react';
import { isPaused, useGame } from '../../../core/store';
import type { AvatarState, MinigameId, V3 } from '../../../core/types';
import { Label, useMgTick } from '../../kit';
import { finish, type Guia, type Partida, partida, setHud, starsFor } from '../api';
import type { Fondo } from '../corte/common';
import { BotAvatar } from '../corte/common';
import { Ambiente, AmbienteContext, fondoMotor } from './Ambiente';

export interface Motor<P, S> {
  partida: Partida;
  parametros: P;
  datos: S;
  tiempo: number;
  cuenta: number;
  puntos: number;
  objetivo: string;
  lineas: string[];
  stats: Record<string, number>;
  sumar: (puntos: number) => void;
}
interface Definicion<P, S> {
  id: MinigameId;
  fondo?: Fondo;
  /** escena propia donde el jugador se mueve con su cámara (sin mesa ni cámara fija); `bots` = dónde se paran los bots */
  libre?: { bots: V3; yaw?: number };
  guia: Omit<Guia, 'metas'>;
  etapa: (p: Partida) => P;
  metas: (p: Partida) => [number, number, number];
  duracion: (p: Partida) => number;
  crear: (p: P) => S;
  actualizar: (m: Motor<P, S>, dt: number) => void;
  bot?: (m: Motor<P, S>, dt: number, actor: 'jugador' | 'compa') => void;
  Escena: ComponentType<{ motor: Motor<P, S> }>;
}
export interface PruebaMotor {
  estado: () => {
    id: MinigameId;
    etapa: number;
    etapas: number;
    modo: string;
    bots: number;
    cuenta: number;
    tiempo: number;
    duracion: number;
    puntos: number;
    metas: [number, number, number];
    terminado: boolean;
    stats: Record<string, number>;
  };
  jugarBot: (activo?: boolean) => void;
  avanzar: (segundos: number) => void;
}
type VentanaMotor = Window & { __mcTest?: Record<string, unknown> & { motor?: PruebaMotor } };

export function defineMotor<P, S>(def: Definicion<P, S>) {
  const guia: Guia = {
    ...def.guia,
    metas: (p) => {
      const [a, b, c] = def.metas(p);
      return [`${a} pts`, `${b} pts`, `${c} pts`];
    },
  };
  function EscenaMotor() {
    const partidaActual = useMemo(partida, []);
    const [sesion] = useState(() => {
      const parametros = def.etapa(partidaActual);
      const duracion = def.duracion(partidaActual);
      if (!Number.isFinite(duracion) || duracion < 60 || duracion > 120)
        throw new Error(`${def.id}: duración fuera de 60–120 s`);
      const motor: Motor<P, S> = {
        partida: partidaActual,
        parametros,
        datos: def.crear(parametros),
        tiempo: 0,
        cuenta: 3,
        puntos: 0,
        objetivo: def.guia.goal,
        lineas: [],
        stats: {},
        sumar: (n) => {
          motor.puntos = Math.max(0, motor.puntos + n);
        },
      };
      const bots: AvatarState[] = Array.from(
        { length: partidaActual.modo === 'abierto' ? 3 : 1 },
        () => ({ anim: 'idle', speed: 0 }) satisfies AvatarState,
      );
      return { motor, duracion, metas: def.metas(partidaActual), terminado: false, automatico: false, frase: 15, bots };
    });
    const [, pintar] = useState(0);
    const m = sesion.motor;
    function paso(dt: number) {
      if (isPaused() || sesion.terminado || useGame.getState().mg?.phase !== 'playing') return;
      if (m.cuenta > 0) {
        m.cuenta = Math.max(0, m.cuenta - dt);
        return;
      }
      dt = Math.min(dt, sesion.duracion - m.tiempo);
      m.tiempo += dt;
      if (sesion.automatico) def.bot?.(m, dt, 'jugador');
      if (m.partida.modo === 'duo') def.bot?.(m, dt, 'compa');
      def.actualizar(m, dt);
      sesion.bots.forEach((b, i) => {
        b.anim = Math.sin(m.tiempo * 2 + i) > 0 ? 'carry' : 'clap';
      });
      if (m.tiempo >= sesion.frase) {
        sesion.frase += 18;
        const frases: unknown = m.partida.tema.frases;
        if (Array.isArray(frases) && frases.length) {
          const frase: unknown = frases[Math.floor(m.tiempo / 18) % frases.length];
          if (typeof frase === 'string') useGame.getState().toast(frase, '💬');
        }
      }
      if (m.tiempo >= sesion.duracion) {
        sesion.terminado = true;
        const [a, b, c] = sesion.metas;
        finish({
          won: m.puntos >= a,
          stars: starsFor(m.puntos, a, b, c),
          score: m.puntos,
          label: `${m.puntos} pts`,
          stats: m.stats,
        });
      }
    }
    useMgTick((dt) => {
      paso(dt);
      setHud({
        timer: Math.ceil(Math.max(0, sesion.duracion - m.tiempo)),
        score: `${m.puntos} pts`,
        objective: m.cuenta > 0 ? `¡Preparáte! ${Math.ceil(m.cuenta)}` : `Meta ${sesion.metas[0]} pts · ${m.objetivo}`,
        lines: m.lineas,
      });
      pintar((n) => n + 1);
    });
    useLayoutEffect(() => {
      if (!location.hash.includes('test')) return;
      const w: VentanaMotor = window;
      const prueba: PruebaMotor = {
        estado: () => ({
          id: def.id,
          etapa: m.partida.etapa,
          etapas: m.partida.etapas,
          modo: m.partida.modo,
          bots: sesion.bots.length,
          cuenta: m.cuenta,
          tiempo: m.tiempo,
          duracion: sesion.duracion,
          puntos: m.puntos,
          metas: sesion.metas,
          terminado: sesion.terminado,
          stats: { ...m.stats },
        }),
        jugarBot: (activo = true) => {
          sesion.automatico = activo;
        },
        avanzar: (segundos) => {
          if (!Number.isFinite(segundos) || segundos < 0 || segundos > 123)
            throw new Error('Avance de prueba inválido');
          for (let t = 0; t < segundos; t += 0.05) paso(Math.min(0.05, segundos - t));
          pintar((n) => n + 1);
        },
      };
      w.__mcTest = { ...w.__mcTest, motor: prueba };
      return () => {
        if (w.__mcTest?.motor === prueba) delete w.__mcTest.motor;
      };
    }, [sesion]);
    const libre = def.libre;
    return (
      <AmbienteContext.Provider value={fondoMotor(def.id, m.partida.tema.fondo, def.fondo)}>
        {!libre && <Ambiente fondo={fondoMotor(def.id, m.partida.tema.fondo, def.fondo)} />}
        <def.Escena motor={m} />
        {m.cuenta > 0 && !libre && <Label pos={[0, 4, 0]} text={`¡Preparáte! ${Math.ceil(m.cuenta)}`} h={0.7} />}
        {sesion.bots.map((b, i) => (
          <BotAvatar
            key={i}
            i={i}
            state={b}
            pos={libre ? [libre.bots[0] + i * 1.8, libre.bots[1], libre.bots[2]] : [5 + i * 1.8, 0, -1]}
            yaw={libre?.yaw ?? -0.7}
            compa={m.partida.modo === 'duo'}
          />
        ))}
      </AmbienteContext.Provider>
    );
  }
  return { Escena: EscenaMotor, guia };
}
