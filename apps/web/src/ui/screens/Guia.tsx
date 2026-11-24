// Guía de primeros pasos: cuatro pasos cortos en el HUD para quien entra por primera vez (caminar, viajar, jugar y
// ver las misiones). Cada paso se cumple solo al hacerlo; se puede saltar. No tapa el juego ni recibe clics fuera de
// sus botones.
import { useEffect, useState } from 'react';
import { player } from '../../core/player';
import { GUIA_PASOS, useGame } from '../../core/store';
import { Icon, type IconName } from '../components/Icon';
import { Btn } from '../components/kit';
import { act, g, usePad, useTouch } from '../lib';
import { juegoCercano } from '../misiones';

interface Paso {
  titulo: string;
  pista: (c: { touch: boolean; pad: boolean; enDepto: boolean }) => string;
  ir?: (enDepto: boolean) => { label: string; corto: string; icon: IconName; hacer: () => void } | undefined;
}
const PASOS: Paso[] = [
  {
    titulo: 'Caminá un toque',
    pista: ({ touch, pad }) =>
      pad
        ? 'Stick izquierdo para caminar y A para saltar.'
        : touch
          ? 'Arrastrá la palanca de la izquierda. Arrastrá la pantalla para girar.'
          : 'W A S D o las flechas para caminar, Espacio para saltar y el mouse para girar.',
  },
  {
    titulo: 'Viajá a un departamento',
    pista: () => 'Entrá por el portal de un departamento o abrí el mapa y dale Ir. La primera visita paga.',
    ir: () => ({ label: 'Abrir mapa', corto: 'Mapa', icon: 'map', hacer: () => g().openPanel('mapa') }),
  },
  {
    titulo: 'Jugá tu primer minijuego',
    pista: ({ touch, pad, enDepto }) =>
      enDepto
        ? `Los puestos con 🎮 tienen juegos: acercate y ${pad ? 'apretá X' : touch ? 'tocá la mano' : 'apretá E'}.`
        : 'Cada departamento tiene sus juegos. Con el botón jugás uno de una vez.',
    ir: (enDepto) => {
      const j = juegoCercano();
      return j
        ? {
            label: enDepto ? 'Jugar aquí' : 'Jugar uno',
            corto: 'Jugar',
            icon: 'play',
            hacer: () => g().startJuego(j.id),
          }
        : undefined;
    },
  },
  {
    titulo: 'Mirá tus misiones de hoy',
    pista: () => 'Cambian cada día y pagan Lempiritas y XP. Cada una dice dónde se hace.',
    ir: () => ({ label: 'Ver misiones', corto: 'Ver', icon: 'missions', hacer: () => g().openPanel('misiones') }),
  },
];

/** Revisa en segundo plano si el paso actual ya se cumplió (aunque la tarjeta no se vea). */
export function useGuia() {
  const paso = useGame((s) => s.profile.guia),
    created = useGame((s) => s.profile.created);
  useEffect(() => {
    if (!created || paso >= GUIA_PASOS) return;
    if (paso === 0) {
      // suma lo caminado de verdad: el teletransporte al cargar la escena no tiene velocidad y salta varios metros
      let antes: number[] | null = null,
        caminado = 0;
      const t = setInterval(() => {
        const s = g();
        if (s.screen !== 'world' || s.panel || s.mg) return;
        const p = player.pos,
          tramo = antes ? Math.hypot(p[0] - antes[0], p[2] - antes[1]) : 0;
        if (player.state.speed > 0.6 && tramo < 3) caminado += tramo;
        antes = [p[0], p[2]];
        if (caminado > 6) s.pasoGuia(1);
      }, 250);
      return () => clearInterval(t);
    }
    const hecho = (s: ReturnType<typeof g>) =>
      paso === 1
        ? s.scene.kind === 'dept' || s.profile.visited.length > 0
        : paso === 2
          ? s.profile.stats.played > 0
          : s.panel === 'misiones';
    // la suscripción vuelve a llamar dentro de pasoGuia y del aviso: una sola vez por paso
    const revisar = (s: ReturnType<typeof g>) => {
      if (s.profile.guia !== paso || !hecho(s)) return;
      s.pasoGuia(paso + 1);
      if (paso + 1 === GUIA_PASOS) s.toast('¡Ya sabés lo básico! Ahora recorré los 18 departamentos.', '🇭🇳');
    };
    revisar(g());
    return useGame.subscribe(revisar);
  }, [paso, created]);
}

/** Pantalla baja (celular acostado): la guía va compacta en la fila de chips para no tapar la palanca. */
const BAJA = '(max-height: 500px)';
export function useBaja() {
  const [baja, setBaja] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(BAJA).matches);
  useEffect(() => {
    const m = matchMedia(BAJA),
      f = () => setBaja(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return baja;
}

export function Guia({ compacta = false }: { compacta?: boolean }) {
  const paso = useGame((s) => s.profile.guia),
    enDepto = useGame((s) => s.scene.kind === 'dept'),
    touch = useTouch(),
    pad = usePad();
  const p = PASOS[paso];
  if (!p) return null;
  const ir = p.ir?.(enDepto);
  const saltar = (
    <button
      type="button"
      data-testid="guia-saltar"
      aria-label="Saltar la guía"
      onClick={act(() => g().pasoGuia(GUIA_PASOS))}
      className="mc-chip flex-none !px-2.5 !text-[11.5px] opacity-85"
    >
      Saltar
    </button>
  );
  if (compacta)
    return (
      <section
        data-testid="guia"
        data-paso={paso}
        aria-label={`Primeros pasos, ${paso + 1} de ${GUIA_PASOS}`}
        className="mc-hud anim-drop pointer-events-auto flex w-max max-w-[calc(100vw-5rem)] items-center gap-1.5 py-0.5 pl-3 pr-0.5 sm:max-w-[min(30rem,calc(100vw-1.5rem))]"
      >
        <b className="min-w-0 truncate text-[12.5px]">{p.titulo}</b>
        {ir && (
          <button
            type="button"
            data-testid="guia-ir"
            aria-label={ir.label}
            onClick={act(ir.hacer)}
            className="mc-chip flex-none !border-transparent !bg-[var(--mc-gold)] !text-[#2a1d00]"
          >
            {ir.corto}
          </button>
        )}
        <button
          type="button"
          data-testid="guia-saltar"
          aria-label="Saltar la guía"
          onClick={act(() => g().pasoGuia(GUIA_PASOS))}
          className="mc-chip flex-none !px-2.5 opacity-85"
        >
          <Icon name="x" size={14} />
        </button>
      </section>
    );
  return (
    <section
      data-testid="guia"
      data-paso={paso}
      aria-label="Primeros pasos"
      className="mc-hud anim-drop pointer-events-auto flex w-[15.5rem] flex-col gap-1.5 p-2.5 max-sm:mt-28"
    >
      <header className="flex items-center justify-between gap-2">
        <span className="mc-label !text-[10.5px]">
          Primeros pasos · {paso + 1}/{GUIA_PASOS}
        </span>
        {saltar}
      </header>
      <b className="font-display text-[15px] font-semibold leading-tight">{p.titulo}</b>
      <span className="text-[12.5px] leading-snug opacity-90">{p.pista({ touch, pad, enDepto })}</span>
      <span className="flex gap-1" aria-hidden>
        {PASOS.map((_, i) => (
          <i
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{ background: i <= paso ? 'var(--mc-accent)' : 'var(--mc-line)' }}
          />
        ))}
      </span>
      {ir && (
        <Btn id="guia-ir" tone="gold" size="sm" icon={ir.icon} cls="mt-0.5 w-full" onClick={ir.hacer}>
          {ir.label}
        </Btn>
      )}
    </section>
  );
}
